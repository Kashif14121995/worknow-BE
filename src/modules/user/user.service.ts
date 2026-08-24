import { Injectable, ForbiddenException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument, RefreshToken, RefreshTokenDocument } from 'src/schemas';
import { Model, Types } from 'mongoose';
import { BcryptService } from '../bcrypt/bcrypt.service';
import { PublicDeleteAccountDto } from './dto/delete-account.dto';
import { UserRole } from 'src/constants';

@Injectable()
export class UserService {
  private bcryptService: BcryptService = new BcryptService();

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async updateProfile(userId: string, updates: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: number;
    location?: string;
    skills?: string[];
    education?: string;
    experience?: number;
  }) {
    // Check if email is being updated and if it's already taken
    if (updates.email) {
      const existingUser = await this.userModel.findOne({
        email: updates.email,
        _id: { $ne: userId },
      });

      if (existingUser) {
        throw new BadRequestException('Email is already in use');
      }
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true },
    ).select('-password -otp -otp_expires_after');

    if (!updatedUser) {
      throw new BadRequestException('User not found');
    }

    return updatedUser;
  }

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId)
      .select('-password -otp -otp_expires_after -passwordResetToken -passwordResetTokenExpires')
      .lean();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async deleteAccount(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.role === UserRole.admin) {
      throw new ForbiddenException('Cannot delete admin user');
    }

    if (user.isDeleted) {
      throw new BadRequestException('Account is already deleted');
    }

    // Soft delete: set flags and prefix email to allow future registration
    await this.userModel.findByIdAndUpdate(userId, {
      isDeleted: true,
      deletedAt: new Date(),
      email: `deleted_${user._id}_${user.email}`,
    });

    // Revoke/Delete refresh tokens
    await this.refreshTokenModel.deleteMany({ userId: new Types.ObjectId(userId) });

    return { message: 'Account removed successfully' };
  }

  async deleteAccountPublic(dto: PublicDeleteAccountDto) {
    const filter: any = {
      email: dto.email.toLowerCase().trim(),
      isDeleted: { $ne: true },
    };

    if (dto.role) {
      filter.role = dto.role;
    }

    const user = await this.userModel.findOne(filter);
    if (!user) {
      throw new BadRequestException('Invalid email or user not found');
    }

    if (user.role === UserRole.admin) {
      throw new ForbiddenException('Cannot delete admin user');
    }

    const isPasswordValid = await this.bcryptService.comparePassword(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return await this.deleteAccount(user._id.toString());
  }
}

