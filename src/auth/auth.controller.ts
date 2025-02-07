import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express'; // Import Response type

import {
  CreateUserDto,
  ForgotPasswordDto,
  loginUserDto,
  loginWithGoogleUserDto,
  loginWithOTPUserDto as userEmailDetailsDto,
} from 'src/dto';
import { AuthService } from './auth.service';
import { SuccessResponse, ErrorResponse } from 'src/utils/response';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';
import { APIResponse } from 'src/types/express';
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
  private readonly USER_OTP_SESSION_EXPIRED = `otp session  expired`;
  private readonly FORGOT_PASSWORD_REQUEST_SEND_SUCCESS = `Successfully sent forgot-password mail`;

  constructor(
    private readonly authService: AuthService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Public()
  @Post('signup')
  async signup(
    @Body() CreateUserDto: CreateUserDto,
    @Res() res: Response,
  ): APIResponse {
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
  ): APIResponse {
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

  @Public()
  @Post('login-with-otp')
  async logInWithOTP(
    @Body() loginUserDto: userEmailDetailsDto,
    @Res() res: Response,
  ): APIResponse {
    try {
      const user = await this.authService.loginWithOTp(loginUserDto);
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

  @Public()
  @Post('login-with-google')
  async logInWithGoogle(
    @Body() loginUserDto: loginWithGoogleUserDto,
    @Res() res: Response,
  ): APIResponse {
    try {
      const user = await this.authService.loginWithGoogle(loginUserDto);
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

  @Public()
  @Post('verify-otp')
  async verifyOtp(
    @Body() loginUserDto: userEmailDetailsDto,
    @Res() res: Response,
  ): APIResponse {
    try {
      const user = await this.authService.verifyOTp(loginUserDto);
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
      if (error.message === this.http.STATUS_MESSAGE_FOR_EXPIRED) {
        return res
          .status(this.http.STATUS_EXPIRED)
          .json(
            new ErrorResponse(
              this.http.STATUS_EXPIRED,
              this.USER_OTP_SESSION_EXPIRED,
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
  @Post('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordData: ForgotPasswordDto,
    @Res() res: Response,
  ): APIResponse {
    try {
      const user = await this.authService.forgotPassword(forgotPasswordData);
      return res
        .status(this.http.STATUS_OK)
        .json(
          new SuccessResponse(user, this.FORGOT_PASSWORD_REQUEST_SEND_SUCCESS),
        );
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
