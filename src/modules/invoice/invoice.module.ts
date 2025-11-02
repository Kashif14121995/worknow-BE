import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Invoice,
  InvoiceSchema,
  User,
  UserSchema,
  Transaction,
  TransactionSchema,
  Shift,
  ShiftSchema,
  JobPosting,
  JobPostingSchema,
  Payment,
  PaymentSchema,
  Counter,
  CounterSchema,
} from 'src/schemas';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { InvoicePdfService } from './invoice-pdf.service';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { MailModule } from '../mail/mail.module';
import { AwsModule } from '../aws/aws.module';

@Module({
  imports: [
    AwsModule,
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: User.name, schema: UserSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Shift.name, schema: ShiftSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Counter.name, schema: CounterSchema },
    ]),
    MailModule,
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoicePdfService, HttpStatusCodesService],
  exports: [InvoiceService],
})
export class InvoiceModule {}

