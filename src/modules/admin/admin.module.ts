import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema, JobPosting, JobPostingSchema, JobApplying, JobApplyingSchema } from 'src/schemas';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: JobApplying.name, schema: JobApplyingSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, HttpStatusCodesService],
})
export class AdminModule {}

