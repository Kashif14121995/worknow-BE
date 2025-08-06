import { Controller, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express'; // Import Response type

import { AuthService } from './auth.service';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { HttpStatusCodesService } from 'src/modules/http_status_codes/http_status_codes.service';
import { APIResponse } from 'src/common/types/express';
import { Public } from 'src/plugin/public';
import {
  CreateUserDto,
  ForgotPasswordDto,
  LoginUserDto,
  LoginWithGoogleUserDto,
  LoginWithOTPUserDto as userEmailDetailsDto,
} from './dto/user.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Auth') // Groups this controller under 'Auth' section in Swagger
@Controller('auth')
export class AuthController {
  private readonly USER_CREATED_SUCCESSFULLY = 'User Created successfully';
  private readonly USER_CREATED_ERROR = 'Error Creating User Data';
  private readonly LOGIN_FAILED = 'Please check your credentials.';
  private readonly INVALID_OTP = 'Invalid One Time Password';
  private readonly USER_UNAUTHORIZED = 'The input Password is wrong';
  private readonly USER_DATA_FETCHED_SUCCESSFULLY =
    'Successfully fetched user data';
  private readonly ALREADY_EXIST = 'User with Email already exists';
  private readonly USER_OTP_SESSION_EXPIRED = `OTP session  expired`;
  private readonly FORGOT_PASSWORD_REQUEST_SEND_SUCCESS = `Successfully sent forgot-password mail`;

  constructor(
    private readonly authService: AuthService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
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
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginUserDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logIn(
    @Body() loginUserDto: LoginUserDto,
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
              this.LOGIN_FAILED,
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
  @ApiOperation({ summary: 'Login with OTP' })
  @ApiBody({ type: userEmailDetailsDto })
  @ApiResponse({ status: 200, description: 'Login successful with OTP' })
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
              this.LOGIN_FAILED,
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
  @ApiOperation({ summary: 'Login with Google' })
  @ApiBody({ type: LoginWithGoogleUserDto })
  @ApiResponse({ status: 200, description: 'Login successful with Google' })
  async logInWithGoogle(
    @Body() loginUserDto: LoginWithGoogleUserDto,
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
              this.LOGIN_FAILED,
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
  @ApiOperation({ summary: 'Verify OTP for login or registration' })
  @ApiBody({ type: userEmailDetailsDto })
  @ApiResponse({ status: 200, description: 'OTP verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
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
          .status(this.http.STATUS_OK)
          .json(
            new ErrorResponse(
              this.http.STATUS_OK,
              this.LOGIN_FAILED,
              error.message,
            ),
          );
      }
      if (error.message === this.http.STATUS_MESSAGE_FOR_WRONG_OTP) {
        return res
          .status(this.http.STATUS_OK)
          .json(
            new ErrorResponse(
              this.http.STATUS_OK,
              this.INVALID_OTP,
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
  @ApiOperation({ summary: 'Send forgot password email' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
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
              this.LOGIN_FAILED,
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
