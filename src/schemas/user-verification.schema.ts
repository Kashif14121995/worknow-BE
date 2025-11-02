import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type UserVerificationDocument = HydratedDocument<UserVerification>;

export enum VerificationDocumentType {
  GOVERNMENT_ID = 'government_id',
  BUSINESS_LICENSE = 'business_license',
  TAX_ID = 'tax_id',
  OTHER = 'other',
}

export enum VerificationStatus {
  PENDING = 'pending',           // Document uploaded, awaiting review
  APPROVED = 'approved',         // Verified by admin
  REJECTED = 'rejected',         // Rejected by admin
  UNDER_REVIEW = 'under_review', // Currently being reviewed
}

@Schema({ timestamps: true })
export class UserVerification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ enum: VerificationDocumentType, required: true })
  documentType: VerificationDocumentType;

  @Prop({ required: true })
  documentUrl: string; // URL to document stored in S3

  @Prop({ required: false })
  documentName?: string; // Original filename

  @Prop({ enum: VerificationStatus, default: VerificationStatus.PENDING })
  status: VerificationStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  reviewedBy?: mongoose.Types.ObjectId; // Admin who reviewed

  @Prop({ type: Date, required: false })
  reviewedAt?: Date;

  @Prop({ type: String, required: false })
  rejectionReason?: string; // Reason if rejected

  @Prop({ type: String, required: false })
  adminNotes?: string; // Internal notes for admin

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserVerificationSchema = SchemaFactory.createForClass(UserVerification);

// Indexes
UserVerificationSchema.index({ userId: 1, status: 1 });
UserVerificationSchema.index({ status: 1, createdAt: -1 });

