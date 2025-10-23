import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shift } from '../shift/schemas/shift.schema/shift.schema';
import { JobApplying, JobPosting } from 'src/schemas/job.schema';
import { JobStatus } from 'src/constants';
import { ShiftStatus } from '../shift/dto/update-shift.dto/update-shift.dto';

@Injectable()
export class DashboardService {
    constructor(
        @InjectModel(JobPosting.name) private readonly jobModel: Model<JobPosting>,
        @InjectModel(JobApplying.name) private readonly applicationModel: Model<JobApplying>,
        @InjectModel(Shift.name) private readonly shiftModel: Model<Shift>,
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
            upcomingShifts,
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

            // Fetch upcoming shifts for this provider (using createdBy)
            this.shiftModel
            .find({
                createdBy: providerObjectId,
                startDate: { $lte: fifteenDaysFromNow },
            })
            .sort({ startDate: 1 })
            .populate({
                path: 'jobId',
                select: '_id',
            })
            .populate({
                path: 'assignees',
                select: 'first_name last_name',
            })
            .select('startDate endDate startTime endTime shiftId')
            .lean()
        ]);

        return {
            activeJobs,
            totalApplications,
            hiredWorkers: {
                activeShifts,
                inactiveShifts,
            },
            upcomingShifts,
        };
    }
}
