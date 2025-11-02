import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Shift,
  ShiftSchema,
  ShiftAssignment,
  ShiftAssignmentSchema,
  User,
  UserSchema,
  JobPosting,
  JobPostingSchema,
} from 'src/schemas';
import { ShiftAnalyticsService } from './shift-analytics.service';
import { ShiftAnalyticsController } from './shift-analytics.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shift.name, schema: ShiftSchema },
      { name: ShiftAssignment.name, schema: ShiftAssignmentSchema },
      { name: User.name, schema: UserSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
    ]),
  ],
  controllers: [ShiftAnalyticsController],
  providers: [ShiftAnalyticsService, HttpStatusCodesService],
  exports: [ShiftAnalyticsService],
})
export class ShiftAnalyticsModule {}

