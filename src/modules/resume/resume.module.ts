import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Resume, ResumeSchema, User, UserSchema } from 'src/schemas';
import { ResumeService } from './resume.service';
import { ResumeController } from './resume.controller';
import { ResumeParserService } from './resume-parser.service';
import { AwsModule } from '../aws/aws.module';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resume.name, schema: ResumeSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AwsModule,
  ],
  controllers: [ResumeController],
  providers: [ResumeService, ResumeParserService, HttpStatusCodesService],
  exports: [ResumeService],
})
export class ResumeModule {}

