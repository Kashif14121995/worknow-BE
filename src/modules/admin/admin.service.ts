import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from 'src/schemas';
import { JobPosting, JobPostingDocument } from 'src/schemas';
import { JobApplying, JobApplyingDocument } from 'src/schemas';
import { UserRole, JobStatus } from 'src/constants';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPostingDocument>,
    @InjectModel(JobApplying.name) private jobApplyingModel: Model<JobApplyingDocument>,
  ) {}

  // Verify admin access
  async verifyAdmin(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user || user.role !== UserRole.admin) {
      throw new ForbiddenException('Admin access required');
    }
    return user;
  }

  // User Management
  async getAllUsers(page: number = 1, limit: number = 20, role?: UserRole, searchText?: string) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (searchText) {
      filter.$or = [
        { email: { $regex: searchText, $options: 'i' } },
        { first_name: { $regex: searchText, $options: 'i' } },
        { last_name: { $regex: searchText, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -otp -otp_expires_after -passwordResetToken -passwordResetTokenExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.userModel.findById(userId)
      .select('-password -otp -otp_expires_after -passwordResetToken -passwordResetTokenExpires')
      .lean();

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    return user;
  }

  async updateUserRole(userId: string, newRole: UserRole) {
    if (!Object.values(UserRole).includes(newRole)) {
      throw new ForbiddenException('Invalid role');
    }

    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true },
    ).select('-password -otp -otp_expires_after');

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    return user;
  }

  async deleteUser(userId: string) {
    const result = await this.userModel.findByIdAndDelete(userId);
    if (!result) {
      throw new ForbiddenException('User not found');
    }
    return { message: 'User deleted successfully' };
  }

  // Job Management
  async getAllJobs(page: number = 1, limit: number = 20, status?: JobStatus, searchText?: string) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (searchText) {
      filter.$or = [
        { jobTitle: { $regex: searchText, $options: 'i' } },
        { description: { $regex: searchText, $options: 'i' } },
      ];
    }

    const [jobs, total] = await Promise.all([
      this.jobPostingModel
        .find(filter)
        .populate('postedBy', 'first_name last_name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.jobPostingModel.countDocuments(filter),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateJobStatus(jobId: string, status: JobStatus) {
    if (!Object.values(JobStatus).includes(status)) {
      throw new ForbiddenException('Invalid status');
    }

    const job = await this.jobPostingModel.findByIdAndUpdate(
      jobId,
      { status },
      { new: true },
    ).populate('postedBy', 'first_name last_name email');

    if (!job) {
      throw new ForbiddenException('Job not found');
    }

    return job;
  }

  async deleteJob(jobId: string) {
    const result = await this.jobPostingModel.findByIdAndDelete(jobId);
    if (!result) {
      throw new ForbiddenException('Job not found');
    }
    return { message: 'Job deleted successfully' };
  }

  // Platform Statistics
  async getPlatformStats() {
    const [
      totalUsers,
      totalSeekers,
      totalProviders,
      totalJobs,
      activeJobs,
      totalApplications,
      todayRegistrations,
      todayJobs,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: UserRole.job_seeker }),
      this.userModel.countDocuments({ role: UserRole.job_provider }),
      this.jobPostingModel.countDocuments(),
      this.jobPostingModel.countDocuments({ status: JobStatus.active }),
      this.jobApplyingModel.countDocuments(),
      this.userModel.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      this.jobPostingModel.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        seekers: totalSeekers,
        providers: totalProviders,
        todayRegistrations,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        todayJobs,
      },
      applications: {
        total: totalApplications,
      },
    };
  }
}

