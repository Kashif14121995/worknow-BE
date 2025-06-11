import { Injectable } from '@nestjs/common';
import { CreateJobListingDto } from './dto/create-job.dto';
import { UpdateJobListingDto } from './dto/update-job.dto';
import { Model, Types } from 'mongoose';
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
    const userObjectId = new Types.ObjectId(userId);
    return {
      active: await this.jobPostingModel.find({
        postedBy: userObjectId,
        status: JobStatus.active,
        shiftStartsAt: { $lte: currentMinutes },
        shiftEndsAt: { $gte: currentMinutes },
      }),

      inactive: await this.jobPostingModel.find({
        postedBy: userObjectId,
        status: JobStatus.closed,
      }),

      upcoming: await this.jobPostingModel.find({
        postedBy: userObjectId,
        status: JobStatus.active,
        shiftStartsAt: { $gte: currentMinutes },
      }),
    };
  }

  async findAll(
    userId: string,
    role: string,
    page: number = 1,
    limit: number = 10,
    searchText: string = '',
  ) {
    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: any = { postedBy: new Types.ObjectId(userId) };
    if (searchText && searchText.trim() !== '') {
      matchFilter.description = { $regex: searchText, $options: 'i' };
    }

    const [jobs, total] = await Promise.all([
      this.jobPostingModel
        .aggregate([
          { $match: matchFilter },
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'jobapplyings',
              localField: '_id',
              foreignField: 'appliedFor',
              as: 'applicants',
            },
          },
          {
            $addFields: {
              applicantsCount: { $size: '$applicants' },
            },
          },
          {
            $project: {
              status: 1,
              createdAt: 1,
              description: 1,
              applicantsCount: 1,
            },
          },
        ])
        .exec(),
      this.jobPostingModel.countDocuments(matchFilter),
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
    console.log('Finding job with ID:', id);
    return await this.jobPostingModel.findById(id);
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

  async getAllJobsWithApplicants(userId: string, page: number, limit: number) {
    console.log('Fetching jobs with applicants for user is:', userId);
    const skip = (page - 1) * limit;
    // Import Types from mongoose at the top: import { Types } from 'mongoose';
    const results = await this.jobPostingModel.aggregate([
      {
        $match: {
          postedBy: new Types.ObjectId(userId),
          status: 'active', // optional filter if needed
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'jobapplyings', // collection name for JobApplying
          localField: '_id',
          foreignField: 'appliedFor',
          as: 'applicants',
        },
      },
      {
        $unwind: {
          path: '$applicants',
          preserveNullAndEmptyArrays: false, // Only keep jobs with applicants
        },
      },
      {
        $lookup: {
          from: 'users', // collection name for User
          localField: 'applicants.appliedBy',
          foreignField: '_id',
          as: 'applicants.user',
        },
      },
      {
        $unwind: {
          path: '$applicants.user',
          preserveNullAndEmptyArrays: false, // Only keep applicants with user
        },
      },
      {
        $group: {
          _id: '$_id',
          job: { $first: '$$ROOT' },
          applicants: {
            $push: {
              _id: '$applicants._id',
              appliedBy: '$applicants.appliedBy',
              appliedAt: '$applicants.createdAt',
              user: {
                _id: '$applicants.user._id',
                name: '$applicants.user.name',
                email: '$applicants.user.email',
              },
            },
          },
        },
      },
      {
        $addFields: {
          'job.applicants': '$applicants',
        },
      },
      {
        $replaceRoot: { newRoot: '$job' },
      },
      {
        $match: {
          applicants: { $ne: [], $exists: true },
        },
      },
    ]);

    const total = results.length;

    return {
      data: results,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
    };
  }

  async getApplicationsReceived(
    userId: string,
    role: string,
    page: number = 1,
    limit: number = 10,
    searchText: string = '',
    status: string = '',
  ) {
    const skip = (page - 1) * limit;
    // Build a regex for searchText if provided
    const nameRegex =
      searchText && searchText.trim() !== ''
        ? new RegExp(searchText.trim(), 'i')
        : null;

    // Build status filter if provided
    const statusFilter =
      status && status.trim() !== '' ? { 'applications.status': status } : {};

    const matchStages = [{ $match: { postedBy: new Types.ObjectId(userId) } }];

    const lookupStages = [
      {
        $lookup: {
          from: 'jobapplyings',
          localField: '_id',
          foreignField: 'appliedFor',
          as: 'applications',
        },
      },
      { $unwind: { path: '$applications', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: 'users',
          localField: 'applications.appliedBy',
          foreignField: '_id',
          as: 'applicant',
        },
      },
      { $unwind: { path: '$applicant', preserveNullAndEmptyArrays: false } },
    ];

    // Add status filter if provided
    let extraMatchStages: any[] = [];
    if (Object.keys(statusFilter).length > 0) {
      extraMatchStages.push({ $match: statusFilter });
    }

    // Add name search filter if provided
    if (nameRegex) {
      extraMatchStages.push({
        $match: {
          $or: [
            { 'applicant.first_name': { $regex: nameRegex } },
            { 'applicant.last_name': { $regex: nameRegex } },
            {
              $expr: {
                $regexMatch: {
                  input: {
                    $concat: [
                      '$applicant.first_name',
                      ' ',
                      '$applicant.last_name',
                    ],
                  },
                  regex: nameRegex,
                },
              },
            },
          ],
        },
      });
    }

    const projectAndPaginateStages = [
      {
        $project: {
          _id: 0,
          jobId: '$_id',
          jobDescription: '$description',
          applicantName: {
            $concat: ['$applicant.first_name', ' ', '$applicant.last_name'],
          },
          applicantId: '$applicant._id',
          applicationId: '$applications._id',
          applicationStatus: '$applications.status',
          appliedAt: '$applications.createdAt',
        },
      },
      { $sort: { appliedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
    ];

    const applications = await this.jobPostingModel.aggregate([
      ...matchStages,
      ...lookupStages,
      ...extraMatchStages,
      ...projectAndPaginateStages,
    ]);

    // For total count
    const countStages = [
      ...matchStages,
      ...lookupStages,
      ...extraMatchStages,
      { $count: 'total' },
    ];
    const totalItems = await this.jobPostingModel.aggregate(countStages);
    const total = totalItems[0]?.total || 0;

    return {
      applications,
      total,
      page,
      limit: limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
