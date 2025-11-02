import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string; // The refresh token itself

  @Prop({ required: true })
  expiresAt: Date; // When the refresh token expires

  @Prop({ default: false })
  isRevoked: boolean; // If token has been revoked

  @Prop({ type: String, required: false })
  ipAddress?: string; // IP address where token was created

  @Prop({ type: String, required: false })
  userAgent?: string; // User agent where token was created

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

// Index for efficient lookups
RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });
RefreshTokenSchema.index({ token: 1 }, { unique: true });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

