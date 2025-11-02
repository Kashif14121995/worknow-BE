import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type JobAlertPreferenceDocument = HydratedDocument<JobAlertPreference>;

@Schema({ timestamps: true })
export class JobAlertPreference {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ default: true })
  emailAlerts: boolean; // Receive alerts via email

  @Prop({ default: true })
  inAppAlerts: boolean; // Receive in-app notifications

  @Prop({ default: false })
  pushNotifications: boolean; // Receive push notifications

  // Alert frequency
  @Prop({ enum: ['realtime', 'daily', 'weekly'], default: 'daily' })
  frequency: string;

  // Job preferences for alerts
  @Prop({ type: [String], default: [] })
  preferredJobTypes?: string[];

  @Prop({ type: [String], default: [] })
  preferredIndustries?: string[];

  @Prop({ type: String, required: false })
  preferredLocation?: string;

  @Prop({ type: Number, required: false })
  minPayRate?: number;

  @Prop({ type: Number, required: false })
  maxPayRate?: number;

  @Prop({ default: true })
  trendingJobs: boolean; // Get alerts for trending jobs

  @Prop({ type: String, required: false })
  timezone?: string; // User's timezone for scheduled alerts

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const JobAlertPreferenceSchema = SchemaFactory.createForClass(JobAlertPreference);

// Indexes
JobAlertPreferenceSchema.index({ userId: 1 }, { unique: true });

