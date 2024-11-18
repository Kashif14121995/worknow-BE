import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from 'src/auth/constants';
export type UserDocument = HydratedDocument<User>;

@Schema()
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

  @Prop({ enum: [UserRole.job_provider, UserRole.job_seeker] })
  role: string;
}

const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });

export { UserSchema };
