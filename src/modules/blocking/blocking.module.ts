import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BlockedUser, BlockedUserSchema, User, UserSchema } from 'src/schemas';
import { BlockingService } from './blocking.service';
import { BlockingController } from './blocking.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BlockedUser.name, schema: BlockedUserSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BlockingController],
  providers: [BlockingService, HttpStatusCodesService],
  exports: [BlockingService],
})
export class BlockingModule {}

