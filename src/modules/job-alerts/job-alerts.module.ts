import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  JobAlertPreference,
  JobAlertPreferenceSchema,
  User,
  UserSchema,
  JobPosting,
  JobPostingSchema,
} from 'src/schemas';
import { JobAlertsService } from './job-alerts.service';
import { JobAlertsController } from './job-alerts.controller';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from '../mail/mail.module';
import { MatchingModule } from '../matching/matching.module';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobAlertPreference.name, schema: JobAlertPreferenceSchema },
      { name: User.name, schema: UserSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
    ]),
    NotificationModule,
    MailModule,
    MatchingModule,
  ],
  controllers: [JobAlertsController],
  providers: [JobAlertsService, HttpStatusCodesService],
  exports: [JobAlertsService],
})
export class JobAlertsModule {}

