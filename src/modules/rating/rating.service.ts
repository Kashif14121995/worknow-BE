import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Rating,
  RatingDocument,
  User,
  JobPosting,
  Shift,
  JobApplying,
  Counter,
  CounterDocument,
} from 'src/schemas';
import { RatingType } from 'src/schemas/rating.schema';
import { CreateRatingDto } from './dto/create-rating.dto';

@Injectable()
export class RatingService {
  constructor(
    @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    @InjectModel(Shift.name) private shiftModel: Model<Shift>,
    @InjectModel(JobApplying.name) private applicationModel: Model<JobApplying>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) {}

  // Create a rating
  async createRating(userId: string, dto: CreateRatingDto): Promise<Rating> {
    const rater = await this.userModel.findById(userId);
    if (!rater) {
      throw new NotFoundException('User not found');
    }

    // Validate rating type and related entities
    if (dto.ratingType === RatingType.SEEKER_TO_PROVIDER || dto.ratingType === RatingType.SEEKER_TO_JOB) {
      if (rater.role !== 'job_seeker') {
        throw new ForbiddenException('Only job seekers can rate providers/jobs');
      }
    }

    if (dto.ratingType === RatingType.PROVIDER_TO_SEEKER) {
      if (rater.role !== 'job_provider') {
        throw new ForbiddenException('Only job providers can rate seekers');
      }
      if (!dto.ratedUserId) {
        throw new BadRequestException('ratedUserId is required for provider_to_seeker rating');
      }
    }

    // Verify related entities exist
    if (dto.jobId) {
      const job = await this.jobPostingModel.findById(dto.jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }
    }

    if (dto.ratedUserId) {
      const ratedUser = await this.userModel.findById(dto.ratedUserId);
      if (!ratedUser) {
        throw new NotFoundException('Rated user not found');
      }
    }

    if (dto.shiftId) {
      const shift = await this.shiftModel.findById(dto.shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }
    }

    // Check for duplicate rating (same user, same job/shift)
    const existingRating = await this.ratingModel.findOne({
      ratedBy: new Types.ObjectId(userId),
      ...(dto.jobId && { jobId: new Types.ObjectId(dto.jobId) }),
      ...(dto.ratedUserId && { ratedUser: new Types.ObjectId(dto.ratedUserId) }),
      ...(dto.shiftId && { shiftId: new Types.ObjectId(dto.shiftId) }),
      ratingType: dto.ratingType,
    });

    if (existingRating) {
      throw new BadRequestException('You have already rated this');
    }

    // Generate rating ID
    const counter = await this.counterModel.findOneAndUpdate(
      { id: 'ratingId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    const ratingId = `RATE_${String(counter.seq).padStart(6, '0')}`;

    // Create rating
    const rating = await this.ratingModel.create({
      ratingId,
      ratedBy: new Types.ObjectId(userId),
      ...(dto.ratedUserId && { ratedUser: new Types.ObjectId(dto.ratedUserId) }),
      ...(dto.jobId && { jobId: new Types.ObjectId(dto.jobId) }),
      ...(dto.shiftId && { shiftId: new Types.ObjectId(dto.shiftId) }),
      ...(dto.applicationId && { applicationId: new Types.ObjectId(dto.applicationId) }),
      ratingType: dto.ratingType,
      rating: dto.rating,
      review: dto.review,
      tags: dto.tags || [],
      isPublic: dto.isPublic !== undefined ? dto.isPublic : true,
    });

    return rating.populate([
      { path: 'ratedBy', select: 'first_name last_name email' },
      { path: 'ratedUser', select: 'first_name last_name email' },
      { path: 'jobId', select: 'jobTitle jobId' },
    ]);
  }

  // Get ratings for a user
  async getUserRatings(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const userIdObj = new Types.ObjectId(userId);

    const filter = { ratedUser: userIdObj, isPublic: true };

    const [ratings, total] = await Promise.all([
      this.ratingModel
        .find(filter)
        .populate('ratedBy', 'first_name last_name email')
        .populate('jobId', 'jobTitle jobId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.ratingModel.countDocuments(filter),
    ]);

    // Calculate average rating
    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return {
      ratings,
      averageRating: Math.round(averageRating * 10) / 10,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get ratings for a job
  async getJobRatings(jobId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const jobIdObj = new Types.ObjectId(jobId);

    const filter = { jobId: jobIdObj, isPublic: true };

    const [ratings, total] = await Promise.all([
      this.ratingModel
        .find(filter)
        .populate('ratedBy', 'first_name last_name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.ratingModel.countDocuments(filter),
    ]);

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return {
      ratings,
      averageRating: Math.round(averageRating * 10) / 10,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get user's average rating
  async getUserAverageRating(userId: string): Promise<number> {
    const ratings = await this.ratingModel.find({
      ratedUser: new Types.ObjectId(userId),
      isPublic: true,
    });

    if (ratings.length === 0) {
      return 0;
    }

    const average =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    return Math.round(average * 10) / 10;
  }

  // Get job's average rating
  async getJobAverageRating(jobId: string): Promise<number> {
    const ratings = await this.ratingModel.find({
      jobId: new Types.ObjectId(jobId),
      isPublic: true,
    });

    if (ratings.length === 0) {
      return 0;
    }

    const average =
      ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    return Math.round(average * 10) / 10;
  }
}

