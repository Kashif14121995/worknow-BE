import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SavedSearch, SavedSearchSchema, User, UserSchema, JobPosting, JobPostingSchema } from 'src/schemas';
import { SavedSearchService } from './saved-search.service';
import { SavedSearchController } from './saved-search.controller';
import { NotificationModule } from '../notification/notification.module';
import { MailModule } from '../mail/mail.module';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SavedSearch.name, schema: SavedSearchSchema },
      { name: User.name, schema: UserSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
    ]),
    NotificationModule,
    MailModule,
  ],
  controllers: [SavedSearchController],
  providers: [SavedSearchService, HttpStatusCodesService],
  exports: [SavedSearchService],
})
export class SavedSearchModule {}

