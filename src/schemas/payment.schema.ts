import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { UserRole } from 'src/constants';

export type PaymentDocument = HydratedDocument<Payment>;
export type TransactionDocument = HydratedDocument<Transaction>;

// Payment types
export enum PaymentTypeEnum {
  JOB_POSTING_FEE = 'job_posting_fee', // Provider pays to post a job
  SHIFT_PAYMENT = 'shift_payment', // Provider pays seeker for completed shift
  EARNINGS_WITHDRAWAL = 'earnings_withdrawal', // Seeker withdraws earnings
  REFUND = 'refund',
  PLATFORM_FEE = 'platform_fee',
}

// Transaction status
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true })
  paymentId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId; // The user making/receiving the payment

  @Prop({ enum: UserRole, required: true })
  userRole: string; // job_seeker or job_provider

  @Prop({ enum: PaymentTypeEnum, required: true })
  paymentType: PaymentTypeEnum;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: false })
  jobId?: mongoose.Types.ObjectId; // Related job (if applicable)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: false })
  shiftId?: mongoose.Types.ObjectId; // Related shift (if applicable)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: false })
  transactionId?: mongoose.Types.ObjectId; // Link to transaction record

  @Prop({ required: false })
  stripePaymentIntentId?: string; // Stripe payment intent ID

  @Prop({ required: false })
  stripeCustomerId?: string; // Stripe customer ID

  @Prop({ required: false })
  description?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ required: true })
  transactionId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  fromUserId: mongoose.Types.ObjectId; // User sending payment

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  toUserId?: mongoose.Types.ObjectId; // User receiving payment

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Prop({ enum: PaymentTypeEnum, required: true })
  type: PaymentTypeEnum;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: false })
  paymentId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: false })
  jobId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: false })
  shiftId?: mongoose.Types.ObjectId;

  @Prop({ required: false })
  stripeTransactionId?: string;

  @Prop({ required: false })
  description?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ default: 0 })
  balance: number; // Available balance

  @Prop({ default: 0 })
  pendingBalance: number; // Pending earnings not yet available

  @Prop({ default: 0 })
  totalEarnings: number; // Total earnings ever received

  @Prop({ default: 0 })
  totalSpent: number; // Total amount spent

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ required: false })
  stripeCustomerId?: string; // Stripe customer ID for payments

  @Prop({ required: false })
  stripeAccountId?: string; // Stripe Connect account ID for payouts

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
export const WalletSchema = SchemaFactory.createForClass(Wallet);

export type WalletDocument = HydratedDocument<Wallet>;

// Indexes
PaymentSchema.index({ userId: 1, status: 1 });
PaymentSchema.index({ paymentId: 1 }, { unique: true });
TransactionSchema.index({ fromUserId: 1, status: 1 });
TransactionSchema.index({ toUserId: 1, status: 1 });
TransactionSchema.index({ transactionId: 1 }, { unique: true });
WalletSchema.index({ userId: 1 }, { unique: true });

