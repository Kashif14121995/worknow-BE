import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Onboarding, OnboardingSchema, User, UserSchema } from 'src/schemas';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Onboarding.name, schema: OnboardingSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService, HttpStatusCodesService],
  exports: [OnboardingService],
})
export class OnboardingModule {}

