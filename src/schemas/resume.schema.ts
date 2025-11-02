import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from './user.schema';

export type ResumeDocument = HydratedDocument<Resume>;

@Schema({ timestamps: true })
export class Resume {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  fileUrl: string; // URL to resume file stored in S3

  @Prop({ required: false })
  fileName?: string; // Original filename

  @Prop({ type: String, required: false })
  fileType?: string; // PDF, DOC, DOCX, etc.

  // Parsed data from resume
  @Prop({ type: String, required: false })
  parsedName?: string;

  @Prop({ type: String, required: false })
  parsedEmail?: string;

  @Prop({ type: String, required: false })
  parsedPhone?: string;

  @Prop({ type: [String], default: [] })
  parsedSkills?: string[];

  @Prop({ type: String, required: false })
  parsedEducation?: string;

  @Prop({ type: Number, required: false })
  parsedExperience?: number; // Years of experience

  @Prop({ type: [String], default: [] })
  parsedJobHistory?: string[]; // Previous job roles/titles

  @Prop({ type: Object, required: false })
  parsedData?: Record<string, any>; // Additional parsed information

  @Prop({ default: false })
  isProcessed?: boolean; // Whether parsing has been completed

  @Prop({ type: String, required: false })
  parsingError?: string; // Error message if parsing failed

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);

// Indexes
ResumeSchema.index({ userId: 1 });
ResumeSchema.index({ userId: 1, createdAt: -1 });

