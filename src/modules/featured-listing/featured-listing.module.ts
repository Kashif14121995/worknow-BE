import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JobPosting, JobPostingSchema, User, UserSchema, Subscription, SubscriptionSchema } from 'src/schemas';
import { FeaturedListingService } from './featured-listing.service';
import { FeaturedListingController } from './featured-listing.controller';
import { PaymentModule } from '../payment/payment.module';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    PaymentModule,
  ],
  controllers: [FeaturedListingController],
  providers: [FeaturedListingService, HttpStatusCodesService],
  exports: [FeaturedListingService],
})
export class FeaturedListingModule {}

