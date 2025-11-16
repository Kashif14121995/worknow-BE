import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shift, JobApplying, JobPosting, User } from 'src/schemas';
import { JobStatus, JobApplicationAppliedStatus } from 'src/constants';
import { ShiftStatus } from '../shift/dto/update-shift.dto/update-shift.dto';

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(JobPosting.name) private readonly jobModel: Model<JobPosting>,
        @InjectModel(JobApplying.name) private readonly applicationModel: Model<JobApplying>,
        @InjectModel(Shift.name) private readonly shiftModel: Model<Shift>,
        @InjectModel(User.name) private readonly userModel: Model<User>,
    ) { }

    async getProviderDashboardStats(providerId: string) {
        const today = new Date();
        const fifteenDaysFromNow = new Date();
        fifteenDaysFromNow.setDate(today.getDate() + 15);
        const providerObjectId = new Types.ObjectId(providerId);
        // Step 1: Get all Job IDs posted by this provider
        const jobIds = await this.jobModel
            .find({ postedBy: providerObjectId })
            .distinct('_id');

        // Step 2: Parallel queries
        const [
            activeJobs,
            totalApplications,
            activeShifts,
            inactiveShifts,
        ] = await Promise.all([
            // Active Jobs
            this.jobModel.countDocuments({
                postedBy: providerObjectId,
                status: JobStatus.active,
            }),

            // Applications for jobs by this provider
            this.applicationModel.countDocuments({
                appliedFor: { $in: jobIds },
            }),

            // Count scheduled shifts (using createdBy instead of jobId)
            this.shiftModel.countDocuments({
                createdBy: providerObjectId,
                status: ShiftStatus.SCHEDULED,
            }),

            // Count completed shifts (using createdBy)
            this.shiftModel.countDocuments({
                createdBy: providerObjectId,
                status: ShiftStatus.COMPLETED,
            }),
        ]);

        return {
            activeJobs,
            totalApplications,
            hiredWorkers: {
                activeShifts,
                inactiveShifts,
            },
        };
    }
    async getUpcomingShifts(providerId: string, searchText?: string, page = 1, limit = 10) {
        const today = new Date();
        const fifteenDaysFromNow = new Date();
        fifteenDaysFromNow.setDate(today.getDate() + 15);

        const providerObjectId = new Types.ObjectId(providerId);

        const filter: any = {
            createdBy: providerObjectId,
            startDate: { $lte: fifteenDaysFromNow },
        };

        let totalCount: number;
        let results: any[];

        if (searchText && searchText.trim()) {
            // Use aggregation to properly count filtered results
            const aggregationPipeline: any[] = [
                { $match: filter },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'assignees',
                        foreignField: '_id',
                        as: 'assigneesData',
                    },
                },
                {
                    $match: {
                        'assigneesData': {
                            $elemMatch: {
                                $or: [
                                    { first_name: { $regex: searchText, $options: 'i' } },
                                    { last_name: { $regex: searchText, $options: 'i' } },
                                ],
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: 'jobpostings',
                        localField: 'jobId',
                        foreignField: '_id',
                        as: 'jobData',
                    },
                },
                { $unwind: { path: '$jobData', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        startDate: 1,
                        endDate: 1,
                        startTime: 1,
                        endTime: 1,
                        shiftId: 1,
                        status: 1,
                        jobId: { 
                            _id: '$jobData._id',
                            title: '$jobData.title'
                        },
                        assignees: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: '$assigneesData',
                                        as: 'assignee',
                                        cond: {
                                            $or: [
                                                { $regexMatch: { input: '$$assignee.first_name', regex: searchText, options: 'i' } },
                                                { $regexMatch: { input: '$$assignee.last_name', regex: searchText, options: 'i' } },
                                            ],
                                        },
                                    },
                                },
                                as: 'assignee',
                                in: {
                                    _id: '$$assignee._id',
                                    first_name: '$$assignee.first_name',
                                    last_name: '$$assignee.last_name',
                                },
                            },
                        },
                    },
                },
            ];

            const [countResult, dataResult] = await Promise.all([
                this.shiftModel.aggregate([
                    ...aggregationPipeline,
                    { $count: 'total' },
                ]),
                this.shiftModel.aggregate([
                    ...aggregationPipeline,
                    { $sort: { startDate: 1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit },
                ]),
            ]);

            totalCount = countResult[0]?.total || 0;
            results = dataResult;
        } else {
            // No search text - use simpler query
            const query = this.shiftModel
                .find(filter)
                .sort({ startDate: 1 })
                .populate({
                    path: 'jobId',
                    select: '_id title',
                })
                .populate({
                    path: 'assignees',
                    select: 'first_name last_name',
                })
                .select('startDate endDate startTime endTime shiftId status');

            const skip = (page - 1) * limit;
            [totalCount, results] = await Promise.all([
                this.shiftModel.countDocuments(filter),
                query.skip(skip).limit(limit).lean(),
            ]);
        }

        const totalPages = Math.ceil(totalCount / limit);

        return {
            upcomingShifts: results,
            total: totalCount,
            limit,
            page,
            totalPages,
        };
    }

    // Job Seeker Dashboard Methods
    async getSeekerDashboardStats(seekerId: string) {
        const seekerObjectId = new Types.ObjectId(seekerId);

        // Get active jobs count - jobs the seeker has applied to that are still active
        const applicationsWithActiveJobs = await this.applicationModel
            .find({
                appliedBy: seekerObjectId,
            })
            .populate({
                path: 'appliedFor',
                select: '_id status',
            })
            .lean();

        // Count distinct active jobs from applications
        const activeJobIds = new Set();
        applicationsWithActiveJobs.forEach((app: any) => {
            // Check if application has a job and the job is active
            if (app.appliedFor && 
                app.appliedFor._id && 
                app.appliedFor.status === JobStatus.active) {
                activeJobIds.add(app.appliedFor._id.toString());
            }
        });
        const activeJobs = activeJobIds.size;

        // Get total applications by this seeker
        const totalApplications = await this.applicationModel.countDocuments({
            appliedBy: seekerObjectId,
        });

        // Get earnings breakdown
        // Get all shifts assigned to this seeker
        const assignedShifts = await this.shiftModel.find({
            assignees: seekerObjectId,
        }).populate('jobId');

        let totalExpenditure = 0;
        let processed = 0;
        let pending = 0;

        for (const shift of assignedShifts) {
            const job = shift.jobId as any;
            if (job && job.amount) {
                totalExpenditure += job.amount;
                // Check if shift is completed (status = 'completed')
                const today = new Date();
                if (shift.status === 'completed') {
                    processed += job.amount;
                } else {
                    pending += job.amount;
                }
            }
        }

        // Get user to check setup progress
        const user = await this.userModel.findById(seekerObjectId);
        const setupProgress = {
            totalSteps: 4,
            completedSteps: 0,
            steps: [
                {
                    name: 'Add Work Experience',
                    completed: !!(user?.experience || (user?.experience === 0)),
                },
                {
                    name: 'Set Availability',
                    completed: !!user?.skills && user.skills.length > 0, // Using skills as proxy for availability
                },
                {
                    name: 'Set Preferred Work Locations',
                    completed: !!user?.location,
                },
                {
                    name: 'Upload Identity',
                    completed: false, // Identity upload not in schema yet
                },
            ],
        };

        setupProgress.completedSteps = setupProgress.steps.filter(s => s.completed).length;

        // Get earnings from payment service if available
        let earningsData = {
            totalExpenditure,
            processed,
            pending,
        };

        // Try to get from payment service (if payment module is available)
        try {
            // Dynamic import to avoid circular dependency
            const { PaymentService } = await import('../payment/payment.service');
            // Note: This requires PaymentService to be injected via module
            // For now, we'll use the calculated values
        } catch (error) {
            // Payment service not available, use calculated values
        }

        return {
            activeJobs,
            totalApplications,
            earnings: earningsData,
            setupProgress,
        };
    }

    async getRecommendedGigs(seekerId: string, page: number = 1, limit: number = 10, searchText?: string, timeframe?: string) {
        const skip = (page - 1) * limit;
        const seekerObjectId = new Types.ObjectId(seekerId);

        // Get seeker's applications to exclude already applied jobs
        const appliedJobIds = await this.applicationModel
            .find({ appliedBy: seekerObjectId })
            .distinct('appliedFor');

        // Build filter
        const filter: any = {
            status: JobStatus.active,
            _id: { $nin: appliedJobIds }, // Exclude already applied jobs
        };

        // Add search filter
        if (searchText && searchText.trim()) {
            filter.$or = [
                { jobTitle: { $regex: searchText, $options: 'i' } },
                { description: { $regex: searchText, $options: 'i' } },
            ];
        }

        // Add timeframe filter
        const today = new Date();
        if (timeframe && timeframe !== 'All-time') {
            if (timeframe === 'Today') {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                filter.shiftStartsAt = { $gte: today, $lt: tomorrow };
            } else if (timeframe === 'This Week') {
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);
                filter.shiftStartsAt = { $gte: today, $lt: nextWeek };
            } else if (timeframe === 'This Month') {
                const nextMonth = new Date(today);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                filter.shiftStartsAt = { $gte: today, $lt: nextMonth };
            }
        }

        const [gigs, total] = await Promise.all([
            this.jobModel
                .find(filter)
                .populate('postedBy', 'first_name last_name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.jobModel.countDocuments(filter),
        ]);

        // Format response similar to screenshot
        const formattedGigs = gigs.map((gig: any) => ({
            id: gig._id,
            title: gig.jobTitle,
            date: gig.shiftStartsAt ? new Date(gig.shiftStartsAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : null,
            status: gig.status === JobStatus.active ? 'Confirmed' : gig.status,
            postedBy: gig.postedBy ? `${gig.postedBy.first_name} ${gig.postedBy.last_name}` : null,
        }));

        return {
            gigs: formattedGigs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getSeekerApplications(seekerId: string, page: number = 1, limit: number = 10, status?: string) {
        const skip = (page - 1) * limit;
        const seekerObjectId = new Types.ObjectId(seekerId);

        const filter: any = {
            appliedBy: seekerObjectId,
        };

        if (status && status.trim()) {
            filter.status = status;
        }

        const [applications, total] = await Promise.all([
            this.applicationModel
                .find(filter)
                .populate({
                    path: 'appliedFor',
                    select: 'jobTitle jobId shiftStartsAt shiftEndsAt amount workLocation status jobType industry',
                })
                .populate({
                    path: 'appliedFor',
                    populate: {
                        path: 'postedBy',
                        select: 'first_name last_name email',
                    },
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.applicationModel.countDocuments(filter),
        ]);

        const formattedApplications = applications.map((app: any) => ({
            id: app._id,
            applicationId: app.appId,
            job: {
                id: app.appliedFor?._id,
                jobId: app.appliedFor?.jobId,
                title: app.appliedFor?.jobTitle,
                jobType: app.appliedFor?.jobType,
                industry: app.appliedFor?.industry,
                location: app.appliedFor?.workLocation,
                amount: app.appliedFor?.amount,
                startDate: app.appliedFor?.shiftStartsAt,
                endDate: app.appliedFor?.shiftEndsAt,
                status: app.appliedFor?.status,
                postedBy: app.appliedFor?.postedBy ? {
                    name: `${app.appliedFor.postedBy.first_name} ${app.appliedFor.postedBy.last_name}`,
                    email: app.appliedFor.postedBy.email,
                } : null,
            },
            applicationStatus: app.status,
            appliedAt: app.createdAt,
        }));

        return {
            applications: formattedApplications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getSeekerEarningsDetail(seekerId: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;
        const seekerObjectId = new Types.ObjectId(seekerId);
        const today = new Date();

        // Get all shifts assigned to this seeker
        const shifts = await this.shiftModel
            .find({
                assignees: seekerObjectId,
            })
            .populate({
                path: 'jobId',
                select: 'jobTitle jobId amount workLocation',
            })
            .populate({
                path: 'createdBy',
                select: 'first_name last_name',
            })
            .sort({ endDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalShifts = await this.shiftModel.countDocuments({
            assignees: seekerObjectId,
        });

        const earningsDetail = shifts.map((shift: any) => {
            const job = shift.jobId;
            const isCompleted = shift.status === 'completed';

            return {
                _id: shift._id?.toString() || shift._id,
                shiftId: {
                    _id: shift._id?.toString() || shift.shiftId || shift._id,
                    startDate: shift.startDate ? new Date(shift.startDate).toISOString() : null,
                    endDate: shift.endDate ? new Date(shift.endDate).toISOString() : null,
                    startTime: shift.startTime || null,
                    endTime: shift.endTime || null,
                },
                jobId: {
                    _id: job?._id?.toString() || job?._id || '',
                    jobTitle: job?.jobTitle || 'N/A',
                },
                amount: job?.amount || 0,
                status: isCompleted ? 'processed' : 'pending',
                createdAt: shift.endDate ? new Date(shift.endDate).toISOString() : new Date().toISOString(),
            };
        });

        return {
            earnings: earningsDetail,
            total: totalShifts,
            page,
            limit,
            totalPages: Math.ceil(totalShifts / limit),
        };
    }

    async getActiveJobsForSeeker(seekerId: string, page: number = 1, limit: number = 10, searchText?: string) {
        const skip = (page - 1) * limit;
        const seekerObjectId = new Types.ObjectId(seekerId);

        // Get seeker's applications to exclude already applied jobs
        const appliedJobIds = await this.applicationModel
            .find({ appliedBy: seekerObjectId })
            .distinct('appliedFor');

        // Build filter - similar to getRecommendedGigs, no date filter by default
        const filter: any = {
            status: JobStatus.active,
        };

        // Only exclude applied jobs if there are any
        if (appliedJobIds && appliedJobIds.length > 0) {
            filter._id = { $nin: appliedJobIds };
        }

        // Add search filter
        if (searchText && searchText.trim()) {
            filter.$or = [
                { jobTitle: { $regex: searchText, $options: 'i' } },
                { description: { $regex: searchText, $options: 'i' } },
                { workLocation: { $regex: searchText, $options: 'i' } },
            ];
        }

        // Debug logging
        console.log('getActiveJobsForSeeker - Filter:', JSON.stringify(filter, null, 2));
        console.log('getActiveJobsForSeeker - Applied Job IDs:', appliedJobIds);

        const [jobs, total] = await Promise.all([
            this.jobModel
                .find(filter)
                .populate('postedBy', 'first_name last_name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            this.jobModel.countDocuments(filter),
        ]);

        console.log('getActiveJobsForSeeker - Found jobs:', jobs.length, 'Total:', total);

        const formattedJobs = jobs.map((job: any) => ({
            _id: job._id.toString(),
            jobTitle: job.jobTitle,
            jobDescription: job.description || '',
            jobAmount: job.amount || 0,
            jobPaymentType: job.paymentType || '',
            jobWorkLocation: job.workLocation || '',
            jobIndustry: job.industry || '',
            jobType: job.jobType || '',
            jobRequiredSkills: job.requiredSkills || [],
            createdAt: job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString(),
        }));

        return {
            recommendedGigs: formattedJobs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async updateSeekerWorkExperience(seekerId: string, experience: number) {
        const seekerObjectId = new Types.ObjectId(seekerId);
        // Ensure experience is a valid number (0 is valid for freshers)
        const experienceValue = typeof experience === 'number' && experience >= 0 ? experience : 0;
        const user = await this.userModel.findByIdAndUpdate(
            seekerObjectId,
            { experience: experienceValue },
            { new: true }
        );
        if (!user) {
            throw new Error('User not found');
        }
        console.log(`Updated user ${seekerId} experience to: ${user.experience}`);
        return { experience: user.experience };
    }

    async updateSeekerAvailability(seekerId: string, skills: string[]) {
        const seekerObjectId = new Types.ObjectId(seekerId);
        const user = await this.userModel.findByIdAndUpdate(
            seekerObjectId,
            { skills },
            { new: true }
        );
        if (!user) {
            throw new Error('User not found');
        }
        return { skills: user.skills };
    }

    async updateSeekerWorkLocation(seekerId: string, location: string) {
        const seekerObjectId = new Types.ObjectId(seekerId);
        const user = await this.userModel.findByIdAndUpdate(
            seekerObjectId,
            { location },
            { new: true }
        );
        if (!user) {
            throw new Error('User not found');
        }
        return { location: user.location };
    }

    async updateSeekerEducation(seekerId: string, education: string) {
        const seekerObjectId = new Types.ObjectId(seekerId);
        const user = await this.userModel.findByIdAndUpdate(
            seekerObjectId,
            { education },
            { new: true }
        );
        if (!user) {
            throw new Error('User not found');
        }
        console.log(`Updated user ${seekerId} education to: ${user.education}`);
        return { education: user.education };
    }

    async updateSeekerIdentity(seekerId: string, identityDocument: string) {
        // Note: Identity document field might need to be added to User schema
        // For now, we'll store it in a placeholder or you can extend the schema
        const seekerObjectId = new Types.ObjectId(seekerId);
        const user = await this.userModel.findById(seekerObjectId);
        if (!user) {
            throw new Error('User not found');
        }
        // Since identityDocument is not in schema yet, you might want to add it
        // For now, return success
        return { identityDocument, message: 'Identity document updated (field needs to be added to schema)' };
    }
}


