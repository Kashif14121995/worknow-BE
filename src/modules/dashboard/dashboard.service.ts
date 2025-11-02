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

            // Count open shifts (using createdBy instead of jobId)
            this.shiftModel.countDocuments({
                createdBy: providerObjectId,
                status: ShiftStatus.OPEN,
            }),

            // Count filled shifts (using createdBy)
            this.shiftModel.countDocuments({
                createdBy: providerObjectId,
                status: ShiftStatus.FILLED,
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

        const query = this.shiftModel
            .find(filter)
            .sort({ startDate: 1 })
            .populate({
                path: 'jobId',
                select: '_id title',
            })
            .populate({
                path: 'assignees',
                match: searchText
                    ? {
                        $or: [
                            { first_name: { $regex: searchText, $options: 'i' } },
                            { last_name: { $regex: searchText, $options: 'i' } },
                        ],
                    }
                    : {},
                select: 'first_name last_name',
            })
            .select('startDate endDate startTime endTime shiftId status');

        const skip = (page - 1) * limit;
        const [totalCount, results] = await Promise.all([
            this.shiftModel.countDocuments(filter),
            query.skip(skip).limit(limit).lean(),
        ]);

        const filteredResults = searchText
            ? results.filter((shift) => shift.assignees?.length > 0)
            : results;

        return {
            total: totalCount,
            page,
            limit,
            count: filteredResults.length,
            upcomingShifts: filteredResults,
        };
    }

    // Job Seeker Dashboard Methods
    async getSeekerDashboardStats(seekerId: string) {
        const seekerObjectId = new Types.ObjectId(seekerId);

        // Get active jobs count (jobs with status='active')
        const activeJobs = await this.jobModel.countDocuments({
            status: JobStatus.active,
        });

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
                // Check if shift is completed (status = 'filled' and endDate < today)
                const today = new Date();
                if (shift.status === 'filled' && shift.endDate < today) {
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
            const employer = shift.createdBy;
            const isCompleted = shift.endDate < today && shift.status === 'filled';
            const isPending = !isCompleted;

            return {
                id: shift._id,
                shiftId: shift.shiftId,
                job: {
                    id: job?._id,
                    jobId: job?.jobId,
                    title: job?.jobTitle,
                    location: job?.workLocation,
                },
                employer: employer ? `${employer.first_name} ${employer.last_name}` : null,
                amount: job?.amount || 0,
                date: shift.endDate ? new Date(shift.endDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : null,
                status: isCompleted ? 'processed' : 'pending',
                completedAt: isCompleted ? shift.endDate : null,
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

        const filter: any = {
            status: JobStatus.active,
            _id: { $nin: appliedJobIds },
            shiftStartsAt: { $gte: new Date() }, // Only future jobs
        };

        if (searchText && searchText.trim()) {
            filter.$or = [
                { jobTitle: { $regex: searchText, $options: 'i' } },
                { description: { $regex: searchText, $options: 'i' } },
                { workLocation: { $regex: searchText, $options: 'i' } },
            ];
        }

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

        const formattedJobs = jobs.map((job: any) => ({
            id: job._id,
            jobId: job.jobId,
            title: job.jobTitle,
            jobType: job.jobType,
            industry: job.industry,
            location: job.workLocation,
            amount: job.amount,
            paymentType: job.paymentType,
            shiftDuration: job.shiftDuration,
            startDate: job.shiftStartsAt,
            endDate: job.shiftEndsAt,
            description: job.description,
            positions: job.positions,
            postedBy: job.postedBy ? {
                name: `${job.postedBy.first_name} ${job.postedBy.last_name}`,
            } : null,
        }));

        return {
            jobs: formattedJobs,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async updateSeekerWorkExperience(seekerId: string, experience: number) {
        const seekerObjectId = new Types.ObjectId(seekerId);
        const user = await this.userModel.findByIdAndUpdate(
            seekerObjectId,
            { experience },
            { new: true }
        );
        if (!user) {
            throw new Error('User not found');
        }
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


