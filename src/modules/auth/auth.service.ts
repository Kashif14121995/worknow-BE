import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, RefreshToken } from 'src/schemas';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import {
  CreateUserDto,
  ForgotPasswordDto,
  LoginUserDto,
  LoginWithGoogleUserDto,
  LoginWithOTPUserDto,
} from './dto/user.dto';
import { ResetPasswordDto, ChangePasswordDto } from './dto/reset-password.dto';
import { BcryptService } from 'src/modules/bcrypt/bcrypt.service';
import { HttpStatusCodesService } from 'src/modules/http_status_codes/http_status_codes.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/modules/mail/mail.service';
import { randomInt } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class AuthService extends HttpStatusCodesService {
  private bcryptService: BcryptService = new BcryptService();
  private readonly OTP_EXPIRATION_TIME: number = 300000;
  private oauth2Client;

  private frontEndBaseUrl: string;
  private googleWebClientId: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshToken>,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {
    super();
    const GOOGLE_CLIENT_ID = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = this.configService.get<string>(
      'GOOGLE_CLIENT_SECRET',
    );
    const GOOGLE_REDIRECT_URI = this.configService.get<string>(
      'GOOGLE_REDIRECT_URI',
    );

    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET,
      GOOGLE_REDIRECT_URI,
    );
    this.frontEndBaseUrl = configService.get<string>('FRONTEND_BASE_URL');
    this.googleWebClientId = GOOGLE_CLIENT_ID;
  }

  async createJWTTokenForUser(user) {
    return await this.jwtService.signAsync({
      email: user.email,
      role: user.role,
      id: user._id,
    });
  }

  async create(userInfo: CreateUserDto) {
    try {
      const HashedPassword = await this.bcryptService.createHashPassword(
        userInfo.password,
      );

      // Generate email verification token
      const emailVerificationToken = require('crypto').randomBytes(32).toString('hex');
      const emailVerificationTokenExpires = new Date();
      emailVerificationTokenExpires.setHours(emailVerificationTokenExpires.getHours() + 24); // 24 hours

      const user = (
        await this.userModel.create({
          ...userInfo,
          password: HashedPassword,
          emailVerified: false,
          emailVerificationToken,
          emailVerificationTokenExpires,
        })
      ).toObject();

      // Send verification email
      try {
        await this.mailService.sendEmailVerification({
          email: userInfo.email,
          name: `${userInfo.first_name} ${userInfo.last_name}`,
          verificationToken: emailVerificationToken,
          verificationUrl: `${this.frontEndBaseUrl}/verify-email?token=${emailVerificationToken}`,
        });
      } catch (error) {
        console.error('Error sending verification email:', error);
        // Don't fail user creation if email fails
      }

      // Notify support team of new sign-up
      try {
        const supportEmail = process.env.SUPPORT_EMAIL || 'support@worknow.com';
        await this.mailService.sendNewSignupNotification({
          supportEmail,
          userName: `${userInfo.first_name} ${userInfo.last_name}`,
          userEmail: userInfo.email,
          userRole: userInfo.role,
          signedUpAt: new Date().toLocaleString(),
        });
      } catch (error) {
        console.error('Error sending sign-up notification to support:', error);
        // Don't fail user creation if notification fails
      }

      const access_token = await this.createJWTTokenForUser(user);
      const refresh_token = await this.generateRefreshToken(user._id.toString());

      return { ...user, access_token, refresh_token };
    } catch (error) {
      if (error.code === 11000) {
        throw new Error(this.STATUS_ALREADY_EXIST_MESSAGE);
      }
      throw new Error(error);
    }
  }

  async login(userInfo: LoginUserDto) {
    const user = await this.userModel.findOne({
      email: userInfo.email,
      role: userInfo.role,
    });
    if (!user) {
      throw new Error(this.STATUS_MESSAGE_FOR_NOT_FOUND);
    }
    const userDbDetails = user.toObject();

    if (
      !(await this.bcryptService.comparePassword(
        userInfo.password,
        userDbDetails.password,
      ))
    ) {
      throw new Error(this.STATUS_MESSAGE_FOR_UNAUTHORIZED);
    }
    const access_token = await this.createJWTTokenForUser(userDbDetails);
    const refresh_token = await this.generateRefreshToken(userDbDetails._id.toString());
    const { password: _, ...restUserData } = userDbDetails;
    return { access_token, refresh_token, ...restUserData };
  }

  async loginWithGoogle(userGoogleInfo: LoginWithGoogleUserDto) {
    const ticket = await this.oauth2Client.verifyIdToken({
      idToken: userGoogleInfo.code,
      audience: this.googleWebClientId, // must match the one in your frontend
    });

    const payload = ticket.getPayload();

    const user = await this.userModel.findOne({
      email: payload.email,
      role: userGoogleInfo.role,
    });

    if (!user) {
      throw new Error(this.STATUS_MESSAGE_FOR_NOT_FOUND);
    }

    const userDbDetails = user.toObject();

    const access_token = await this.createJWTTokenForUser(userDbDetails);
    const refresh_token = await this.generateRefreshToken(userDbDetails._id.toString());
    const { password: _, ...restUserData } = userDbDetails;

    return { access_token, refresh_token, ...restUserData };
  }

  async loginWithOTp({ email }: LoginWithOTPUserDto) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new Error(this.STATUS_MESSAGE_FOR_NOT_FOUND);
    }
    const userDbDetails = user.toObject();

    const otp = randomInt(100000, 999999);

    userDbDetails.otp = otp;
    const expiration =
      Number(this.configService.get<string>('OTP_EXPIRATION_TIME')) ??
      this.OTP_EXPIRATION_TIME;

    await user.updateOne({
      otp,
      otp_expires_after: Date.now() + expiration,
    });

    await this.mailService.sendUserConfirmation({
      email,
      name: userDbDetails.first_name + ' ' + userDbDetails.last_name,
      otp,
    });
    return true;
  }

  async verifyOTp({ email, otp }: LoginWithOTPUserDto) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new Error(this.STATUS_MESSAGE_FOR_NOT_FOUND);
    }
    if (user.otp !== otp) {
      throw new Error(this.STATUS_MESSAGE_FOR_WRONG_OTP);
    }
    const userDbDetails = user.toObject();

    if (!user || userDbDetails.otp_expires_after < Date.now()) {
      throw new Error(this.STATUS_MESSAGE_FOR_EXPIRED);
    }

    await user.updateOne({ otp: undefined, otp_expires_after: undefined });

    const access_token = await this.createJWTTokenForUser(userDbDetails);
    const refresh_token = await this.generateRefreshToken(userDbDetails._id.toString());
    const {
      password: _,
      otp_expires_after: _otp_expires_after,
      otp: _otp,
      ...restUserData
    } = userDbDetails;
    return { access_token, refresh_token, ...restUserData };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new Error(this.STATUS_MESSAGE_FOR_NOT_FOUND);
    }

    // Generate password reset token
    const passwordResetToken = require('crypto').randomBytes(32).toString('hex');
    const passwordResetTokenExpires = new Date();
    passwordResetTokenExpires.setHours(passwordResetTokenExpires.getHours() + 1); // 1 hour expiry

    // Save token to user
    await this.userModel.findByIdAndUpdate(user._id, {
      passwordResetToken,
      passwordResetTokenExpires,
    });

    const userDbDetails = user.toObject();
    const resetUrl = `${this.frontEndBaseUrl}/reset-password?token=${passwordResetToken}`;

    await this.mailService.sendForgotPasswordMail({
      email,
      name: userDbDetails.first_name + ' ' + userDbDetails.last_name,
      url: resetUrl,
    });
    return true;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userModel.findOne({
      passwordResetToken: dto.token,
      passwordResetTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await this.bcryptService.createHashPassword(dto.newPassword);

    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetTokenExpires: undefined,
    });

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error(this.STATUS_MESSAGE_FOR_NOT_FOUND);
    }

    // Verify current password
    const isCurrentPasswordValid = await this.bcryptService.comparePassword(
      dto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.bcryptService.createHashPassword(dto.newPassword);

    // Update password
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
    });

    return { message: 'Password changed successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.userModel.findOne({
      emailVerificationToken: token,
      emailVerificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userModel.findByIdAndUpdate(user._id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationTokenExpires: undefined,
    });

    return { message: 'Email verified successfully' };
  }

  // Generate refresh token
  private async generateRefreshToken(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const expiresInDays = parseInt(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRATION_DAYS') || '30',
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Generate secure random token
    const token = require('crypto').randomBytes(64).toString('hex');

    await this.refreshTokenModel.create({
      userId: new Types.ObjectId(userId),
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return token;
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const tokenDoc = await this.refreshTokenModel.findOne({
      token: refreshToken,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userModel.findById(tokenDoc.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Revoke old token (token rotation)
    await this.refreshTokenModel.findByIdAndUpdate(tokenDoc._id, { isRevoked: true });

    // Generate new tokens
    const userDbDetails = user.toObject();
    const access_token = await this.createJWTTokenForUser(userDbDetails);
    const newRefreshToken = await this.generateRefreshToken(
      userDbDetails._id.toString(),
      ipAddress,
      userAgent,
    );

    return {
      access_token,
      refresh_token: newRefreshToken,
    };
  }

  // Revoke refresh token (logout)
  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.refreshTokenModel.updateOne(
      { token: refreshToken },
      { isRevoked: true },
    );
  }
}
