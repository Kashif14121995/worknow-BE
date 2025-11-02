import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type SavedSearchDocument = HydratedDocument<SavedSearch>;

@Schema({ timestamps: true })
export class SavedSearch {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ type: String, required: false })
  name?: string; // Custom name for saved search (e.g., "Part-time jobs in Chicago")

  // Search criteria
  @Prop({ type: String, required: false })
  keyword?: string;

  @Prop({ type: [String], default: [] })
  jobTypes?: string[]; // full_time, part_time, hourly, etc.

  @Prop({ type: [String], default: [] })
  industries?: string[];

  @Prop({ type: String, required: false })
  location?: string;

  @Prop({ type: Number, required: false })
  minPayRate?: number;

  @Prop({ type: Number, required: false })
  maxPayRate?: number;

  @Prop({ type: [String], default: [] })
  requiredSkills?: string[];

  @Prop({ type: Number, required: false })
  minExperience?: number;

  @Prop({ default: true })
  isActive: boolean; // Enable/disable alerts

  @Prop({ type: Date, required: false })
  lastCheckedAt?: Date; // When we last checked for new matches

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const SavedSearchSchema = SchemaFactory.createForClass(SavedSearch);

// Indexes
SavedSearchSchema.index({ userId: 1, isActive: 1 });
SavedSearchSchema.index({ userId: 1, createdAt: -1 });

