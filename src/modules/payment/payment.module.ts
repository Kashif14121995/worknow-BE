import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema, Transaction, TransactionSchema, Wallet, WalletSchema, User, UserSchema, Counter, CounterSchema, JobPosting, JobPostingSchema, Shift, ShiftSchema } from 'src/schemas';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripeModule } from '../stripe/stripe.module';
import { MailModule } from '../mail/mail.module';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Wallet.name, schema: WalletSchema },
      { name: User.name, schema: UserSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: JobPosting.name, schema: JobPostingSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
    StripeModule.forRootAsync(),
    MailModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, HttpStatusCodesService],
  exports: [PaymentService],
})
export class PaymentModule {}

