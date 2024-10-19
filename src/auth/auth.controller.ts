import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express'; // Import Response type

import { CreateUserDto, loginUserDto } from 'src/dto';
import { AuthService } from './auth.service';
import { SuccessResponse, ErrorResponse } from 'src/utils/response';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';
import { Public } from 'src/plugin/public';

@Controller('auth')
export class AuthController {
  private readonly USER_CREATED_SUCCESSFULLY = 'User Created successfully';
  private readonly USER_CREATED_ERROR = 'Error Creating User Data';
  private readonly USER_NOT_FOUND = 'User Not Found';
  private readonly USER_UNAUTHORIZED = 'The input Password is wrong';
  private readonly USER_DATA_FETCHED_SUCCESSFULLY =
    'Successfully fetched user data';
  private readonly ALREADY_EXIST = 'User with Email already exists';

  constructor(
    private readonly authService: AuthService,
    private readonly http: HttpStatusCodesService,
  ) {}
  @Public()
  @Post('signup')
  async signup(
    @Body() CreateUserDto: CreateUserDto,
    @Res() res: Response,
  ): Promise<Response<any, Record<string, any>>> {
    try {
      const userCreateInput = await this.authService.create(CreateUserDto);
      return res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
        .json(
          new SuccessResponse(userCreateInput, this.USER_CREATED_SUCCESSFULLY),
        );
    } catch (error) {
      if (error.message === this.http.STATUS_ALREADY_EXIST_MESSAGE) {
        return res
          .status(this.http.STATUS_ALREADY_EXIST)
          .json(
            new ErrorResponse(
              this.http.STATUS_ALREADY_EXIST,
              this.ALREADY_EXIST,
              error.message,
            ),
          );
      }
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            this.USER_CREATED_ERROR,
            error.message,
          ),
        );
    }
  }

  @Public()
  @Post('login')
  async logIn(
    @Body() loginUserDto: loginUserDto,
    @Res() res: Response,
  ): Promise<Response<any, Record<string, any>>> {
    try {
      const user = await this.authService.login(loginUserDto);
      return res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(user, this.USER_DATA_FETCHED_SUCCESSFULLY));
    } catch (error) {
      if (error.message === this.http.STATUS_MESSAGE_FOR_NOT_FOUND) {
        return res
          .status(this.http.STATUS_NOT_FOUND)
          .json(
            new ErrorResponse(
              this.http.STATUS_NOT_FOUND,
              this.USER_NOT_FOUND,
              error.message,
            ),
          );
      }
      if (error.message === this.http.STATUS_MESSAGE_FOR_UNAUTHORIZED) {
        return res
          .status(this.http.STATUS_UNAUTHORIZED)
          .json(
            new ErrorResponse(
              this.http.STATUS_UNAUTHORIZED,
              this.USER_UNAUTHORIZED,
              error.message,
            ),
          );
      }
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            this.USER_CREATED_ERROR,
            error.message,
          ),
        );
    }
  }
}
