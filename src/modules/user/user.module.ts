import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, HttpStatusCodesService],
  exports: [UserService],
})
export class UserModule {}

