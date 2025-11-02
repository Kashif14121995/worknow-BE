import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaxDocument, TaxDocumentSchema, User, UserSchema, Transaction, TransactionSchema } from 'src/schemas';
import { TaxDocumentService } from './tax-document.service';
import { TaxDocumentController } from './tax-document.controller';
import { InvoiceModule } from '../invoice/invoice.module';
import { MailModule } from '../mail/mail.module';
import { AwsModule } from '../aws/aws.module';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TaxDocument.name, schema: TaxDocumentSchema },
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    InvoiceModule,
    MailModule,
    AwsModule,
  ],
  controllers: [TaxDocumentController],
  providers: [TaxDocumentService, HttpStatusCodesService],
  exports: [TaxDocumentService],
})
export class TaxDocumentModule {}

