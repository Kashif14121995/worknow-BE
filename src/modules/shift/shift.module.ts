import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { JwtService } from '@nestjs/jwt';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { Counter, CounterSchema, JobApplying, JobApplyingSchema, JobPosting, JobPostingSchema, Shift, ShiftSchema } from 'src/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shift.name, schema: ShiftSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: JobApplying.name, schema: JobApplyingSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  controllers: [ShiftController],
  providers: [ShiftService, JwtService, HttpStatusCodesService],
  exports: [ShiftService, MongooseModule],
})
export class ShiftModule { }
