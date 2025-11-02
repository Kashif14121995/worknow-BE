import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BlockedUser,
  BlockedUserDocument,
  User,
  UserDocument,
  BlockReason,
} from 'src/schemas';
import { UserRole } from 'src/constants';

@Injectable()
export class BlockingService {
  constructor(
    @InjectModel(BlockedUser.name) private blockedUserModel: Model<BlockedUserDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Block a worker from applying to provider's jobs
   */
  async blockWorker(
    listerId: string,
    seekerId: string,
    reason: BlockReason,
    description?: string,
  ): Promise<BlockedUser> {
    // Verify lister is a provider
    const lister = await this.userModel.findById(listerId);
    if (!lister || lister.role !== UserRole.job_provider) {
      throw new ForbiddenException('Only job providers can block workers');
    }

    // Verify seeker is a worker
    const seeker = await this.userModel.findById(seekerId);
    if (!seeker || seeker.role !== UserRole.job_seeker) {
      throw new BadRequestException('Invalid worker ID');
    }

    // Check if already blocked
    const existingBlock = await this.blockedUserModel.findOne({
      listerId: new Types.ObjectId(listerId),
      seekerId: new Types.ObjectId(seekerId),
      isActive: true,
    });

    if (existingBlock) {
      throw new BadRequestException('Worker is already blocked');
    }

    // Deactivate any existing blocks (shouldn't happen, but just in case)
    await this.blockedUserModel.updateMany(
      {
        listerId: new Types.ObjectId(listerId),
        seekerId: new Types.ObjectId(seekerId),
      },
      { isActive: false },
    );

    // Create new block
    const blockedUser = await this.blockedUserModel.create({
      listerId: new Types.ObjectId(listerId),
      seekerId: new Types.ObjectId(seekerId),
      reason,
      description,
      isActive: true,
    });

    return blockedUser;
  }

  /**
   * Unblock a worker
   */
  async unblockWorker(blockId: string, adminId?: string): Promise<BlockedUser> {
    const block = await this.blockedUserModel.findById(blockId);
    if (!block) {
      throw new NotFoundException('Block record not found');
    }

    block.isActive = false;
    if (adminId) {
      block.unblockedBy = new Types.ObjectId(adminId);
    }
    block.unblockedAt = new Date();
    await block.save();

    return block;
  }

  /**
   * Check if worker is blocked by provider
   */
  async isBlocked(listerId: string, seekerId: string): Promise<boolean> {
    const block = await this.blockedUserModel.findOne({
      listerId: new Types.ObjectId(listerId),
      seekerId: new Types.ObjectId(seekerId),
      isActive: true,
    });

    return !!block;
  }

  /**
   * Get blocked workers for a provider
   */
  async getBlockedWorkers(listerId: string): Promise<BlockedUser[]> {
    return this.blockedUserModel
      .find({
        listerId: new Types.ObjectId(listerId),
        isActive: true,
      })
      .populate('seekerId', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Get all blocks (for admin)
   */
  async getAllBlocks(page: number = 1, limit: number = 20): Promise<{
    blocks: BlockedUser[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const [blocks, total] = await Promise.all([
      this.blockedUserModel
        .find()
        .populate('listerId', 'first_name last_name email')
        .populate('seekerId', 'first_name last_name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.blockedUserModel.countDocuments(),
    ]);

    return {
      blocks: blocks as BlockedUser[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

