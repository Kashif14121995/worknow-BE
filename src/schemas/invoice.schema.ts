import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

// Invoice types
export enum InvoiceType {
  SHIFT_PAYMENT = 'shift_payment', // Invoice for shift work payment
  JOB_POSTING_FEE = 'job_posting_fee', // Invoice for job posting fee
  WITHDRAWAL = 'withdrawal', // Invoice for withdrawal transaction
  REFUND = 'refund', // Invoice for refund
}

// Invoice status
export enum InvoiceStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true })
  invoiceId: string;

  @Prop({ required: true })
  invoiceNumber: string; // Human-readable invoice number (e.g., INV-2024-001)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  issuedTo: mongoose.Types.ObjectId; // User receiving the invoice (customer)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  issuedBy: mongoose.Types.ObjectId; // User issuing the invoice (provider/platform)

  @Prop({ enum: InvoiceType, required: true })
  invoiceType: InvoiceType;

  @Prop({ required: true })
  subtotal: number; // Amount before tax

  @Prop({ default: 0 })
  tax: number; // Tax amount

  @Prop({ default: 0 })
  discount: number; // Discount amount

  @Prop({ required: true })
  total: number; // Total amount (subtotal + tax - discount)

  @Prop({ default: 'USD' })
  currency: string;

  @Prop({ enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Prop({ type: Date, required: true })
  issueDate: Date; // Date invoice was issued

  @Prop({ type: Date, required: true })
  dueDate: Date; // Date payment is due

  @Prop({ type: Date, required: false })
  paidDate?: Date; // Date invoice was paid

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: false })
  transactionId?: mongoose.Types.ObjectId; // Related transaction

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: false })
  shiftId?: mongoose.Types.ObjectId; // Related shift (if applicable)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: false })
  jobId?: mongoose.Types.ObjectId; // Related job (if applicable)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: false })
  paymentId?: mongoose.Types.ObjectId; // Related payment (if applicable)

  // Invoice line items
  @Prop({
    type: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number,
      },
    ],
    default: [],
  })
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;

  // Billing information
  @Prop({ required: false })
  billingAddress?: string;

  @Prop({ required: false })
  billingEmail?: string;

  @Prop({ required: false })
  billingPhone?: string;

  // Additional notes
  @Prop({ required: false })
  notes?: string;

  @Prop({ required: false })
  terms?: string; // Payment terms

  // PDF/document storage
  @Prop({ required: false })
  pdfUrl?: string; // URL to generated PDF (if stored in S3/cloud)

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Indexes
InvoiceSchema.index({ invoiceId: 1 }, { unique: true });
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ issuedTo: 1, status: 1 });
InvoiceSchema.index({ issuedBy: 1, status: 1 });
InvoiceSchema.index({ issueDate: -1 });
InvoiceSchema.index({ transactionId: 1 });
InvoiceSchema.index({ shiftId: 1 });
InvoiceSchema.index({ jobId: 1 });

