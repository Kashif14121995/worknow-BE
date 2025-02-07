import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { JobStatus, AvailableJobs, paymentType } from '../constants';

export type JobPostingDocument = HydratedDocument<JobPosting>;

@Schema({ timestamps: true })
export class JobPosting {
  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;

  @Prop({
    enum: [JobStatus.active, JobStatus.closed],
    default: JobStatus.active,
  })
  status: string;

  @Prop()
  address: string;

  @Prop()
  zipCode: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  postedBy: mongoose.Types.ObjectId;

  @Prop({ enum: [AvailableJobs.site_worker, AvailableJobs.software_engineer] })
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

  @Prop({ enum: [paymentType.contractual, paymentType.per_hour] })
  paymentType: string;

  @Prop()
  payment: number;
}

const JobPostingSchema = SchemaFactory.createForClass(JobPosting);

export { JobPostingSchema };
