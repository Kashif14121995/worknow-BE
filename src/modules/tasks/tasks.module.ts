import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './tasks.service';
import { SavedSearchModule } from '../saved-search/saved-search.module';
import { JobAlertsModule } from '../job-alerts/job-alerts.module';
import { User, UserSchema, Invoice, InvoiceSchema, Shift, ShiftSchema } from 'src/schemas';
import { FeaturedListingModule } from '../featured-listing/featured-listing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
    SavedSearchModule,
    JobAlertsModule,
    FeaturedListingModule,
  ],
  providers: [TasksService],
})
export class TasksModule {}

