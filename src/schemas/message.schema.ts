import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  senderId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  receiverId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobPosting', required: false })
  jobId?: mongoose.Types.ObjectId; // Optional: link message to a specific job

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'JobApplying', required: false })
  applicationId?: mongoose.Types.ObjectId; // Optional: link message to a specific application

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  read: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ senderId: 1, receiverId: 1 });
MessageSchema.index({ jobId: 1 });
MessageSchema.index({ applicationId: 1 });

