import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema, User, UserSchema } from 'src/schemas';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: User.name, schema: UserSchema },
    ]),
    MailModule,
  ],
  controllers: [MessageController],
  providers: [MessageService, HttpStatusCodesService],
  exports: [MessageService],
})
export class MessageModule {}

