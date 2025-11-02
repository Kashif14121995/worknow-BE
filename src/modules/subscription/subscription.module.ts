import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscription, SubscriptionSchema, User, UserSchema } from 'src/schemas';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, HttpStatusCodesService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}

