import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole } from 'src/auth/constants';

export type ContactUsDocument = ContactUs & Document;

@Schema({ timestamps: true })
export class ContactUs {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ enum: [UserRole.job_provider, UserRole.job_seeker] })
  role: string;
}

export const ContactUsSchema = SchemaFactory.createForClass(ContactUs);
