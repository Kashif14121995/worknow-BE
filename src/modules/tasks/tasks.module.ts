import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { User, UserSchema, Invoice, InvoiceSchema, Shift, ShiftSchema } from 'src/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
  ],
  providers: [TasksService],
})
export class TasksModule {}

