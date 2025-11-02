import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { ShiftAssignmentService } from './shift-assignment.service';
import { ShiftAssignmentController } from './shift-assignment.controller';
import { JwtService } from '@nestjs/jwt';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { MailModule } from '../mail/mail.module';
import { NotificationModule } from '../notification/notification.module';
import { Counter, CounterSchema, JobApplying, JobApplyingSchema, JobPosting, JobPostingSchema, Shift, ShiftSchema, ShiftAssignment, ShiftAssignmentSchema, User, UserSchema } from 'src/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shift.name, schema: ShiftSchema },
      { name: ShiftAssignment.name, schema: ShiftAssignmentSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: JobApplying.name, schema: JobApplyingSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MailModule,
    NotificationModule,
  ],
  controllers: [ShiftController, ShiftAssignmentController],
  providers: [ShiftService, ShiftAssignmentService, JwtService, HttpStatusCodesService],
  exports: [ShiftService, MongooseModule],
})
export class ShiftModule { }
