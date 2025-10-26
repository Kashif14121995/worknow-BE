import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Shift, JobApplying, JobPosting } from 'src/schemas';
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
}


