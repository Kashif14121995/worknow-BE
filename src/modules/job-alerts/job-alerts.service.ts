import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  JobAlertPreference,
  JobAlertPreferenceDocument,
  User,
  UserDocument,
  JobPosting,
} from 'src/schemas';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/schemas/notification.schema';
import { MailService } from '../mail/mail.service';
import { MatchingService } from '../matching/matching.service';

@Injectable()
export class JobAlertsService {
  constructor(
    @InjectModel(JobAlertPreference.name) private alertPreferenceModel: Model<JobAlertPreferenceDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    private notificationService: NotificationService,
    private mailService: MailService,
    private matchingService: MatchingService,
  ) {}

  /**
   * Create or update job alert preferences
   */
  async upsertAlertPreferences(
    userId: string,
    preferences: Partial<JobAlertPreference>,
  ): Promise<JobAlertPreference> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.alertPreferenceModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (existing) {
      Object.assign(existing, preferences);
      await existing.save();
      return existing;
    }

    const alertPreference = await this.alertPreferenceModel.create({
      userId: new Types.ObjectId(userId),
      ...preferences,
    });

    return alertPreference;
  }

  /**
   * Get user's alert preferences
   */
  async getAlertPreferences(userId: string): Promise<JobAlertPreference | null> {
    return this.alertPreferenceModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();
  }

  /**
   * Send job alerts for new jobs (cron job)
   */
  async sendJobAlertsForNewJobs(): Promise<void> {
    // Get users with active alert preferences
    const alertPreferences = await this.alertPreferenceModel
      .find({
        $or: [{ emailAlerts: true }, { inAppAlerts: true }],
      })
      .populate('userId', 'email first_name last_name skills experience location')
      .lean();

    // Get recent active jobs (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const newJobs = await this.jobPostingModel
      .find({
        status: 'active',
        createdAt: { $gte: oneDayAgo },
      })
      .lean();

    for (const preference of alertPreferences) {
      const user = preference.userId as any;
      if (!user) continue;

      for (const job of newJobs) {
        // Check if job matches user preferences
        const matches = await this.jobMatchesPreferences(job as any, preference as any, user);

        if (matches) {
          // Calculate match score
          const matchScore = await this.matchingService.calculateMatchScore(
            user._id.toString(),
            (job as any)._id.toString(),
            job as any,
          );

          // Only alert if match score is above threshold (e.g., 50%)
          if (matchScore.percentage >= 50) {
            // In-app notification
            if (preference.inAppAlerts) {
              await this.notificationService.createNotification({
                userId: user._id.toString(),
                type: NotificationType.JOB_ALERT,
                title: 'New Job Alert',
                message: `New job posted: ${(job as any).jobTitle}`,
                metadata: {
                  jobId: (job as any)._id.toString(),
                  matchScore: matchScore.percentage,
                },
              });
            }

            // Email alert
            if (preference.emailAlerts) {
              try {
                await this.mailService.sendJobAlert({
                  userEmail: user.email,
                  userName: `${user.first_name} ${user.last_name}`,
                  jobTitle: (job as any).jobTitle,
                  jobId: (job as any).jobId,
                  workLocation: (job as any).workLocation,
                  amount: (job as any).amount,
                  matchScore: matchScore.percentage,
                });
              } catch (error) {
                console.error('Error sending job alert email:', error);
              }
            }
          }
        }
      }
    }
  }

  /**
   * Check if job matches user preferences
   */
  private async jobMatchesPreferences(
    job: JobPosting,
    preference: JobAlertPreference,
    user: any,
  ): Promise<boolean> {
    // Check job type
    if (preference.preferredJobTypes && preference.preferredJobTypes.length > 0) {
      if (!preference.preferredJobTypes.includes(job.jobType)) {
        return false;
      }
    }

    // Check industry
    if (preference.preferredIndustries && preference.preferredIndustries.length > 0) {
      if (!preference.preferredIndustries.includes(job.industry)) {
        return false;
      }
    }

    // Check location
    if (preference.preferredLocation) {
      if (!job.workLocation || !job.workLocation.toLowerCase().includes(preference.preferredLocation.toLowerCase())) {
        return false;
      }
    }

    // Check pay rate
    if (preference.minPayRate && job.amount < preference.minPayRate) {
      return false;
    }
    if (preference.maxPayRate && job.amount > preference.maxPayRate) {
      return false;
    }

    return true;
  }

  /**
   * Get trending jobs
   */
  async getTrendingJobs(limit: number = 10): Promise<JobPosting[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Trending jobs based on:
    // 1. Recent applications count
    // 2. Recent job posting (within 7 days)
    // 3. High pay rate
    const trendingJobs = await this.jobPostingModel
      .aggregate([
        {
          $match: {
            status: 'active',
            createdAt: { $gte: sevenDaysAgo },
          },
        },
        {
          $lookup: {
            from: 'jobapplyings',
            localField: '_id',
            foreignField: 'appliedFor',
            as: 'applications',
          },
        },
        {
          $addFields: {
            applicationCount: { $size: '$applications' },
            trendingScore: {
              $add: [
                { $multiply: [{ $size: '$applications' }, 10] }, // Applications weight
                { $divide: ['$amount', 10] }, // Pay rate weight
              ],
            },
          },
        },
        {
          $sort: { trendingScore: -1 },
        },
        {
          $limit: limit,
        },
      ])
      .exec();

    return trendingJobs as JobPosting[];
  }
}

