import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { Shift, ShiftSchema } from './schemas/shift.schema/shift.schema';
import { JwtService } from '@nestjs/jwt';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { JobPosting, JobPostingSchema } from 'src/schemas/job.schema';
import { Counter, CounterSchema } from 'src/schemas/counter.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Shift.name, schema: ShiftSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  controllers: [ShiftController],
  providers: [ShiftService, JwtService, HttpStatusCodesService],
  exports: [ShiftService, MongooseModule],
})
export class ShiftModule {}
