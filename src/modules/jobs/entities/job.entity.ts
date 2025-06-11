import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import {
  JobStatus,
  AvailableJobs,
  PaymentType,
  JobApplicationAppliedStatus,
} from '../constants';

export type JobPostingDocument = HydratedDocument<JobPosting>;

@Schema({ timestamps: true })
export class JobPosting {
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({
    enum: JobStatus,
    default: JobStatus.active,
  })
  status: string;

  @Prop()
  address: string;

  @Prop()
  zipCode: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  postedBy: mongoose.Types.ObjectId;

  @Prop({ enum: AvailableJobs })
  type: string;

  @Prop({ default: [] })
  tags: string[];

  @Prop()
  country: string;

  @Prop()
  state: string;

  @Prop()
  city: string;

  @Prop()
  description: string;

  @Prop()
  companyName: string;

  @Prop()
  minimumRequirements: number;

  @Prop()
  maximumRequirements: number;

  @Prop({ enum: [PaymentType.contractual, PaymentType.per_hour] })
  paymentType: string;

  @Prop()
  payment: number;

  @Prop()
  shiftStartsAt: number;

  @Prop()
  shiftEndsAt: number;
}

const JobPostingSchema = SchemaFactory.createForClass(JobPosting);

export { JobPostingSchema };

@Schema({ timestamps: true })
export class JobApplying {
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({
    enum: JobApplicationAppliedStatus,
    default: JobApplicationAppliedStatus.applied,
  })
  status: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  appliedBy: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'jobpostings' })
  appliedFor: mongoose.Types.ObjectId;
}

const JobApplyingSchema = SchemaFactory.createForClass(JobApplying);

export { JobApplyingSchema };
