import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionPlan,
  SubscriptionStatus,
  User,
  UserDocument,
} from 'src/schemas';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private stripe: Stripe;

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-12-18.acacia',
    });
  }

  /**
   * Get subscription plans
   */
  getPlans(): Array<{
    plan: SubscriptionPlan;
    name: string;
    price: number;
    features: string[];
  }> {
    return [
      {
        plan: SubscriptionPlan.FREE,
        name: 'Free',
        price: 0,
        features: [
          '5 job postings per month',
          'Basic matching',
          'Standard support',
        ],
      },
      {
        plan: SubscriptionPlan.BASIC,
        name: 'Basic',
        price: 29.99,
        features: [
          '20 job postings per month',
          'Enhanced matching',
          'Priority support',
          'Resume boosting',
        ],
      },
      {
        plan: SubscriptionPlan.PREMIUM,
        name: 'Premium',
        price: 79.99,
        features: [
          'Unlimited job postings',
          'Advanced matching algorithm',
          '24/7 priority support',
          'Resume boosting',
          'Featured listings (5/month)',
          'Analytics dashboard',
        ],
      },
      {
        plan: SubscriptionPlan.ENTERPRISE,
        name: 'Enterprise',
        price: 199.99,
        features: [
          'Unlimited everything',
          'Dedicated account manager',
          'Custom integrations',
          'White-label options',
          'All premium features',
        ],
      },
    ];
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string): Promise<Subscription | null> {
    return this.subscriptionModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Subscribe to a plan
   */
  async subscribe(
    userId: string,
    plan: SubscriptionPlan,
    paymentMethodId?: string,
  ): Promise<Subscription> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plans = this.getPlans();
    const selectedPlan = plans.find((p) => p.plan === plan);
    if (!selectedPlan) {
      throw new BadRequestException('Invalid subscription plan');
    }

    // Check for existing active subscription
    const existing = await this.getUserSubscription(userId);
    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('User already has an active subscription');
    }

    let stripeSubscriptionId: string | undefined;
    let stripeCustomerId: string | undefined;

    if (plan !== SubscriptionPlan.FREE && paymentMethodId) {
      // Create or retrieve Stripe customer
      let customer: Stripe.Customer;
      if (user.stripeCustomerId) {
        customer = await this.stripe.customers.retrieve(user.stripeCustomerId) as Stripe.Customer;
      } else {
        customer = await this.stripe.customers.create({
          email: user.email,
          name: `${user.first_name} ${user.last_name}`,
          metadata: {
            userId: userId,
          },
        });
        await this.userModel.findByIdAndUpdate(userId, {
          stripeCustomerId: customer.id,
        });
      }
      stripeCustomerId = customer.id;

      // Create Stripe subscription
      const stripeSubscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: this.getStripePriceId(plan) }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      stripeSubscriptionId = stripeSubscription.id;
    }

    // Create subscription record
    const subscription = await this.subscriptionModel.create({
      userId: new Types.ObjectId(userId),
      plan,
      status: plan === SubscriptionPlan.FREE ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIAL,
      startDate: new Date(),
      endDate: this.calculateEndDate(plan),
      stripeSubscriptionId,
      stripeCustomerId,
      amount: selectedPlan.price,
      currency: 'USD',
      autoRenew: true,
    });

    return subscription;
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string): Promise<Subscription> {
    const subscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      status: SubscriptionStatus.ACTIVE,
    });

    if (!subscription) {
      throw new NotFoundException('Active subscription not found');
    }

    // Cancel in Stripe if exists
    if (subscription.stripeSubscriptionId) {
      await this.stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    subscription.cancelledAt = new Date();
    subscription.autoRenew = false;
    await subscription.save();

    return subscription;
  }

  /**
   * Get Stripe price ID for plan (mock - should be configured in Stripe)
   */
  private getStripePriceId(plan: SubscriptionPlan): string {
    // These should be actual Stripe Price IDs
    const priceMap: Record<SubscriptionPlan, string> = {
      [SubscriptionPlan.FREE]: '',
      [SubscriptionPlan.BASIC]: process.env.STRIPE_PRICE_BASIC || '',
      [SubscriptionPlan.PREMIUM]: process.env.STRIPE_PRICE_PREMIUM || '',
      [SubscriptionPlan.ENTERPRISE]: process.env.STRIPE_PRICE_ENTERPRISE || '',
    };
    return priceMap[plan];
  }

  /**
   * Calculate subscription end date
   */
  private calculateEndDate(plan: SubscriptionPlan): Date {
    const endDate = new Date();
    if (plan === SubscriptionPlan.FREE) {
      endDate.setFullYear(endDate.getFullYear() + 100); // Never expires
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // Monthly subscription
    }
    return endDate;
  }

  /**
   * Handle Stripe webhook for subscription updates
   */
  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      await this.subscriptionModel.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        {
          status: subscription.status === 'active' ? SubscriptionStatus.ACTIVE : SubscriptionStatus.CANCELLED,
          endDate: new Date(subscription.current_period_end * 1000),
        },
      );
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await this.subscriptionModel.findOneAndUpdate(
        { stripeSubscriptionId: subscription.id },
        {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      );
    }
  }
}

