import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, HydratedDocument, Types } from 'mongoose';
import { CounterDocument } from 'src/schemas';

export type ShiftDocument = HydratedDocument<Shift>;

@Schema({ timestamps: true })
export class Shift {
  @Prop()
  shiftId: string;

  @Prop({ type: Types.ObjectId, ref: 'JobPosting', required: true })
  jobId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "JobApplying", required: false })
  appId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  startTime: string; // HH:mm

  @Prop({ required: true })
  endTime: string; // HH:mm

  @Prop({ default: 'scheduled', enum: ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'] })
  status: string;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  assignees: Types.ObjectId[]; // Workers assigned to the shift

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  // Additional fields from FRS
  @Prop({ type: String, required: false })
  location?: string; // Location details/notes

  @Prop({ type: String, required: false })
  notes?: string; // Additional notes about the shift

  @Prop({ type: Number, required: false, default: 0 })
  breakMinutes?: number; // Break time in minutes
}

export const ShiftSchema = SchemaFactory.createForClass(Shift);

// ✅ Add the pre-save hook here (before exporting schema)
ShiftSchema.pre<ShiftDocument>('save', async function (next) {
  if (!this.shiftId) {
    // this.$model returns the model already registered with the connection
    const CounterModel = this.$model(
      'Counter',
    ) as mongoose.Model<CounterDocument>;

    const counter = await CounterModel.findOneAndUpdate(
      { id: 'shiftId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    ).exec();

    this.shiftId = `SHIFT_${String(counter.seq).padStart(4, '0')}`;
  }
  next();
});
