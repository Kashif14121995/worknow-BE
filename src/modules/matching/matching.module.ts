import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema, Resume, ResumeSchema, JobPosting, JobPostingSchema } from 'src/schemas';
import { MatchingService } from './matching.service';
import { MatchingController } from './matching.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
    ]),
  ],
  controllers: [MatchingController],
  providers: [MatchingService, HttpStatusCodesService],
  exports: [MatchingService],
})
export class MatchingModule {}

