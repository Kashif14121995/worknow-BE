import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/schemas';
import { Model } from 'mongoose';
import { BcryptService } from '../bcrypt/bcrypt.service';

@Injectable()
export class UserService {
  private bcryptService: BcryptService = new BcryptService();

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
}

