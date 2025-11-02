import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument, Payment, PaymentDocument } from 'src/schemas';
import { TransactionStatus } from 'src/schemas/payment.schema';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_API_KEY');
    if (!stripeKey) {
      this.logger.warn('STRIPE_API_KEY not configured');
    } else {
      this.stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    }
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Processing webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;
      case 'transfer.created':
        await this.handleTransferCreated(event.data.object as any);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment intent succeeded: ${paymentIntent.id}`);

    // Find transaction by Stripe transaction ID
    const transaction = await this.transactionModel.findOne({
      stripeTransactionId: paymentIntent.id,
    });

    if (transaction) {
      transaction.status = TransactionStatus.COMPLETED;
      await transaction.save();

      // Update related payment if exists
      if (transaction.paymentId) {
        const payment = await this.paymentModel.findById(transaction.paymentId);
        if (payment) {
          (payment as any).status = TransactionStatus.COMPLETED;
          await payment.save();
        }
      }

      this.logger.log(`Transaction ${transaction.transactionId} marked as completed`);
    } else {
      this.logger.warn(`Transaction not found for payment intent: ${paymentIntent.id}`);
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    this.logger.log(`Payment intent failed: ${paymentIntent.id}`);

    const transaction = await this.transactionModel.findOne({
      stripeTransactionId: paymentIntent.id,
    });

    if (transaction) {
      transaction.status = TransactionStatus.FAILED;
      await transaction.save();
      this.logger.log(`Transaction ${transaction.transactionId} marked as failed`);
    }
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Charge refunded: ${charge.id}`);

    const transaction = await this.transactionModel.findOne({
      stripeTransactionId: charge.payment_intent as string,
    });

    if (transaction) {
      transaction.status = TransactionStatus.REFUNDED;
      await transaction.save();
      this.logger.log(`Transaction ${transaction.transactionId} marked as refunded`);
    }
  }

  private async handleTransferCreated(transfer: any): Promise<void> {
    this.logger.log(`Transfer created: ${transfer.id}`);
    // Handle transfer creation if needed
  }
}
