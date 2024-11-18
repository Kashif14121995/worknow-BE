import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto, loginUserDto, loginWithOTPUserDto } from 'src/dto';
import { BcryptService } from 'src/bcrypt/bcrypt.service';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';
import { JwtService } from '@nestjs/jwt';
import { MailService } from 'src/mail/mail.service';
import { randomInt } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService extends HttpStatusCodesService {
  private bcryptService: BcryptService = new BcryptService();
  private readonly OTP_EXPIRATION_TIME: number = 300000;
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {
    super();
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
      const access_token = await this.jwtService.signAsync({
        email: user.email,
        role: user.role,
      });

      return { ...user, access_token };
    } catch (error) {
      if (error.code === 11000) {
        throw new Error(this.STATUS_ALREADY_EXIST_MESSAGE);
      }
      throw new Error(error);
    }
  }

  async login(userInfo: loginUserDto) {
    const user = await this.userModel.findOne({ email: userInfo.email });
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
    const access_token = await this.jwtService.signAsync({
      email: userDbDetails.email,
      role: user.role,
    });
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

    const access_token = await this.jwtService.signAsync({
      email: userDbDetails.email,
      role: user.role,
    });
    const {
      password: _,
      otp_expires_after: _otp_expires_after,
      otp:_otp,
      ...restUserData
    } = userDbDetails;
    return { access_token, ...restUserData };

    return true;
  }
}
