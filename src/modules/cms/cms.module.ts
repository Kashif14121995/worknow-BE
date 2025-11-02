import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CMS, CMSSchema } from 'src/schemas/cms.schema';
import { CMSService } from './cms.service';
import { CMSController } from './cms.controller';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CMS.name, schema: CMSSchema },
    ]),
  ],
  controllers: [CMSController],
  providers: [CMSService, HttpStatusCodesService],
  exports: [CMSService],
})
export class CMSModule {}

