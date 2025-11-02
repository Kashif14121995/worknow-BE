import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from 'src/schemas';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, HttpStatusCodesService],
  exports: [NotificationService],
})
export class NotificationModule {}

