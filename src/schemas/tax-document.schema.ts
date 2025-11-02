import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type TaxDocumentDocument = HydratedDocument<TaxDocument>;

export enum TaxDocumentType {
  FORM_1099_NEC = 'form_1099_nec', // 1099-NEC for independent contractors
  FORM_1099_MISC = 'form_1099_misc', // 1099-MISC for miscellaneous income
  FORM_W2 = 'form_w2', // W2 for employees
  YEAR_END_SUMMARY = 'year_end_summary', // General year-end summary
}

export enum TaxDocumentStatus {
  PENDING = 'pending',
  GENERATED = 'generated',
  SENT = 'sent',
  DELIVERED = 'delivered',
}

@Schema({ timestamps: true })
export class TaxDocument {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ enum: TaxDocumentType, required: true })
  documentType: TaxDocumentType;

  @Prop({ type: Number, required: true })
  taxYear: number; // e.g., 2024

  @Prop({ type: Number, required: false })
  totalEarnings?: number; // Total earnings for the year

  @Prop({ type: Number, required: false })
  totalFees?: number; // Total fees paid to platform

  @Prop({ type: Number, required: false })
  totalTaxesWithheld?: number; // For W2 employees

  @Prop({ type: Number, required: false })
  grossEarnings?: number; // Gross earnings before fees

  @Prop({ type: Number, required: false })
  netEarnings?: number; // Net earnings after fees

  @Prop({ type: Number, required: false })
  transactionCount?: number; // Number of transactions

  @Prop({ type: String, required: false })
  pdfUrl?: string; // URL to generated PDF document

  @Prop({ enum: TaxDocumentStatus, default: TaxDocumentStatus.PENDING })
  status: TaxDocumentStatus;

  @Prop({ type: Date, required: false })
  generatedAt?: Date;

  @Prop({ type: Date, required: false })
  sentAt?: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  generatedBy?: mongoose.Types.ObjectId; // Admin who generated

  @Prop({ type: Object, required: false })
  metadata?: Record<string, any>; // Additional tax information

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TaxDocumentSchema = SchemaFactory.createForClass(TaxDocument);

// Indexes
TaxDocumentSchema.index({ userId: 1, taxYear: 1 });
TaxDocumentSchema.index({ taxYear: 1, status: 1 });
TaxDocumentSchema.index({ documentType: 1 });

