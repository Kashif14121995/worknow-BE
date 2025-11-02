import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobListingDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { JobStatus, JobApplicationAppliedStatus } from 'src/constants';
import * as moment from 'moment';
import { User, JobApplying, JobPosting, Shift } from 'src/schemas';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    @InjectModel(JobApplying.name) private jobApplyingModel: Model<JobApplying>,
    @InjectModel(Shift.name) private shiftModel: Model<Shift>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) { }
  async create(CreateJobListingDto: CreateJobListingDto, userId: string) {
    const job = await this.jobPostingModel.create({
      ...CreateJobListingDto,
      postedBy: userId,
      status:
        CreateJobListingDto.saveStatus === 'draft'
          ? JobStatus.draft
          : JobStatus.active, // Default status when creating a job
    });

    // Send email notification if job is active
    if (job.status === JobStatus.active) {
      try {
        const provider = await this.userModel.findById(userId);
        if (provider) {
          await this.mailService.sendJobPostedEmail({
            providerEmail: provider.email,
            providerName: `${provider.first_name} ${provider.last_name}`,
            jobTitle: job.jobTitle,
            jobId: job.jobId,
            jobLocation: job.workLocation,
            postedDate: new Date(job.createdAt).toLocaleDateString(),
          });
        }
      } catch (error) {
        console.error('Error sending job posted email:', error);
        // Don't throw error, just log it
      }
    }

    return job;
  }

  async applyForJob(jobId: string, userId: string) {
    // 1️⃣ Fetch the user
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    // 2️⃣ Only job seekers can apply
    if (user.role !== 'job_seeker') {
      throw new ForbiddenException('Only job seekers can apply for jobs.');
    }

    // // 3️⃣ Ensure profile completeness
    // if (!user.skills || user.skills.length === 0 || !user.experience || !user.education) {
    //   throw new BadRequestException('Complete your profile (skills, experience, education) to apply.');
    // }

    // 4️⃣ Fetch the job
    const job = await this.jobPostingModel.findById(jobId);
    if (!job) throw new NotFoundException('Job not found.');

    // 5️⃣ Only active jobs can be applied for
    if (job.status !== 'active') {
      throw new BadRequestException('You cannot apply for inactive jobs.');
    }

    // 6️⃣ Prevent duplicate applications
    const alreadyApplied = await this.jobApplyingModel.findOne({
      appliedBy: userId,
      appliedFor: jobId,
    });
    if (alreadyApplied) {
      throw new ConflictException('You have already applied for this job.');
    }

    // 7️⃣ Check if positions are available
    const appliedCount = await this.jobApplyingModel.countDocuments({ appliedFor: jobId });
    if (appliedCount >= job.positions) {
      throw new BadRequestException('All positions for this job have been filled.');
    }

    // 8️⃣ Check application deadline
    const today = new Date();
    if (job.shiftEndsAt && today > job.shiftEndsAt) {
      throw new BadRequestException('The application deadline for this job has passed.');
    }

    // // 9️⃣ Check experience requirement
    // if (job.experienceLevel && user.experience < parseInt(job.experienceLevel)) {
    //   throw new BadRequestException('You do not meet the experience requirement.');
    // }

    // // 10️⃣ Check education requirement
    // if (job.education && user.education.toLowerCase() !== job.education.toLowerCase()) {
    //   throw new BadRequestException('You do not meet the education requirement.');
    // }

    // // 11️⃣ Check location restriction (if applicable)
    // if (job.workLocation && user.location && user.location !== job.workLocation) {
    //   throw new BadRequestException(`This job requires location: ${job.workLocation}`);
    // }

    // 12️⃣ Check overlapping shifts
    const overlappingShift = await this.jobApplyingModel
      .findOne({ appliedBy: userId })
      .populate('appliedFor')
      .lean<{ appliedFor: JobPosting & { _id: string } }>();

    if (overlappingShift) {
      const shift = overlappingShift.appliedFor;
      if (
        shift.shiftStartsAt <= job.shiftEndsAt &&
        shift.shiftEndsAt >= job.shiftStartsAt
      ) {
        throw new BadRequestException('You have another assigned shift that overlaps with this job.');
      }
    }

    // 13️⃣ Max applications per day (optional)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const applicationsToday = await this.jobApplyingModel.countDocuments({
      appliedBy: userId,
      createdAt: { $gte: startOfDay },
    });
    const MAX_APPLICATIONS_PER_DAY = 10;
    if (applicationsToday >= MAX_APPLICATIONS_PER_DAY) {
      throw new BadRequestException('You have reached the maximum number of applications allowed today.');
    }

    // ✅ Create the application
    const application = await this.jobApplyingModel.create({
      appliedBy: userId,
      appliedFor: jobId,
    });

    // Send email notification to provider
    try {
      const provider = await this.userModel.findById(job.postedBy);
      if (provider) {
        await this.mailService.sendApplicationReceivedEmail({
          providerEmail: provider.email,
          providerName: `${provider.first_name} ${provider.last_name}`,
          seekerName: `${user.first_name} ${user.last_name}`,
          jobTitle: job.jobTitle,
          appliedDate: new Date(application.createdAt).toLocaleDateString(),
        });
      }
    } catch (error) {
      console.error('Error sending application received email:', error);
      // Don't throw error, just log it
    }

    return application;
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
    page: number = 1,
    limit: number = 10,
    searchText: string = '',
  ) {
    const skip = (page - 1) * limit;

    // Build match filter
    const matchFilter: any = { postedBy: new Types.ObjectId(userId) };
    if (searchText && searchText.trim() !== '') {
      matchFilter.jobTitle = { $regex: searchText, $options: 'i' };
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
              jobTitle: 1,
              status: 1,
              createdAt: 1,
              description: 1,
              applicantsCount: 1,
              jobId: 1,
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
    return await this.jobPostingModel.findById(id);
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

    const matchStages = [];
    if (Types.ObjectId.isValid(userId)) {
      matchStages.push({ $match: { postedBy: new Types.ObjectId(userId) } });
    } else {
      throw new BadRequestException(`Invalid userId: ${userId}`);
    }

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

  async updateStatus(jobId: string, status: string): Promise<JobPosting> {
    const job = await this.jobPostingModel.findById(jobId);

    if (!job) {
      throw new NotFoundException(`Job not found`);
    }

    if (job.status === JobStatus.closed && status === JobStatus.closed) {
      throw new BadRequestException(`Job is already closed`);
    }

    job.status = status;
    await job.save();

    return job;
  }

  async approveApplication(applicationId: string, providerId: string): Promise<JobApplying> {
    const application = await this.jobApplyingModel.findById(applicationId).populate('appliedFor');
    
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const job = application.appliedFor as any;
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify the provider owns this job
    if (job.postedBy.toString() !== providerId) {
      throw new ForbiddenException('You do not have permission to approve this application');
    }

    // Update application status to shortlisted
    application.status = JobApplicationAppliedStatus.shortlisted;
    await application.save();

    const populatedApp = await application.populate([
      { path: 'appliedBy', select: 'first_name last_name email' },
      { path: 'appliedFor', select: 'jobTitle jobId workLocation' },
    ]);

    // Send email notification to seeker
    try {
      const seeker = populatedApp.appliedBy as any;
      const jobData = populatedApp.appliedFor as any;
      const provider = await this.userModel.findById(providerId);

      if (seeker && jobData && provider) {
        await this.mailService.sendApplicationShortlistedEmail({
          seekerEmail: seeker.email,
          seekerName: `${seeker.first_name} ${seeker.last_name}`,
          providerName: `${provider.first_name} ${provider.last_name}`,
          jobTitle: jobData.jobTitle,
          jobLocation: jobData.workLocation || 'N/A',
        });
      }
    } catch (error) {
      console.error('Error sending shortlisted email:', error);
    }

    return populatedApp;
  }

  async rejectApplication(applicationId: string, providerId: string): Promise<JobApplying> {
    const application = await this.jobApplyingModel.findById(applicationId).populate('appliedFor');
    
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const job = application.appliedFor as any;
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify the provider owns this job
    if (job.postedBy.toString() !== providerId) {
      throw new ForbiddenException('You do not have permission to reject this application');
    }

    // Update application status to rejected
    application.status = JobApplicationAppliedStatus.rejected;
    await application.save();

    const populatedApp = await application.populate([
      { path: 'appliedBy', select: 'first_name last_name email' },
      { path: 'appliedFor', select: 'jobTitle jobId' },
    ]);

    // Send email notification to seeker
    try {
      const seeker = populatedApp.appliedBy as any;
      const jobData = populatedApp.appliedFor as any;
      const provider = await this.userModel.findById(providerId);

      if (seeker && jobData && provider) {
        await this.mailService.sendApplicationRejectedEmail({
          seekerEmail: seeker.email,
          seekerName: `${seeker.first_name} ${seeker.last_name}`,
          providerName: `${provider.first_name} ${provider.last_name}`,
          jobTitle: jobData.jobTitle,
        });
      }
    } catch (error) {
      console.error('Error sending rejected email:', error);
    }

    return populatedApp;
  }

  async hireApplication(applicationId: string, providerId: string): Promise<JobApplying> {
    const application = await this.jobApplyingModel.findById(applicationId).populate('appliedFor');
    
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const job = application.appliedFor as any;
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify the provider owns this job
    if (job.postedBy.toString() !== providerId) {
      throw new ForbiddenException('You do not have permission to hire this applicant');
    }

    // Update application status to hired
    application.status = JobApplicationAppliedStatus.hired;
    await application.save();

    const populatedApp = await application.populate([
      { path: 'appliedBy', select: 'first_name last_name email' },
      { path: 'appliedFor', select: 'jobTitle jobId workLocation' },
    ]);

    // Send email notification to seeker
    try {
      const seeker = populatedApp.appliedBy as any;
      const jobData = populatedApp.appliedFor as any;
      const provider = await this.userModel.findById(providerId);

      if (seeker && jobData && provider) {
        await this.mailService.sendApplicationHiredEmail({
          seekerEmail: seeker.email,
          seekerName: `${seeker.first_name} ${seeker.last_name}`,
          providerName: `${provider.first_name} ${provider.last_name}`,
          jobTitle: jobData.jobTitle,
          jobLocation: jobData.workLocation || 'N/A',
          shiftDetails: 'Details will be provided by employer',
        });
      }
    } catch (error) {
      console.error('Error sending hired email:', error);
    }

    return populatedApp;
  }

  async update(jobId: string, payload: UpdateJobDto): Promise<JobPosting> {
    const job = await this.jobPostingModel.findById(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // 🚫 Rule 1: Prevent update if job is closed
    if (job.status === 'closed') {
      throw new BadRequestException('This job is closed and cannot be updated');
    }

    // 🚫 Rule 2: Prevent update if applicants exist
    const applicantsCount = await this.jobApplyingModel.countDocuments({
      appliedFor: jobId,
    });

    if (applicantsCount > 0) {
      throw new BadRequestException(
        'Applicants already applied, job cannot be updated',
      );
    }

    return this.jobPostingModel.findByIdAndUpdate(jobId, payload, {
      new: true,
    });
  }

  /**
   * Get seekers who have applied to jobs created by a lister and are assigned to shifts
   * Each seeker-job combination is returned as a separate entry
   * @param listerId - The ID of the lister (job provider)
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @param seekerName - Optional filter by seeker name (partial match, case-insensitive)
   * @returns List of seeker-job combinations with application and shift assignment details
   */
  async getSeekersAppliedAndAssignedToShifts(
    listerId: string,
    page: number = 1,
    limit: number = 10,
    seekerName?: string,
  ) {
    try {
      // Step 1: Find all jobs created by the lister
      const jobs = await this.jobPostingModel.find({
        postedBy: new Types.ObjectId(listerId)
      });

      if (jobs.length === 0) {
        return {
          seekers: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
          },
        };
      }

      const jobIds = jobs.map(job => job._id);

      // Step 2: Find applications for these jobs
      const applications = await this.jobApplyingModel.find({
        appliedFor: { $in: jobIds }
      }).populate('appliedBy');

      if (applications.length === 0) {
        return {
          seekers: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
          },
        };
      }

      // Step 3: Find shifts for these jobs
      const shifts = await this.shiftModel.find({
        $or: [
          { jobId: { $in: jobIds } },
          { jobId: { $in: jobIds.map(id => id.toString()) } }
        ]
      });

      if (shifts.length === 0) {
        return {
          seekers: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
          },
        };
      }

      // Step 4: Find seekers who are both applied and assigned
      const seekerIds = applications.map(app => app.appliedBy._id.toString());
      const assignedSeekerIds = shifts.flatMap(shift =>
        shift.assignees.map(assignee => assignee.toString())
      );

      const commonSeekerIds = seekerIds.filter(id => assignedSeekerIds.includes(id));

      if (commonSeekerIds.length === 0) {
        return {
          seekers: [],
          pagination: {
            currentPage: page,
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: limit,
          },
        };
      }

      // Step 5: Get detailed information for common seekers
      const seekers = [];

      for (const seekerId of commonSeekerIds) {
        const seekerApplications = applications.filter(app =>
          app.appliedBy._id.toString() === seekerId
        );

        const seekerShifts = shifts.filter(shift =>
          shift.assignees.some(assignee => assignee.toString() === seekerId)
        );

        const seeker = seekerApplications[0].appliedBy as any;

        // Create a separate entry for each job application
        for (const app of seekerApplications) {
          const job = jobs.find(j => j._id.toString() === app.appliedFor.toString());
          const shift = seekerShifts.find(s => s.jobId.toString() === app.appliedFor.toString());

          const seekerData = {
            seekerId: seeker._id,
            seekerName: `${seeker.first_name} ${seeker.last_name}`,
            seekerEmail: seeker.email,
            seekerPhone: seeker.phone_number,
            seekerRole: seeker.role,
            // Job details as key-value pairs
            jobId: job?._id,
            jobTitle: job?.jobTitle,
            jobDescription: job?.description,
            jobStatus: job?.status,
            jobRequiredSkills: job?.requiredSkills,
            jobAmount: job?.amount,
            jobPaymentType: job?.paymentType,
            jobWorkLocation: job?.workLocation,
            jobIndustry: job?.industry,
            jobType: job?.jobType,
            jobExperienceLevel: job?.experienceLevel,
            jobEducation: job?.education,
            jobPositions: job?.positions,
            // Application details
            appliedAt: app.createdAt,
            applicationStatus: app.status,
            applicationId: app._id,
            // Shift details as key-value pairs (if assigned)
            shiftId: shift?._id,
            shiftStartDate: shift?.startDate,
            shiftEndDate: shift?.endDate,
            shiftStartTime: shift?.startTime,
            shiftEndTime: shift?.endTime,
            shiftStatus: shift?.status,
          };

          seekers.push(seekerData);
        }
      }

      // Step 6: Apply seeker name filter if provided
      let filteredSeekers = seekers;
      if (seekerName && seekerName.trim() !== '') {
        const nameFilter = seekerName.trim().toLowerCase();
        filteredSeekers = seekers.filter(seeker =>
          seeker.seekerName.toLowerCase().includes(nameFilter)
        );
      }

      // Step 7: Apply pagination
      const skip = (page - 1) * limit;
      const paginatedSeekers = filteredSeekers.slice(skip, skip + limit);

      return {
        seekers: paginatedSeekers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredSeekers.length / limit),
          totalItems: filteredSeekers.length,
          itemsPerPage: limit,
        },
      };

    } catch (error) {
      console.error('🔍 Debug: Error in getSeekersAppliedAndAssignedToShifts:', error);
      throw error;
    }
  }

  async getUnassignedApplications(providerId: string) {
    try {
      // Ensure providerId is a valid ObjectId
      const providerIdObj = new Types.ObjectId(providerId);
      // Fetch only applications with valid ObjectId in appliedFor
      const results = await this.jobApplyingModel
        .find({
          appliedFor: { $type: 'objectId' }, // ensures appliedFor is ObjectId
          $or: [{ shiftId: { $exists: false } }, { shiftId: null }],
        })
        .populate({
          path: 'appliedFor',
          match: { postedBy: providerIdObj },
          select: 'jobTitle jobType industry shiftStartsAt shiftEndsAt postedBy',
        })
        .populate('appliedBy', 'first_name last_name email role')
        .lean();

      // Remove any entries where the job doesn't belong to this provider
      return results.filter((r) => r.appliedFor !== null);
    } catch (error) {
      console.error('❌ Error in getUnassignedApplications:', error);
      throw new Error('Failed to fetch unassigned job applications');
    }
  }
}
