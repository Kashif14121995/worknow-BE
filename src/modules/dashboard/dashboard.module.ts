import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { JobApplying, JobApplyingSchema, JobPosting, JobPostingSchema, Shift, ShiftSchema } from 'src/schemas';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: JobApplying.name, schema: JobApplyingSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, HttpStatusCodesService],
})
export class DashboardModule { }
