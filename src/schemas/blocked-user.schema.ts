import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type BlockedUserDocument = HydratedDocument<BlockedUser>;

export enum BlockReason {
  NO_SHOW = 'no_show',
  MISCONDUCT = 'misconduct',
  POOR_PERFORMANCE = 'poor_performance',
  POLICY_VIOLATION = 'policy_violation',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class BlockedUser {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  seekerId: mongoose.Types.ObjectId; // Worker who is blocked

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  listerId: mongoose.Types.ObjectId; // Provider who blocked the worker

  @Prop({ enum: BlockReason, required: true })
  reason: BlockReason;

  @Prop({ type: String, required: false })
  description?: string; // Additional details about why blocked

  @Prop({ type: String, required: false })
  adminNotes?: string; // Internal notes for admin review

  @Prop({ default: true })
  isActive: boolean; // Can be unblocked later

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  unblockedBy?: mongoose.Types.ObjectId; // Admin who unblocked

  @Prop({ type: Date, required: false })
  unblockedAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const BlockedUserSchema = SchemaFactory.createForClass(BlockedUser);

// Indexes - ensure one active block per seeker-lister pair
BlockedUserSchema.index({ seekerId: 1, listerId: 1, isActive: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
BlockedUserSchema.index({ seekerId: 1 });
BlockedUserSchema.index({ listerId: 1 });

