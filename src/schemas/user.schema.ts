import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { UserRole } from 'src/constants';
export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop()
  first_name: string;

  @Prop()
  last_name: string;

  @Prop({ unique: true })
  email!: string;

  @Prop()
  phone_number: number;

  @Prop()
  password: string;

  @Prop()
  otp: number;

  @Prop()
  otp_expires_after: number;

  @Prop({ enum: [UserRole.job_provider, UserRole.job_seeker, UserRole.admin] })
  role: string;

  // Optional array of skills
  @Prop({ type: [String], required: false })
  skills?: string[];

  // Optional education
  @Prop({ type: String, required: false })
  education?: string;

  // Optional experience in years
  @Prop({ type: Number, required: false })
  experience?: number;

  @Prop({ type: String, required: false })
  location?: string

  @Prop({ default: false })
  emailVerified?: boolean;

  @Prop({ default: false })
  identityVerified?: boolean; // Identity verification status

  @Prop({ type: String, required: false })
  emailVerificationToken?: string;

  @Prop({ type: Date, required: false })
  emailVerificationTokenExpires?: Date;

  @Prop({ type: String, required: false })
  passwordResetToken?: string;

  @Prop({ type: Date, required: false })
  passwordResetTokenExpires?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;



  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting' }] })
  jobPostings: mongoose.Types.ObjectId[];

  @Prop({ type: String, required: false })
  stripeCustomerId?: string; // Stripe customer ID for subscriptions

  @Prop({ default: false })
  isBlocked?: boolean; // Admin can block users

  @Prop({ type: String, required: false })
  blockReason?: string; // Reason for blocking

  @Prop({ default: false })
  isDeleted?: boolean; // Soft delete flag

  @Prop({ type: Date, required: false })
  deletedAt?: Date; // When user was soft deleted
}

const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });

export { UserSchema };
