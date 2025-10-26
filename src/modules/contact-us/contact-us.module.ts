import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContactUs, ContactUsSchema } from 'src/schemas';
import { ContactUsService } from './contact-us.service';
import { ContactUsController } from './contact-us.controller';
import { HttpStatusCodesService } from 'src/modules/http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ContactUs.name, schema: ContactUsSchema },
    ]),
  ],
  controllers: [ContactUsController],
  providers: [ContactUsService, HttpStatusCodesService],
})
export class ContactUsModule { }
