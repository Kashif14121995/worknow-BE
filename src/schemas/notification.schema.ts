import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  APPLICATION_RECEIVED = 'application_received',
  APPLICATION_SHORTLISTED = 'application_shortlisted',
  APPLICATION_REJECTED = 'application_rejected',
  APPLICATION_HIRED = 'application_hired',
  SHIFT_ASSIGNED = 'shift_assigned',
  SHIFT_CANCELLED = 'shift_cancelled',
  PAYMENT_RECEIVED = 'payment_received',
  PAYMENT_SENT = 'payment_sent',
  NEW_MESSAGE = 'new_message',
  JOB_POSTED = 'job_posted',
  INVOICE_RECEIVED = 'invoice_received',
  RATING_RECEIVED = 'rating_received',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  JOB_ALERT = 'job_alert',
  VERIFICATION_SUBMITTED = 'verification_submitted',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId; // User who receives the notification

  @Prop({ enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: Date, default: Date.now })
  readAt?: Date;

  // Optional references for linking to related entities
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: false })
  jobId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobApplying', required: false })
  applicationId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: false })
  shiftId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: false })
  transactionId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: false })
  messageId?: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: false })
  invoiceId?: mongoose.Types.ObjectId;

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>; // Additional data

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes for efficient queries
NotificationSchema.index({ userId: 1, read: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: -1 }); // For cleanup tasks

