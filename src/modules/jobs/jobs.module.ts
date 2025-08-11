import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { HttpStatusCodesService } from 'src/modules/http_status_codes/http_status_codes.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  JobApplying,
  JobApplyingSchema,
  JobPosting,
  JobPostingSchema,
} from '../../schemas/job.schema';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: JobApplying.name, schema: JobApplyingSchema },
    ]),
  ],
  controllers: [JobsController],
  providers: [JobsService, JwtService, HttpStatusCodesService],
})
export class JobsModule {}
