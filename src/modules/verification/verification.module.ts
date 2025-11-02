import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserVerification, UserVerificationSchema, User, UserSchema } from 'src/schemas';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { AwsModule } from '../aws/aws.module';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from '../mail/mail.module';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserVerification.name, schema: UserVerificationSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AwsModule,
    NotificationModule,
    MailModule,
  ],
  controllers: [VerificationController],
  providers: [VerificationService, HttpStatusCodesService],
  exports: [VerificationService],
})
export class VerificationModule {}

