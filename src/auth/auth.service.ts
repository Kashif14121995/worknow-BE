import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import {
  CreateUserDto,
  ForgotPasswordDto,
  loginUserDto,
  loginWithGoogleUserDto,
  loginWithOTPUserDto,
} from 'src/dto';
import { BcryptService } from 'src/bcrypt/bcrypt.service';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/mail/mail.service';
import { randomInt } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

@Injectable()
export class AuthService extends HttpStatusCodesService {
  private bcryptService: BcryptService = new BcryptService();
  private readonly OTP_EXPIRATION_TIME: number = 300000;
  private oauth2Client;
  private frontEndBaseUrl: string;

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
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
  }

  async createJWTTokenForUser(user) {
    return await this.jwtService.signAsync({
      email: user.email,
      role: user.role,
    });
  }

  async create(userInfo: CreateUserDto) {
    try {
      const HashedPassword = await this.bcryptService.createHashPassword(
        userInfo.password,
      );
      const user = (
        await this.userModel.create({
          ...userInfo,
          password: HashedPassword,
        })
      ).toObject();
      const access_token = await this.createJWTTokenForUser(user);

      return { ...user, access_token };
    } catch (error) {
      if (error.code === 11000) {
        throw new Error(this.STATUS_ALREADY_EXIST_MESSAGE);
      }
      throw new Error(error);
    }
  }

  async login(userInfo: loginUserDto) {
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
    const { password: _, ...restUserData } = userDbDetails;
    return { access_token, ...restUserData };
  }

  async loginWithGoogle(userGoogleInfo: loginWithGoogleUserDto) {
    const { tokens } = await this.oauth2Client.getToken(userGoogleInfo.code);
    this.oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
      version: 'v2',
      auth: this.oauth2Client,
    });

    const userInfo = await oauth2.userinfo.v2.me.get();

    const user = await this.userModel.findOne({
      email: userInfo.data.email,
      role: userGoogleInfo.role,
    });
    if (!user) {
      throw new Error(this.STATUS_MESSAGE_FOR_NOT_FOUND);
    }
    const userDbDetails = user.toObject();

    const access_token = await this.createJWTTokenForUser(userDbDetails);
    const { password: _, ...restUserData } = userDbDetails;
    return { access_token, ...restUserData };
  }

  async loginWithOTp({ email }: loginWithOTPUserDto) {
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

  async verifyOTp({ email, otp }: loginWithOTPUserDto) {
    const user = await this.userModel.findOne({ email, otp });
    if (!user) {
      throw new Error(this.STATUS_MESSAGE_FOR_NOT_FOUND);
    }
    const userDbDetails = user.toObject();

    if (!user || userDbDetails.otp_expires_after < Date.now()) {
      throw new Error(this.STATUS_MESSAGE_FOR_EXPIRED);
    }

    await user.updateOne({ otp: undefined, otp_expires_after: undefined });

    const access_token = await this.createJWTTokenForUser(userDbDetails);
    const {
      password: _,
      otp_expires_after: _otp_expires_after,
      otp: _otp,
      ...restUserData
    } = userDbDetails;
    return { access_token, ...restUserData };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new Error(this.STATUS_MESSAGE_FOR_NOT_FOUND);
    }

    const userDbDetails = user.toObject();
    const jwt = await this.createJWTTokenForUser(userDbDetails);
    const url = `${this.frontEndBaseUrl}?token=${jwt}`;

    await this.mailService.sendForgotPasswordMail({
      email,
      name: userDbDetails.first_name + ' ' + userDbDetails.last_name,
      url,
    });
    return true;
  }
}
