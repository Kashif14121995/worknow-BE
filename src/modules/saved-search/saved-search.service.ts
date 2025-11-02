import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  SavedSearch,
  SavedSearchDocument,
  User,
  UserDocument,
  JobPosting,
} from 'src/schemas';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/schemas/notification.schema';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SavedSearchService {
  constructor(
    @InjectModel(SavedSearch.name) private savedSearchModel: Model<SavedSearchDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    private notificationService: NotificationService,
    private mailService: MailService,
  ) {}

  /**
   * Create a saved search
   */
  async createSavedSearch(userId: string, searchData: {
    name?: string;
    keyword?: string;
    jobTypes?: string[];
    industries?: string[];
    location?: string;
    minPayRate?: number;
    maxPayRate?: number;
    requiredSkills?: string[];
    minExperience?: number;
  }): Promise<SavedSearch> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const savedSearch = await this.savedSearchModel.create({
      userId: new Types.ObjectId(userId),
      ...searchData,
      isActive: true,
      lastCheckedAt: new Date(),
    });

    return savedSearch;
  }

  /**
   * Get user's saved searches
   */
  async getUserSavedSearches(userId: string): Promise<SavedSearch[]> {
    return this.savedSearchModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Update saved search
   */
  async updateSavedSearch(
    searchId: string,
    userId: string,
    updates: Partial<SavedSearch>,
  ): Promise<SavedSearch> {
    const search = await this.savedSearchModel.findOne({
      _id: new Types.ObjectId(searchId),
      userId: new Types.ObjectId(userId),
    });

    if (!search) {
      throw new NotFoundException('Saved search not found');
    }

    Object.assign(search, updates);
    await search.save();

    return search;
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(searchId: string, userId: string): Promise<void> {
    const result = await this.savedSearchModel.deleteOne({
      _id: new Types.ObjectId(searchId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Saved search not found');
    }
  }

  /**
   * Check for new job matches in saved searches (cron job)
   */
  async checkSavedSearchMatches(): Promise<void> {
    const activeSearches = await this.savedSearchModel.find({
      isActive: true,
    }).populate('userId', 'email first_name last_name').lean();

    for (const search of activeSearches) {
      const matches = await this.findMatchingJobs(search as any);

      if (matches.length > 0) {
        // Create notifications and send emails
        const user = search.userId as any;
        if (user) {
          // Create in-app notification
          await this.notificationService.createNotification({
            userId: user._id.toString(),
            type: NotificationType.JOB_ALERT,
            title: `New Jobs Match Your Saved Search`,
            message: `${matches.length} new job(s) match your saved search: "${search.name || 'Your search'}"`,
            metadata: {
              savedSearchId: search._id.toString(),
              matchCount: matches.length,
            },
          });

          // Send email
          try {
            await this.mailService.sendSavedSearchAlert({
              userEmail: user.email,
              userName: `${user.first_name} ${user.last_name}`,
              searchName: search.name || 'Your saved search',
              matchCount: matches.length,
              jobs: matches.slice(0, 5), // Top 5 matches
            });
          } catch (error) {
            console.error('Error sending saved search email:', error);
          }
        }

        // Update last checked time
        await this.savedSearchModel.findByIdAndUpdate(search._id, {
          lastCheckedAt: new Date(),
        });
      }
    }
  }

  /**
   * Find jobs matching saved search criteria
   */
  private async findMatchingJobs(search: SavedSearch & { userId: any }): Promise<JobPosting[]> {
    const query: any = {
      status: 'active',
      createdAt: { $gt: search.lastCheckedAt || new Date(0) }, // Only new jobs since last check
    };

    if (search.keyword) {
      query.$or = [
        { jobTitle: { $regex: search.keyword, $options: 'i' } },
        { description: { $regex: search.keyword, $options: 'i' } },
      ];
    }

    if (search.jobTypes && search.jobTypes.length > 0) {
      query.jobType = { $in: search.jobTypes };
    }

    if (search.industries && search.industries.length > 0) {
      query.industry = { $in: search.industries };
    }

    if (search.location) {
      query.workLocation = { $regex: search.location, $options: 'i' };
    }

    if (search.minPayRate) {
      query.amount = { ...query.amount, $gte: search.minPayRate };
    }

    if (search.maxPayRate) {
      query.amount = { ...query.amount, ...(query.amount ? {} : {}), $lte: search.maxPayRate };
      if (query.amount.$gte) {
        query.amount = { $gte: search.minPayRate, $lte: search.maxPayRate };
      } else {
        query.amount = { $lte: search.maxPayRate };
      }
    }

    if (search.requiredSkills && search.requiredSkills.length > 0) {
      query.requiredSkills = { $in: search.requiredSkills };
    }

    if (search.minExperience) {
      query.experienceLevel = { $gte: search.minExperience.toString() };
    }

    const jobs = await this.jobPostingModel.find(query).limit(20).lean();
    return jobs as JobPosting[];
  }
}

