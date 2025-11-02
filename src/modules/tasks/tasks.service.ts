import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shift, Invoice, InvoiceDocument, ShiftDocument, User, UserDocument } from 'src/schemas';
import { SavedSearchService } from '../saved-search/saved-search.service';
import { JobAlertsService } from '../job-alerts/job-alerts.service';
import { InvoiceStatus } from 'src/schemas/invoice.schema';
import { FeaturedListingService } from '../featured-listing/featured-listing.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    private savedSearchService: SavedSearchService,
    private jobAlertsService: JobAlertsService,
    private featuredListingService: FeaturedListingService,
  ) {}

  // Cleanup expired OTPs - Run every hour
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOTPs() {
    this.logger.log('Running cleanup expired OTPs task');
    try {
      const result = await this.userModel.updateMany(
        {
          otp_expires_after: { $lt: Date.now() },
          otp: { $exists: true },
        },
        {
          $unset: { otp: '', otp_expires_after: '' },
        },
      );
      this.logger.log(`Cleaned up ${result.modifiedCount} expired OTPs`);
    } catch (error) {
      this.logger.error(`Error cleaning up expired OTPs: ${error.message}`);
    }
  }

  // Update overdue invoices - Run daily at midnight
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateOverdueInvoices() {
    this.logger.log('Running update overdue invoices task');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await this.invoiceModel.updateMany(
        {
          status: { $in: [InvoiceStatus.SENT, InvoiceStatus.DRAFT] },
          dueDate: { $lt: today },
        },
        {
          $set: { status: InvoiceStatus.OVERDUE },
        },
      );
      this.logger.log(`Updated ${result.modifiedCount} overdue invoices`);
    } catch (error) {
      this.logger.error(`Error updating overdue invoices: ${error.message}`);
    }
  }

  // Cleanup old draft invoices (older than 30 days) - Run weekly on Sunday
  @Cron('0 0 * * 0')
  async cleanupOldDraftInvoices() {
    this.logger.log('Running cleanup old draft invoices task');
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.invoiceModel.deleteMany({
        status: InvoiceStatus.DRAFT,
        createdAt: { $lt: thirtyDaysAgo },
      });

      this.logger.log(`Deleted ${result.deletedCount} old draft invoices`);
    } catch (error) {
      this.logger.error(`Error cleaning up old draft invoices: ${error.message}`);
    }
  }

  // Check saved search matches - Every 6 hours
  @Cron('0 */6 * * *')
  async checkSavedSearchMatches() {
    try {
      await this.savedSearchService.checkSavedSearchMatches();
      this.logger.log('Saved search matches checked');
    } catch (error) {
      this.logger.error('Error checking saved search matches:', error);
    }
  }

  // Send job alerts - Every 4 hours
  @Cron('0 */4 * * *')
  async sendJobAlerts() {
    try {
      await this.jobAlertsService.sendJobAlertsForNewJobs();
      this.logger.log('Job alerts sent');
    } catch (error) {
      this.logger.error('Error sending job alerts:', error);
    }
  }

  // Update missed shifts (every hour)
  @Cron('0 * * * *') // Every hour at minute 0
  async updateMissedShifts() {
    this.logger.log('Running missed shifts update...');
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    try {
      // Find shifts that were scheduled to start more than 1 hour ago but are still in scheduled status
      const missedShifts = await this.shiftModel.find({
        status: 'scheduled',
        startDate: { $lt: oneHourAgo },
      });

      for (const shift of missedShifts) {
        // Check if shift has any check-ins by checking shift assignments
        // For now, we'll mark as missed if it's past start time + 1 hour
        const shiftStartDateTime = new Date(shift.startDate);
        const [hours, minutes] = (shift as any).startTime?.split(':').map(Number) || [0, 0];
        shiftStartDateTime.setHours(hours, minutes, 0, 0);

        // If start time + 1 hour has passed, mark as missed
        const oneHourAfterStart = new Date(shiftStartDateTime.getTime() + 60 * 60 * 1000);
        if (now > oneHourAfterStart) {
          await this.shiftModel.findByIdAndUpdate(shift._id, { status: 'missed' });
          this.logger.log(`Shift ${shift.shiftId || shift._id} marked as missed`);
        }
      }

      this.logger.log(`Missed shifts update completed. Processed ${missedShifts.length} shifts`);
    } catch (error) {
      this.logger.error('Error updating missed shifts:', error);
    }
  }
}

