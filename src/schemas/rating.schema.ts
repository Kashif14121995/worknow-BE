import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type RatingDocument = HydratedDocument<Rating>;

// Rating types - who is rating whom
export enum RatingType {
  SEEKER_TO_PROVIDER = 'seeker_to_provider', // Seeker rates provider/job
  PROVIDER_TO_SEEKER = 'provider_to_seeker', // Provider rates seeker
  SEEKER_TO_JOB = 'seeker_to_job', // Seeker rates a specific job
  PROVIDER_TO_JOB = 'provider_to_job', // Provider rates their own job (optional)
}

// Rating scale (1-5 stars)
export enum RatingValue {
  ONE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
}

@Schema({ timestamps: true })
export class Rating {
  @Prop({ required: true })
  ratingId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  ratedBy: mongoose.Types.ObjectId; // User who is giving the rating

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  ratedUser?: mongoose.Types.ObjectId; // User being rated (if rating a person)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: false })
  jobId?: mongoose.Types.ObjectId; // Job being rated (if rating a job)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: false })
  shiftId?: mongoose.Types.ObjectId; // Related shift (if applicable)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobApplying', required: false })
  applicationId?: mongoose.Types.ObjectId; // Related application (if applicable)

  @Prop({ enum: RatingType, required: true })
  ratingType: RatingType;

  @Prop({ type: Number, min: 1, max: 5, required: true })
  rating: number; // 1-5 stars

  @Prop({ required: false })
  review?: string; // Optional text review

  @Prop({ type: [String], default: [] })
  tags?: string[]; // e.g., ['punctual', 'professional', 'good_communication']

  @Prop({ default: false })
  isPublic: boolean; // Whether review is visible publicly

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

// Indexes for efficient queries
RatingSchema.index({ ratedBy: 1, ratingType: 1 });
RatingSchema.index({ ratedUser: 1 });
RatingSchema.index({ jobId: 1 });
RatingSchema.index({ shiftId: 1 });
RatingSchema.index({ ratingId: 1 }, { unique: true });
RatingSchema.index({ createdAt: -1 });

