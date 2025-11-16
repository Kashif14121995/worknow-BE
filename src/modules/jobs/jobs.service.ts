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
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from 'src/schemas/notification.schema';
import { BlockingService } from '../blocking/blocking.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    @InjectModel(JobApplying.name) private jobApplyingModel: Model<JobApplying>,
    @InjectModel(Shift.name) private shiftModel: Model<Shift>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly mailService: MailService,
    private readonly notificationService: NotificationService,
    private readonly blockingService: BlockingService,
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
          const jobDoc = job.toObject ? job.toObject() : job as any;
          await this.mailService.sendJobPostedEmail({
            providerEmail: provider.email,
            providerName: `${provider.first_name} ${provider.last_name}`,
            jobTitle: job.jobTitle,
            jobId: job.jobId,
            jobLocation: job.workLocation,
            postedDate: jobDoc.createdAt ? new Date(jobDoc.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
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
    // 0️⃣ Fetch the job first to check blocking
    const job = await this.jobPostingModel.findById(jobId);
    if (!job) throw new NotFoundException('Job not found.');

    // Check if user is blocked by this job's provider
    const isBlocked = await this.blockingService.isBlocked(job.postedBy.toString(), userId);
    if (isBlocked) {
      throw new ForbiddenException('You have been blocked by this provider and cannot apply to their jobs');
    }

    // 1️⃣ Fetch the user
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    // 2️⃣ Only job seekers can apply
    if (user.role !== 'job_seeker') {
      throw new ForbiddenException('Only job seekers can apply for jobs.');
    }

    // 3️⃣ Ensure profile completeness
    if (!user.skills || user.skills.length === 0) {
      throw new BadRequestException('Please add at least one skill to your profile to apply for jobs.');
    }
    
    if (user.experience === undefined || user.experience === null) {
      throw new BadRequestException('Please add your work experience to your profile to apply for jobs.');
    }
    
    if (!user.education) {
      throw new BadRequestException('Please add your education details to your profile to apply for jobs.');
    }
    
    if (!user.location) {
      throw new BadRequestException('Please add your preferred work location to your profile to apply for jobs.');
    }

    // 4️⃣ Job already fetched above for blocking check

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

    // 9️⃣ Check experience requirement - REMOVED (validation disabled)
    // Note: Experience requirement check removed as per requirements

    // 10️⃣ Check education requirement - REMOVED (validation disabled)
    // Note: Education requirement check removed as per requirements

    // 11️⃣ Check location restriction - REMOVED (validation disabled)
    // Note: Location restriction check removed as per requirements

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
              _id: 1,
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

  async getApplicationDetail(applicationId: string, providerId: string): Promise<any> {
    const application = await this.jobApplyingModel
      .findById(applicationId)
      .populate({
        path: 'appliedBy',
        select: 'first_name last_name email',
      })
      .populate({
        path: 'appliedFor',
        select: '_id jobTitle jobId description workLocation amount shiftStartsAt shiftEndsAt status postedBy',
        populate: {
          path: 'postedBy',
          select: 'first_name last_name email',
        },
      })
      .lean();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const job = application.appliedFor as any;
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify the provider owns this job
    // Handle both populated object and ObjectId
    const jobOwnerId = job.postedBy?._id 
      ? job.postedBy._id.toString() 
      : (job.postedBy ? job.postedBy.toString() : null);
    
    if (!jobOwnerId || jobOwnerId !== providerId) {
      throw new ForbiddenException('You do not have permission to view this application');
    }

    // Format response
    const appliedBy = application.appliedBy as any;
    return {
      applicationId: application._id,
      appId: application.appId,
      status: application.status,
      appliedAt: application.createdAt,
      applicantId: appliedBy?._id,
      applicantName: appliedBy
        ? `${appliedBy.first_name || ''} ${appliedBy.last_name || ''}`.trim()
        : 'N/A',
      applicantEmail: appliedBy?.email || 'N/A',
      jobId: job.jobId,
      jobMongoId: job._id,
      jobTitle: job.jobTitle,
      jobDescription: job.description,
      workLocation: job.workLocation,
      amount: job.amount,
      shiftStartsAt: job.shiftStartsAt,
      shiftEndsAt: job.shiftEndsAt,
      jobStatus: job.status,
    };
  }

  async withdrawApplication(applicationId: string, seekerId: string): Promise<JobApplying> {
    const application = await this.jobApplyingModel.findById(applicationId);
    
    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Verify the application belongs to the seeker
    const applicationSeekerId = application.appliedBy.toString();
    if (applicationSeekerId !== seekerId) {
      throw new ForbiddenException('You can only withdraw your own applications');
    }

    // Check if application can be withdrawn (not already hired or completed)
    if (application.status === 'hired' || application.status === 'completed') {
      throw new BadRequestException('Cannot withdraw a hired or completed application');
    }

    // Delete the application
    await this.jobApplyingModel.findByIdAndDelete(applicationId);

    return application;
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

  /**
   * Update an application with business rules/clauses
   * @param applicationId - The application ID to update
   * @param providerId - The job provider ID (must own the job)
   * @param payload - Update payload (currently only shiftId is allowed)
   * @returns Updated application
   */
  async updateApplication(
    applicationId: string,
    providerId: string,
    payload: { shiftId?: string },
  ): Promise<JobApplying> {
    const application = await this.jobApplyingModel
      .findById(applicationId)
      .populate('appliedFor');

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    const job = application.appliedFor as any;
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // 🚫 Clause 1: Verify the provider owns this job
    const jobOwnerId = job.postedBy?._id
      ? job.postedBy._id.toString()
      : (job.postedBy ? job.postedBy.toString() : null);

    if (!jobOwnerId || jobOwnerId !== providerId) {
      throw new ForbiddenException(
        'You do not have permission to edit this application',
      );
    }

    // 🚫 Clause 2: Cannot edit if application is in final states
    if (
      application.status === JobApplicationAppliedStatus.hired ||
      application.status === JobApplicationAppliedStatus.completed
    ) {
      throw new BadRequestException(
        'Cannot edit application with status: hired or completed',
      );
    }

    // 🚫 Clause 3: Cannot edit if application is rejected
    if (application.status === JobApplicationAppliedStatus.rejected) {
      throw new BadRequestException(
        'Cannot edit a rejected application. Please use approve endpoint to change status.',
      );
    }

    // 🚫 Clause 4: If shiftId is provided, validate it exists and belongs to the job
    if (payload.shiftId) {
      const shift = await this.shiftModel.findById(payload.shiftId);
      if (!shift) {
        throw new NotFoundException('Shift not found');
      }

      // Verify shift belongs to the same job
      if (shift.jobId.toString() !== job._id.toString()) {
        throw new BadRequestException(
          'Shift does not belong to this job',
        );
      }

      // Update shiftId
      application.shiftId = new Types.ObjectId(payload.shiftId);
    }

    await application.save();

    // Populate and return updated application
    const populatedApp = await application.populate([
      { path: 'appliedBy', select: 'first_name last_name email' },
      { path: 'appliedFor', select: 'jobTitle jobId workLocation status' },
      { path: 'shiftId', select: 'startDate endDate startTime endTime' },
    ]);

    return populatedApp;
  }

  /**
   * Update a job with business rules/clauses
   * @param jobId - The job ID to update
   * @param providerId - The job provider ID (must own the job)
   * @param payload - Update payload
   * @returns Updated job
   */
  async update(
    jobId: string,
    providerId: string,
    payload: UpdateJobDto,
  ): Promise<JobPosting> {
    const job = await this.jobPostingModel.findById(jobId);

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // 🚫 Clause 1: Verify the provider owns this job
    const jobOwnerId = job.postedBy?._id
      ? job.postedBy._id.toString()
      : (job.postedBy ? job.postedBy.toString() : null);

    if (!jobOwnerId || jobOwnerId !== providerId) {
      throw new ForbiddenException(
        'You do not have permission to edit this job',
      );
    }

    // 🚫 Clause 2: Prevent update if job is closed
    if (job.status === JobStatus.closed) {
      throw new BadRequestException(
        'This job is closed and cannot be updated',
      );
    }

    // 🚫 Clause 3: Prevent update if job is cancelled
    if (job.status === JobStatus.cancelled) {
      throw new BadRequestException(
        'This job is cancelled and cannot be updated',
      );
    }

    // 🚫 Clause 4: Prevent update if job is ongoing
    if (job.status === JobStatus.ongoing) {
      throw new BadRequestException(
        'This job is ongoing and cannot be updated. Please close or cancel it first.',
      );
    }

    // 🚫 Clause 5: Prevent update if applicants exist (applied, shortlisted, or hired)
    const applicantsCount = await this.jobApplyingModel.countDocuments({
      appliedFor: new Types.ObjectId(jobId),
    });

    if (applicantsCount > 0) {
      // Check if there are hired applicants
      const hiredApplicantsCount = await this.jobApplyingModel.countDocuments({
        appliedFor: new Types.ObjectId(jobId),
        status: JobApplicationAppliedStatus.hired,
      });

      if (hiredApplicantsCount > 0) {
        throw new BadRequestException(
          'Cannot update job with hired applicants. Please complete or cancel shifts first.',
        );
      }

      // Check if there are shortlisted applicants
      const shortlistedCount = await this.jobApplyingModel.countDocuments({
        appliedFor: new Types.ObjectId(jobId),
        status: JobApplicationAppliedStatus.shortlisted,
      });

      if (shortlistedCount > 0) {
        throw new BadRequestException(
          'Cannot update job with shortlisted applicants. Please reject or hire them first.',
        );
      }

      throw new BadRequestException(
        'Applicants have already applied for this job. Cannot update job details. You can only update status or reject all applications first.',
      );
    }

    // 🚫 Clause 6: Prevent update if job has active shifts assigned
    const activeShiftsCount = await this.shiftModel.countDocuments({
      jobId: new Types.ObjectId(jobId),
      status: { $in: ['scheduled', 'in_progress'] },
    });

    if (activeShiftsCount > 0) {
      throw new BadRequestException(
        'Cannot update job with active shifts (scheduled or in progress). Please complete or cancel shifts first.',
      );
    }

    // ✅ Allow update for draft jobs or active jobs with no applicants/shifts
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

  /**
   * Get a single seeker detail by seekerId and optional applicationId
   * @param listerId - The ID of the lister (job provider)
   * @param seekerId - The seeker ID
   * @param applicationId - Optional application ID to filter by specific application
   * @returns Seeker detail with job, application, and shift information
   */
  async getSeekerDetail(
    listerId: string,
    seekerId: string,
    applicationId?: string,
  ) {
    try {
      // Step 1: Find all jobs created by the lister
      const jobs = await this.jobPostingModel.find({
        postedBy: new Types.ObjectId(listerId)
      });

      if (jobs.length === 0) {
        throw new NotFoundException('No jobs found for this provider');
      }

      const jobIds = jobs.map(job => job._id);

      // Step 2: Find applications for these jobs
      const applicationQuery: any = {
        appliedFor: { $in: jobIds },
        appliedBy: new Types.ObjectId(seekerId),
      };

      if (applicationId) {
        applicationQuery._id = new Types.ObjectId(applicationId);
      }

      const applications = await this.jobApplyingModel
        .find(applicationQuery)
        .populate('appliedBy')
        .lean();

      if (applications.length === 0) {
        throw new NotFoundException('Application not found or seeker not found');
      }

      // Step 3: Get the seeker data from the first application
      const application = applications[0];
      const seeker = application.appliedBy as any;

      if (!seeker) {
        throw new NotFoundException('Seeker not found');
      }

      // Step 4: Find matching job
      const job = jobs.find(j => j._id.toString() === application.appliedFor.toString());

      // Step 5: Find shifts for the specific job that this seeker is assigned to
      const shifts = await this.shiftModel.find({
        jobId: new Types.ObjectId(application.appliedFor),
        assignees: new Types.ObjectId(seekerId),
      }).lean();

      // Find the shift for this specific application/job combination
      const shift = shifts.length > 0 ? shifts[0] : null;

      // Step 6: Format response
      return {
        seekerId: seeker._id.toString(),
        seekerName: `${seeker.first_name} ${seeker.last_name}`,
        seekerEmail: seeker.email,
        seekerPhone: seeker.phone_number,
        seekerRole: seeker.role,
        // Job details
        jobId: job?.jobId || job?._id?.toString() || job?._id,
        jobMongoId: job?._id?.toString() || job?._id,
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
        appliedAt: application.createdAt,
        applicationStatus: application.status,
        applicationId: application.appId || application._id.toString(),
        applicationMongoId: application._id.toString(),
        // Shift details (if assigned)
        shiftId: shift?.shiftId || shift?._id?.toString() || shift?._id || null,
        shiftMongoId: shift?._id?.toString() || shift?._id || null,
        shiftStartDate: shift?.startDate ? new Date(shift.startDate).toISOString() : null,
        shiftEndDate: shift?.endDate ? new Date(shift.endDate).toISOString() : null,
        shiftStartTime: shift?.startTime || null,
        shiftEndTime: shift?.endTime || null,
        shiftStatus: shift?.status || null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('🔍 Debug: Error in getSeekerDetail:', error);
      throw new Error('Failed to fetch seeker detail');
    }
  }
}
