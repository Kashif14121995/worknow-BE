import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PublicDeleteAccountDto } from './dto/delete-account.dto';
import { Public } from 'src/plugin/public';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS, UPDATE_ERROR, DELETE_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Controller('users')
@ApiTags('Users')
@ApiBearerAuth()
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile fetched successfully' })
  async getProfile(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const profile = await this.userService.getProfile(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          profile,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'profile'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching profile',
          error.message,
        ),
      );
    }
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data or email already in use' })
  async updateProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const updatedProfile = await this.userService.updateProfile(userId, dto);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          updatedProfile,
          UPDATE_SUCCESS.replace('{{entity}}', 'profile'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('already in use') || error.message.includes('not found')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          UPDATE_ERROR.replace('{{entity}}', 'profile'),
          error.message,
        ),
      );
    }
  }

  @Delete('account')
  @ApiOperation({ summary: 'Remove/Delete current user account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 400, description: 'User not found or admin account' })
  async deleteAccount(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const result = await this.userService.deleteAccount(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          result,
          DELETE_SUCCESS.replace('{{entity}}', 'account'),
        ),
      );
    } catch (error) {
      const status = error.status || this.http.STATUS_INTERNAL_SERVER_ERROR;
      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error deleting account',
          error.message,
        ),
      );
    }
  }

  @Public()
  @Post('public/delete-account')
  @ApiOperation({ summary: 'Public endpoint to remove account via email and password (for mobile app & web)' })
  @ApiBody({ type: PublicDeleteAccountDto })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 400, description: 'User not found or invalid request' })
  async deleteAccountPublic(
    @Body() dto: PublicDeleteAccountDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.userService.deleteAccountPublic(dto);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          result,
          DELETE_SUCCESS.replace('{{entity}}', 'account'),
        ),
      );
    } catch (error) {
      const status = error.status || this.http.STATUS_BAD_REQUEST;
      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error deleting account',
          error.message,
        ),
      );
    }
  }
}

