import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(@Inject('STRIPE_API_KEY') private readonly apiKey: string) {
    this.stripe = new Stripe(this.apiKey);
  }

  /**
   * List all products
   */
  async getProducts(): Promise<Stripe.Product[]> {
    const products = await this.stripe.products.list();
    return products.data;
  }

  /**
   * List all customers
   */
  async getCustomers(): Promise<Stripe.Customer[]> {
    const customers = await this.stripe.customers.list();
    return customers.data;
  }

  /**
   * Create a new customer
   */
  async createCustomer(email: string, name?: string): Promise<Stripe.Customer> {
    return this.stripe.customers.create({
      email,
      name,
    });
  }

  /**
   * Retrieve a specific customer
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return this.stripe.customers.retrieve(
      customerId,
    ) as Promise<Stripe.Customer>;
  }

  /**
   * Create a payment intent
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId?: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
    });
  }

  /**
   * Create a Checkout Session
   */
  async createCheckoutSession(
    successUrl: string,
    cancelUrl: string,
    lineItems: Stripe.Checkout.SessionCreateParams.LineItem[],
    customerId?: string,
  ): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
    });
  }

  /**
   * Create a subscription
   */
  async createSubscription(
    customerId: string,
    priceId: string,
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
    });
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
  ): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Retrieve a subscription
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Add an invoice item
   */
  async addInvoiceItem(
    customerId: string,
    amount: number,
    currency: string,
    description: string,
  ): Promise<Stripe.InvoiceItem> {
    return this.stripe.invoiceItems.create({
      customer: customerId,
      amount,
      currency,
      description,
    });
  }

  /**
   * Create an invoice
   */
  async createInvoice(customerId: string): Promise<Stripe.Invoice> {
    return this.stripe.invoices.create({
      customer: customerId,
    });
  }

  /**
   * Retrieve a specific payment intent
   */
  async getPaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }

  /**
   * Refund a payment
   */
  async refundPayment(paymentIntentId: string): Promise<Stripe.Refund> {
    return this.stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
  }
}
