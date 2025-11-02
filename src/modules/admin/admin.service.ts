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
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    // Check role - handle both string comparison and enum comparison
    const userRole = user.role?.toString().toLowerCase();
    const adminRole = UserRole.admin?.toString().toLowerCase();
    if (userRole !== adminRole) {
      console.error(`Admin access denied. User role: "${user.role}", Required: "${UserRole.admin}"`);
      throw new ForbiddenException(`Admin access required. Current role: ${user.role}`);
    }
    return user;
  }

  // User Management
  async getAllUsers(page: number = 1, limit: number = 20, role?: UserRole, searchText?: string) {
    const skip = (page - 1) * limit;
    const filter: any = {
      role: { $ne: UserRole.admin }, // Exclude admin users
      isDeleted: { $ne: true }, // Exclude soft-deleted users
    };

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
    const user = await this.userModel.findOne({
      _id: userId,
      isDeleted: { $ne: true }, // Exclude soft-deleted users
    })
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

    // Prevent changing role to admin
    if (newRole === UserRole.admin) {
      throw new ForbiddenException('Cannot assign admin role. Admin role can only be set during user creation.');
    }

    // Check if user is already admin
    const existingUser = await this.userModel.findById(userId);
    if (!existingUser) {
      throw new ForbiddenException('User not found');
    }

    // Prevent changing admin role
    if (existingUser.role === UserRole.admin) {
      throw new ForbiddenException('Cannot change admin role');
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

  async blockUser(userId: string, reason?: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Prevent blocking admin
    if (user.role === UserRole.admin) {
      throw new ForbiddenException('Cannot block admin user');
    }

    const blockedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { isBlocked: true, blockReason: reason },
      { new: true },
    ).select('-password -otp -otp_expires_after');

    return blockedUser;
  }

  async unblockUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new ForbiddenException('User not found');
    }

    const unblockedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { isBlocked: false, blockReason: null },
      { new: true },
    ).select('-password -otp -otp_expires_after');

    return unblockedUser;
  }

  async deleteUser(userId: string) {
    // Check if user is admin
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new ForbiddenException('User not found');
    }
    
    if (user.role === UserRole.admin) {
      throw new ForbiddenException('Cannot delete admin user');
    }

    // Soft delete: mark as deleted instead of actually deleting
    const deletedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { 
        isDeleted: true, 
        deletedAt: new Date(),
        email: `deleted_${user._id}_${user.email}`, // Make email unique by prefixing
      },
      { new: true },
    ).select('-password -otp -otp_expires_after');

    if (!deletedUser) {
      throw new ForbiddenException('User not found');
    }

    return { message: 'User deleted successfully', user: deletedUser };
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
    // Exclude admin users and soft-deleted users from stats
    const userFilter = {
      role: { $ne: UserRole.admin },
      isDeleted: { $ne: true },
    };

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
      this.userModel.countDocuments(userFilter),
      this.userModel.countDocuments({ ...userFilter, role: UserRole.job_seeker }),
      this.userModel.countDocuments({ ...userFilter, role: UserRole.job_provider }),
      this.jobPostingModel.countDocuments(),
      this.jobPostingModel.countDocuments({ status: JobStatus.active }),
      this.jobApplyingModel.countDocuments(),
      this.userModel.countDocuments({
        ...userFilter,
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

