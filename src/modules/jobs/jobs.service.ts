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
  ) {}
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

  async getAllJobApplications(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      this.jobApplyingModel
        .find({ appliedBy: userId })
        .skip(skip)
        .limit(limit)
        .lean(), // optional: returns plain JS objects
      this.jobApplyingModel.countDocuments({ appliedBy: userId }),
    ]);

    return {
      data: results,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    };
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

  async findAll() {
    return await this.jobPostingModel.find();
  }

  async findOne(id: number) {
    console.log('Finding job with ID:', id);
    return await this.jobPostingModel.findById(id);
  }

  async update(id: string, UpdateJobListingDto: UpdateJobListingDto) {
    return await this.jobPostingModel.updateOne(
      { _id: id },
      { $set: { status: UpdateJobListingDto.status } }, // Replace `newStatus` with the actual status value
    );
  }

  remove(id: number) {
    return `This action removes a #${id} job`;
  }

  async findUserJobs(id: string, status: JobStatus) {
    return await this.jobPostingModel.find({
      postedBy: id,
      status,
    });
  }
}
