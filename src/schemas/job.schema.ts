import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import {
  JobStatus,
  PaymentType,
  JobApplicationAppliedStatus,
} from 'src/constants';
import { Counter, CounterDocument } from 'src/schemas';

export type JobPostingDocument = HydratedDocument<JobPosting>;
export type JobApplyingDocument = HydratedDocument<JobApplying>;

@Schema({ timestamps: true })
export class JobPosting {
  @Prop()
  jobId: string;

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

  @Prop()
  positions: number;

  @Prop({ type: [String], default: [] })
  requiredSkills: string[];

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  postedBy: mongoose.Types.ObjectId;

  @Prop({ enum: JobStatus, default: JobStatus.active })
  status: string;

  @Prop({ default: false })
  isFeatured: boolean; // Featured listing for higher visibility

  @Prop({ type: Date, required: false })
  featuredUntil?: Date; // Featured listing expiration date
}

export const JobPostingSchema = SchemaFactory.createForClass(JobPosting);

@Schema({ timestamps: true })
export class JobApplying {
  @Prop()
  appId: string;

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

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting' })
  appliedFor: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: false })
  shiftId?: mongoose.Types.ObjectId; // link to shift (if assigned)
}

const JobApplyingSchema = SchemaFactory.createForClass(JobApplying);

export { JobApplyingSchema };

// ✅ Add the pre-save hook here (before exporting schema)
JobPostingSchema.pre<JobPostingDocument>('save', async function (next) {
  if (!this.jobId) {
    // this.$model returns the model already registered with the connection
    const CounterModel = this.$model(
      'Counter',
    ) as mongoose.Model<CounterDocument>;

    const counter = await CounterModel.findOneAndUpdate(
      { id: 'jobId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    ).exec();

    this.jobId = `JOB_${String(counter.seq).padStart(4, '0')}`;
  }
  next();
});

// ✅ Add the pre-save hook here (before exporting schema)
JobApplyingSchema.pre<JobApplyingDocument>('save', async function (next) {
  if (!this.appId) {
    // this.$model returns the model already registered with the connection
    const CounterModel = this.$model(
      'Counter',
    ) as mongoose.Model<CounterDocument>;

    const counter = await CounterModel.findOneAndUpdate(
      { id: 'appId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    ).exec();

    this.appId = `APP_${String(counter.seq).padStart(4, '0')}`;
  }
  next();
});
