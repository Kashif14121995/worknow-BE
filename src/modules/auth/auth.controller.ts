import { Controller, Post, Body, Res, Req, Param } from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express'; // Import Response and Request types

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
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto, ChangePasswordDto } from './dto/reset-password.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';

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

  @Public()
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const ipAddress = (req as any).ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
      const userAgent = req.headers['user-agent'];
      const tokens = await this.authService.refreshAccessToken(
        dto.refresh_token,
        ipAddress,
        userAgent,
      );
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(tokens, 'Token refreshed successfully'),
      );
    } catch (error) {
      return res.status(this.http.STATUS_UNAUTHORIZED).json(
        new ErrorResponse(
          this.http.STATUS_UNAUTHORIZED,
          'Token refresh failed',
          error.message,
        ),
      );
    }
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Res() res: Response,
  ): APIResponse {
    try {
      await this.authService.revokeRefreshToken(dto.refresh_token);
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(null, 'Logged out successfully'),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Logout failed',
          error.message,
        ),
      );
    }
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res() res: Response,
  ): APIResponse {
    try {
      const result = await this.authService.resetPassword(dto);
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(result, 'Password reset successfully'),
      );
    } catch (error) {
      return res.status(this.http.STATUS_BAD_REQUEST).json(
        new ErrorResponse(
          this.http.STATUS_BAD_REQUEST,
          'Password reset failed',
          error.message,
        ),
      );
    }
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const userId = req.user.id;
      const result = await this.authService.changePassword(userId, dto);
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(result, 'Password changed successfully'),
      );
    } catch (error) {
      const status = error.message.includes('incorrect') 
        ? this.http.STATUS_BAD_REQUEST 
        : this.http.STATUS_INTERNAL_SERVER_ERROR;
      return res.status(status).json(
        new ErrorResponse(
          status,
          'Password change failed',
          error.message,
        ),
      );
    }
  }

  @Public()
  @Post('verify-email/:token')
  @ApiOperation({ summary: 'Verify email address using verification token' })
  @ApiParam({ name: 'token', description: 'Email verification token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Param('token') token: string,
    @Res() res: Response,
  ): APIResponse {
    try {
      const result = await this.authService.verifyEmail(token);
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(result, 'Email verified successfully'),
      );
    } catch (error) {
      return res.status(this.http.STATUS_BAD_REQUEST).json(
        new ErrorResponse(
          this.http.STATUS_BAD_REQUEST,
          'Email verification failed',
          error.message,
        ),
      );
    }
  }
}
