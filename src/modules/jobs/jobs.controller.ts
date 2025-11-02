import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Res,
  Query,
  ForbiddenException,
  Put,
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobListingDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobStatus, UserRole } from 'src/constants';
import { APIResponse, Request } from 'src/common/types/express';
import { HttpStatusCodesService } from 'src/modules/http_status_codes/http_status_codes.service';
import { ErrorResponse, SuccessResponse } from 'src/common/utils/response';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  CREATED_ERROR,
  CREATED_SUCCESS,
  DATA_FETCHED_SUCCESSFULLY,
  UPDATE_ERROR,
  UPDATE_SUCCESS,
} from 'src/constants';
import { Response } from 'express';
import { SearchDto } from './dto/search.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';

@Controller('jobs')
@ApiTags('Jobs')
@ApiBearerAuth()
export class JobsController {
  private readonly FIND_USER_JOBS_ERROR = `Error fetching user job details for user with email {{email}} for {{status}} jobs`;
  private readonly FIND_USER_JOB_APPLICANTS_ERROR = `Error fetching user job applicants for user with email {{email}}`;

  constructor(
    private readonly jobsService: JobsService,
    private readonly http: HttpStatusCodesService,
  ) {}

  // ============================================
  // JOB CRUD OPERATIONS
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Create a new job listing' })
  @ApiBody({ type: CreateJobListingDto })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async create(
    @Body() CreateJobListingDto: CreateJobListingDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const data = await this.jobsService.create(CreateJobListingDto, userId);
      return res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
        .json(
          new SuccessResponse(
            data,
            CREATED_SUCCESS.replace('{{entity}}', 'job'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            CREATED_ERROR.replace('{{entity}}', 'job'),
            error.message,
          ),
        );
    }
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all job listings (paginated with filters)',
    description: 'Get jobs with optional filters: status, searchText. Use query params to filter by status and search.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'searchText', required: false, type: String, description: 'Search in job title' })
  @ApiQuery({ name: 'status', required: false, enum: JobStatus, description: 'Filter by job status' })
  @ApiResponse({ status: 200, description: 'Jobs fetched successfully' })
  async findAll(
    @Req() request: Request,
    @Res() res: Response,
    @Query('status') status?: JobStatus,
  ) {
    const userId = request?.user?.id;
    const pageNumber = request.query.page
      ? parseInt(String(request.query.page), 10)
      : 1;
    const pageLimit = request.query.limit
      ? parseInt(String(request.query.limit), 10)
      : 10;
    const searchText = request.query.searchText
      ? String(request.query.searchText)
      : '';

    try {
      // If status filter is provided, use findUserJobs, otherwise use findAll
      let data;
      if (status) {
        const jobs = await this.jobsService.findUserJobs(userId, status);
        data = {
          jobs,
          total: jobs.length,
          page: pageNumber,
          limit: pageLimit,
          totalPages: Math.ceil(jobs.length / pageLimit),
        };
      } else {
        data = await this.jobsService.findAll(
          userId,
          pageNumber,
          pageLimit,
          searchText,
        );
      }

      return res
        .status(this.http.STATUS_OK)
        .json(
          new SuccessResponse(
            data,
            DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'job'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            UPDATE_ERROR.replace('{{entity}}', 'job'),
            error.message,
          ),
        );
    }
  }

  @Get('/:id')
  @ApiOperation({ summary: 'Get job listing by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Job fetched successfully' })
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update job listing by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateJobDto })
  @ApiResponse({ status: 200, description: 'Job updated successfully' })
  async update(
    @Param('id') id: string,
    @Res() res: Response,
    @Body() UpdateJobDto: UpdateJobDto,
  ) {
    try {
      const data = await this.jobsService.update(id, UpdateJobDto);
      return res
        .status(this.http.STATUS_OK)
        .json(
          new SuccessResponse(
            data,
            UPDATE_SUCCESS.replace('{{entity}}', 'job'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            UPDATE_ERROR.replace('{{entity}}', 'job'),
            error.message,
          ),
        );
    }
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Delete a job by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job deleted successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }

  // ============================================
  // JOB STATUS MANAGEMENT
  // ============================================

  @Put('/:id/status')
  @ApiOperation({ summary: 'Update job status by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Job ID' })
  @ApiBody({ 
    type: UpdateJobStatusDto,
    description: 'Status value (active, closed, draft, etc.)'
  })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  async updateStatus(
    @Param('id') jobId: string,
    @Res() res: Response,
    @Body() body: UpdateJobStatusDto,
  ) {
    try {
      const data = await this.jobsService.updateStatus(jobId, body.status);
      return res
        .status(this.http.STATUS_OK)
        .json(
          new SuccessResponse(
            data,
            UPDATE_SUCCESS.replace('{{entity}}', 'job status'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            UPDATE_ERROR.replace('{{entity}}', 'job status'),
            error.message,
          ),
        );
    }
  }

  // ============================================
  // JOB APPLICATIONS (Seeker Actions)
  // ============================================

  @Post('/apply/:jobId')
  @ApiOperation({ summary: 'Apply for a job by ID' })
  @ApiParam({ name: 'jobId', type: String })
  @ApiResponse({ status: 201, description: 'Application successful' })
  async applyForJob(
    @Req() request: Request,
    @Res() res: Response,
    @Param('jobId') jobId: string,
  ) {
    try {
      const userId = request.user.id;
      const data = await this.jobsService.applyForJob(jobId, userId);
      return res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
        .json(
          new SuccessResponse(
            data,
            CREATED_SUCCESS.replace('{{entity}}', 'job application'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            CREATED_ERROR.replace('{{entity}}', 'job application'),
            error.message,
          ),
        );
    }
  }

  // ============================================
  // APPLICATION MANAGEMENT (Provider Actions)
  // ============================================

  @Get('/applications')
  @ApiOperation({ 
    summary: 'Get job applications (flexible endpoint with multiple views)',
    description: 'Get applications with optional filters. Use query params: view (list|grouped|unassigned|assigned), status, searchText, jobId',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchText', required: false, type: String, description: 'Search by applicant name' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by application status' })
  @ApiQuery({ 
    name: 'view', 
    required: false, 
    enum: ['list', 'grouped', 'unassigned', 'assigned'],
    description: 'View type: list (flat list), grouped (by job), unassigned (not in shifts), assigned (in shifts)'
  })
  @ApiQuery({ name: 'seekerName', required: false, type: String, description: 'Filter by seeker name (for assigned view)' })
  @ApiResponse({ status: 200, description: 'Applications fetched successfully' })
  async getApplications(
    @Req() request: Request,
    @Res() res: Response,
    @Query() pagination: PaginationDto,
    @Query() search: SearchDto,
    @Query('view') view?: string,
    @Query('seekerName') seekerName?: string,
  ): APIResponse {
    try {
      const userId = request?.user?.id;
      const role = request?.user?.role;
      const { page, limit } = pagination;
      const { searchText, status } = search;

      let data;

      switch (view) {
        case 'grouped':
          // Get jobs with their applicants grouped
          data = await this.jobsService.getAllJobsWithApplicants(userId, page, limit);
          break;
        
        case 'unassigned':
          // Get active jobs with unassigned applications
          if (role !== UserRole.job_provider) {
            throw new ForbiddenException('Unauthorized access to unassigned applications');
          }
          const unassigned = await this.jobsService.getUnassignedApplications(userId);
          data = {
            data: unassigned,
            currentPage: 1,
            totalPages: 1,
            totalItems: unassigned.length,
          };
          break;
        
        case 'assigned':
          // Get seekers who applied and are assigned to shifts
          const assignedName = seekerName ? String(seekerName) : undefined;
          data = await this.jobsService.getSeekersAppliedAndAssignedToShifts(
            userId,
            page,
            limit,
            assignedName,
          );
          break;
        
        default:
          // Default: flat list of applications with filters
          data = await this.jobsService.getApplicationsReceived(
            userId,
            role,
            page,
            limit,
            searchText,
            status,
          );
      }

      return res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(data, DATA_FETCHED_SUCCESSFULLY));
    } catch (error) {
      console.error('Error fetching job applications:', error);
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            this.FIND_USER_JOB_APPLICANTS_ERROR.replace(
              '{{email}}',
              request.user?.email ?? 'unknown',
            ),
            error.message,
          ),
        );
    }
  }

  @Post('/applications/:applicationId/approve')
  @ApiOperation({ summary: 'Approve/Shortlist an application' })
  @ApiParam({ name: 'applicationId', description: 'Application ID to approve' })
  @ApiResponse({ status: 200, description: 'Application approved successfully' })
  async approveApplication(
    @Param('applicationId') applicationId: string,
    @Req() request: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const providerId = request.user.id;
      const role = request.user.role;

      if (role !== 'job_provider') {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job providers',
            'Only job providers can approve applications',
          ),
        );
      }

      const data = await this.jobsService.approveApplication(applicationId, providerId);
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          UPDATE_SUCCESS.replace('{{entity}}', 'application'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error approving application',
          error.message,
        ),
      );
    }
  }

  @Post('/applications/:applicationId/reject')
  @ApiOperation({ summary: 'Reject an application' })
  @ApiParam({ name: 'applicationId', description: 'Application ID to reject' })
  @ApiResponse({ status: 200, description: 'Application rejected successfully' })
  async rejectApplication(
    @Param('applicationId') applicationId: string,
    @Req() request: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const providerId = request.user.id;
      const role = request.user.role;

      if (role !== 'job_provider') {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job providers',
            'Only job providers can reject applications',
          ),
        );
      }

      const data = await this.jobsService.rejectApplication(applicationId, providerId);
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          UPDATE_SUCCESS.replace('{{entity}}', 'application'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error rejecting application',
          error.message,
        ),
      );
    }
  }

  @Post('/applications/:applicationId/hire')
  @ApiOperation({ summary: 'Hire an applicant' })
  @ApiParam({ name: 'applicationId', description: 'Application ID to hire' })
  @ApiResponse({ status: 200, description: 'Applicant hired successfully' })
  async hireApplication(
    @Param('applicationId') applicationId: string,
    @Req() request: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const providerId = request.user.id;
      const role = request.user.role;

      if (role !== 'job_provider') {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job providers',
            'Only job providers can hire applicants',
          ),
        );
      }

      const data = await this.jobsService.hireApplication(applicationId, providerId);
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          UPDATE_SUCCESS.replace('{{entity}}', 'application'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error hiring applicant',
          error.message,
        ),
      );
    }
  }

  // ============================================
  // SHIFT MANAGEMENT (Related to Jobs)
  // ============================================

  @Get('/shifts')
  @ApiOperation({
    summary: 'Get shifts related to jobs posted by the provider',
    description: 'Returns shifts for active, inactive, and upcoming jobs',
  })
  @ApiResponse({ status: 200, description: 'Shifts data fetched successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findUserShiftsData(
    @Req() request: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const userId = request?.user?.id;
      const data = await this.jobsService.getUserListingShiftsData(userId);
      return res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(data, DATA_FETCHED_SUCCESSFULLY));
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            this.FIND_USER_JOB_APPLICANTS_ERROR.replace(
              '{{email}}',
              request.user?.email ?? 'unknown',
            ),
            error.message,
          ),
        );
    }
  }
}
