import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type SubscriptionDocument = HydratedDocument<Subscription>;

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  TRIAL = 'trial',
}

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ enum: SubscriptionPlan, required: true })
  plan: SubscriptionPlan;

  @Prop({ enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop({ type: Date, required: false })
  startDate?: Date;

  @Prop({ type: Date, required: false })
  endDate?: Date;

  @Prop({ type: Date, required: false })
  cancelledAt?: Date;

  @Prop({ type: String, required: false })
  stripeSubscriptionId?: string; // Stripe subscription ID

  @Prop({ type: String, required: false })
  stripeCustomerId?: string; // Stripe customer ID

  @Prop({ type: Number, required: false })
  amount?: number; // Monthly subscription amount

  @Prop({ type: String, required: false })
  currency?: string; // USD, etc.

  @Prop({ type: Boolean, default: false })
  autoRenew: boolean; // Auto-renew subscription

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Indexes
SubscriptionSchema.index({ userId: 1 });
SubscriptionSchema.index({ stripeSubscriptionId: 1 });
SubscriptionSchema.index({ status: 1, endDate: 1 });

