import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ShiftDocument = Shift & Document;

@Schema({ timestamps: true })
export class Shift {
  @Prop({ type: Types.ObjectId, ref: 'JobPosting', required: true })
  jobId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  startTime: string; // HH:mm

  @Prop({ required: true })
  endTime: string; // HH:mm

  @Prop({ default: 'open', enum: ['open', 'filled', 'cancelled'] })
  status: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  assignees: Types.ObjectId[]; // Workers assigned to the shift

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);
