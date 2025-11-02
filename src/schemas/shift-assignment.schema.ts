import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Shift, User } from './index';

export type ShiftAssignmentDocument = HydratedDocument<ShiftAssignment>;

@Schema({ timestamps: true })
export class ShiftAssignment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true })
  shiftId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  workerId: mongoose.Types.ObjectId; // The worker assigned to the shift

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  assignedBy: mongoose.Types.ObjectId; // Who assigned this shift (usually provider)

  @Prop({ type: Date, required: false })
  checkInTime?: Date;

  @Prop({ type: Date, required: false })
  checkOutTime?: Date;

  @Prop({ type: Number, required: false, min: 1, max: 5 })
  rating?: number; // Rating given by provider to worker (1-5 stars)

  @Prop({ type: String, required: false })
  feedback?: string; // Feedback/notes about worker performance

  // GPS Location for check-in (optional)
  @Prop({ type: Number, required: false })
  checkInLatitude?: number;

  @Prop({ type: Number, required: false })
  checkInLongitude?: number;

  @Prop({ type: Number, required: false })
  checkOutLatitude?: number;

  @Prop({ type: Number, required: false })
  checkOutLongitude?: number;

  // Late arrival flag
  @Prop({ default: false })
  isLateCheckIn?: boolean;

  // Hours worked (calculated from check-in/out times)
  @Prop({ type: Number, required: false })
  hoursWorked?: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ShiftAssignmentSchema = SchemaFactory.createForClass(ShiftAssignment);

// Indexes for efficient queries
ShiftAssignmentSchema.index({ shiftId: 1, workerId: 1 });
ShiftAssignmentSchema.index({ workerId: 1, checkInTime: -1 });
ShiftAssignmentSchema.index({ shiftId: 1 });

