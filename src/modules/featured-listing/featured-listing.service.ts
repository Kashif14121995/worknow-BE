import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  JobPosting,
  User,
  UserDocument,
  Subscription,
  SubscriptionDocument,
  SubscriptionPlan,
} from 'src/schemas';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class FeaturedListingService {
  constructor(
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private paymentService: PaymentService,
  ) {}

  /**
   * Get featured listing price
   */
  getFeaturedListingPrice(): number {
    return 19.99; // $19.99 per featured listing (7 days)
  }

  /**
   * Make a job listing featured
   */
  async makeJobFeatured(
    userId: string,
    jobId: string,
    durationDays: number = 7,
    paymentMethodId?: string,
  ): Promise<JobPosting> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const job = await this.jobPostingModel.findOne({
      _id: new Types.ObjectId(jobId),
      postedBy: new Types.ObjectId(userId),
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check if user has premium subscription (includes featured listings)
    const subscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      status: 'active',
      plan: { $in: [SubscriptionPlan.PREMIUM, SubscriptionPlan.ENTERPRISE] },
    });

    let featuredUntil: Date;
    if (subscription && subscription.plan === SubscriptionPlan.PREMIUM) {
      // Premium plan includes 5 featured listings per month - check usage
      const featuredCount = await this.jobPostingModel.countDocuments({
        postedBy: new Types.ObjectId(userId),
        isFeatured: true,
        featuredUntil: { $gte: new Date() },
      });

      if (featuredCount >= 5) {
        throw new BadRequestException('You have reached your monthly limit of 5 featured listings');
      }
      // Premium users get featured listings for free (within limit)
    } else {
      // Charge for featured listing
      const price = this.getFeaturedListingPrice() * durationDays;
      
      if (!paymentMethodId) {
        throw new BadRequestException('Payment method required for featured listing');
      }

      // Process payment
      await this.paymentService.processPayment({
        userId,
        amount: price,
        description: `Featured listing for job: ${job.jobTitle}`,
        paymentMethodId,
        metadata: {
          jobId: jobId,
          type: 'featured_listing',
        },
      });
    }

    featuredUntil = new Date();
    featuredUntil.setDate(featuredUntil.getDate() + durationDays);

    job.isFeatured = true;
    job.featuredUntil = featuredUntil;
    await job.save();

    return job;
  }

  /**
   * Get featured jobs (for search/discovery)
   */
  async getFeaturedJobs(limit: number = 10): Promise<JobPosting[]> {
    return this.jobPostingModel
      .find({
        isFeatured: true,
        status: 'active',
        $or: [
          { featuredUntil: { $gte: new Date() } },
          { featuredUntil: { $exists: false } },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Check and expire featured listings (cron job)
   */
  async expireFeaturedListings(): Promise<void> {
    await this.jobPostingModel.updateMany(
      {
        isFeatured: true,
        featuredUntil: { $lt: new Date() },
      },
      {
        isFeatured: false,
        $unset: { featuredUntil: '' },
      },
    );
  }
}

