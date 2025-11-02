import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { AdminService } from './admin.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { UserRole, JobStatus } from 'src/constants';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('admin')
@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserRole.admin)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly http: HttpStatusCodesService,
  ) {}

  // Platform Statistics
  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Statistics fetched successfully' })
  async getPlatformStats(@Req() req: Request, @Res() res: Response) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const stats = await this.adminService.getPlatformStats();

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          stats,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'platform statistics'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching statistics',
          error.message,
        ),
      );
    }
  }

  // User Management
  @Get('users')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: UserRole })
  @ApiQuery({ name: 'searchText', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Users fetched successfully' })
  async getAllUsers(
    @Req() req: Request,
    @Res() res: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: UserRole,
    @Query('searchText') searchText?: string,
  ) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const pageNumber = page ? parseInt(page, 10) : 1;
      const pageLimit = limit ? parseInt(limit, 10) : 20;

      const data = await this.adminService.getAllUsers(pageNumber, pageLimit, role, searchText);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'users'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching users',
          error.message,
        ),
      );
    }
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User fetched successfully' })
  async getUserById(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const user = await this.adminService.getUserById(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          user,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'user'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error fetching user',
          error.message,
        ),
      );
    }
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ schema: { type: 'object', properties: { role: { enum: Object.values(UserRole) } } } })
  @ApiResponse({ status: 200, description: 'User role updated successfully' })
  async updateUserRole(
    @Param('userId') userId: string,
    @Body('role') role: UserRole,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const user = await this.adminService.updateUserRole(userId, role);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          user,
          UPDATE_SUCCESS.replace('{{entity}}', 'user role'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_BAD_REQUEST).json(
        new ErrorResponse(
          this.http.STATUS_BAD_REQUEST,
          'Error updating user role',
          error.message,
        ),
      );
    }
  }

  @Patch('users/:userId/block')
  @ApiOperation({ summary: 'Block user (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'User blocked successfully' })
  async blockUser(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const user = await this.adminService.blockUser(userId, reason);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          user,
          'User blocked successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('Cannot')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error blocking user',
          error.message,
        ),
      );
    }
  }

  @Patch('users/:userId/unblock')
  @ApiOperation({ summary: 'Unblock user (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User unblocked successfully' })
  async unblockUser(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const user = await this.adminService.unblockUser(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          user,
          'User unblocked successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error unblocking user',
          error.message,
        ),
      );
    }
  }

  @Delete('users/:userId')
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  async deleteUser(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const result = await this.adminService.deleteUser(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          result,
          'User deleted successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error deleting user',
          error.message,
        ),
      );
    }
  }

  // Job Management
  @Get('jobs')
  @ApiOperation({ summary: 'Get all jobs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: JobStatus })
  @ApiQuery({ name: 'searchText', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Jobs fetched successfully' })
  async getAllJobs(
    @Req() req: Request,
    @Res() res: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: JobStatus,
    @Query('searchText') searchText?: string,
  ) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const pageNumber = page ? parseInt(page, 10) : 1;
      const pageLimit = limit ? parseInt(limit, 10) : 20;

      const data = await this.adminService.getAllJobs(pageNumber, pageLimit, status, searchText);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'jobs'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching jobs',
          error.message,
        ),
      );
    }
  }

  @Patch('jobs/:jobId/status')
  @ApiOperation({ summary: 'Update job status (Admin only)' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiBody({ schema: { type: 'object', properties: { status: { enum: Object.values(JobStatus) } } } })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  async updateJobStatus(
    @Param('jobId') jobId: string,
    @Body('status') status: JobStatus,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const job = await this.adminService.updateJobStatus(jobId, status);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          job,
          UPDATE_SUCCESS.replace('{{entity}}', 'job status'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_BAD_REQUEST).json(
        new ErrorResponse(
          this.http.STATUS_BAD_REQUEST,
          'Error updating job status',
          error.message,
        ),
      );
    }
  }

  @Delete('jobs/:jobId')
  @ApiOperation({ summary: 'Delete job (Admin only)' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job deleted successfully' })
  async deleteJob(
    @Param('jobId') jobId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.adminService.verifyAdmin(req.user.id);
      const result = await this.adminService.deleteJob(jobId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          result,
          'Job deleted successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error deleting job',
          error.message,
        ),
      );
    }
  }
}

