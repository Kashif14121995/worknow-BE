import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from 'src/schemas/user.schema';
import { Model } from 'mongoose';
import { CreateUserDto, loginUserDto } from 'src/dto';
import { BcryptService } from 'src/bcrypt/bcrypt.service';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService extends HttpStatusCodesService {
  private bcryptService: BcryptService = new BcryptService();
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
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
    });
    const { password: _, ...restUserData } = userDbDetails;
    return { access_token, ...restUserData };
  }
}
