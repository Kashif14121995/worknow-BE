import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import {
  JobStatus,
  PaymentType,
  JobApplicationAppliedStatus,
} from 'src/constants';

export type JobPostingDocument = HydratedDocument<JobPosting>;

@Schema({ timestamps: true })
export class JobPosting {
  @Prop()
  jobTitle: string;

  @Prop()
  jobType: string; // e.g., part-time, full-time

  @Prop()
  industry: string;

  @Prop()
  shiftDuration: string;

  @Prop({ type: Date })
  shiftStartsAt: Date;

  @Prop({ type: Date })
  shiftEndsAt: Date;

  @Prop()
  workLocation: string;

  @Prop()
  description: string;

  @Prop()
  amount: number;

  @Prop({ enum: PaymentType })
  paymentType: string;

  @Prop()
  preferredShift: string;

  @Prop()
  matchScore: number;

  @Prop({ default: false })
  enableSmartRecommendations: boolean;

  @Prop({ default: false })
  autoShortlistCandidates: boolean;

  @Prop()
  experienceLevel: string;

  @Prop()
  education: string;

  @Prop({ type: [String], default: [] })
  requiredSkills: string[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  postedBy: mongoose.Types.ObjectId;

  @Prop({ enum: JobStatus, default: JobStatus.active })
  status: string;
}

export const JobPostingSchema = SchemaFactory.createForClass(JobPosting);

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
