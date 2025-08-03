import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Newsletter, NewsletterSchema } from '../schemas/newsletter.schema';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Newsletter.name, schema: NewsletterSchema },
    ]),
  ],
  controllers: [NewsletterController],
  providers: [NewsletterService, HttpStatusCodesService],
})
export class NewsletterModule {}
