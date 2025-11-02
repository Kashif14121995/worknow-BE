import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Rating,
  RatingSchema,
  User,
  UserSchema,
  JobPosting,
  JobPostingSchema,
  Shift,
  ShiftSchema,
  JobApplying,
  JobApplyingSchema,
  Counter,
  CounterSchema,
} from 'src/schemas';
import { RatingService } from './rating.service';
import { RatingController } from './rating.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Rating.name, schema: RatingSchema },
      { name: User.name, schema: UserSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: JobApplying.name, schema: JobApplyingSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
  ],
  controllers: [RatingController],
  providers: [RatingService, HttpStatusCodesService],
  exports: [RatingService],
})
export class RatingModule {}

