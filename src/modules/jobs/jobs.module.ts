// jobs.module.ts
import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { HttpStatusCodesService } from 'src/modules/http_status_codes/http_status_codes.service';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module';
import {
  User, UserSchema,
  Shift, ShiftSchema,
  Counter, CounterSchema,
  JobApplying, JobApplyingSchema,
  JobPosting, JobPostingSchema,
} from 'src/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: JobApplying.name, schema: JobApplyingSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MailModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, JwtService, HttpStatusCodesService],
  exports: [JobsService, MongooseModule],
})
export class JobsModule { }
