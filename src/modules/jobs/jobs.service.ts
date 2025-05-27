import { Injectable } from '@nestjs/common';
import { CreateJobListingDto } from './dto/create-job.dto';
import { UpdateJobListingDto } from './dto/update-job.dto';
import { Model } from 'mongoose';
import { JobApplying, JobPosting } from './entities/job.entity';
import { InjectModel } from '@nestjs/mongoose';
import { JobStatus } from './constants';
import * as moment from 'moment';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    @InjectModel(JobApplying.name) private jobApplyingModel: Model<JobApplying>,
  ) { }
  async create(CreateJobListingDto: CreateJobListingDto, userId: string) {
    return await this.jobPostingModel.create({
      ...CreateJobListingDto,
      postedBy: userId,
    });
  }

  async applyForJob(jobId: string, userId: string) {
    return await this.jobApplyingModel.create({
      appliedBy: userId,
      appliedFor: jobId,
    });
  }

  async getAllJobApplications(userId: string) {
    return await this.jobApplyingModel.find({
      appliedBy: userId,
    });
  }

  async getUserListingShiftsData(userId: string) {
    const now = moment();
    const currentMinutes = now.hours() * 60 + now.minutes();
    return {
      active: await this.jobPostingModel.find({
        appliedBy: userId,
        status: JobStatus.active,
        shiftStartsAt: { $lte: currentMinutes },
        shiftEndsAt: { $gte: currentMinutes },
      }),

      inactive: await this.jobPostingModel.find({
        appliedBy: userId,
        status: JobStatus.closed,
      }),

      upcoming: await this.jobPostingModel.find({
        appliedBy: userId,
        status: JobStatus.active,
        shiftStartsAt: { $gte: currentMinutes },
      }),
    };
  }

  async findAll(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [jobs, total] = await Promise.all([
      this.jobPostingModel
        .find({ postedBy: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.jobPostingModel.countDocuments({ postedBy: userId }),
    ]);
    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    return await this.jobPostingModel.findOne({ _id: id });
  }

  async update(id: string, UpdateJobListingDto: UpdateJobListingDto) {
    return await this.jobPostingModel.updateOne(
      { _id: id },
      { $set: { status: UpdateJobListingDto.status } }, // Replace `newStatus` with the actual status value
    );
  }

  async remove(id: string) {
    return await this.jobPostingModel.deleteOne({ _id: id });
  }

  async findUserJobs(id: string, status: JobStatus) {
    return await this.jobPostingModel.find({
      postedBy: id,
      status,
    });
  }
}
