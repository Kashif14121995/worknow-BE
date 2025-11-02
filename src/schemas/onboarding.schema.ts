import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type OnboardingDocument = HydratedDocument<Onboarding>;

export enum OnboardingStep {
  PERSONAL_INFO = 'personal_info',
  SKILLS = 'skills',
  EXPERIENCE = 'experience',
  EDUCATION = 'education',
  LOCATION = 'location',
  PREFERENCES = 'preferences',
  VERIFICATION = 'verification',
  COMPLETE = 'complete',
}

@Schema({ timestamps: true })
export class Onboarding {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ enum: OnboardingStep, default: OnboardingStep.PERSONAL_INFO })
  currentStep: OnboardingStep;

  @Prop({ type: [String], default: [] })
  completedSteps: string[]; // Array of completed step names

  @Prop({ default: 0 })
  progress: number; // 0-100 percentage

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop({ type: Date, required: false })
  completedAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const OnboardingSchema = SchemaFactory.createForClass(Onboarding);

// Indexes
OnboardingSchema.index({ userId: 1 }, { unique: true });
OnboardingSchema.index({ isCompleted: 1 });

