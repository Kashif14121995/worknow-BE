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
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobListingDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { AvailableJobs, JobStatus, PaymentType, UserRole } from 'src/constants';
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
  private readonly FIND_USER_JOB_APPLICANTS_ERROR = `Error fetching user job applicants for user with email {{email}} `;
  private readonly FIND_USER__APPLICANTS_ERROR = `Error fetching user job applicants for user with email {{email}} `;

  constructor(
    private readonly jobsService: JobsService,
    private readonly http: HttpStatusCodesService,
  ) { }

  // ----------------------------
  // Create
  // ----------------------------
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

  // ----------------------------
  // List all jobs
  // ----------------------------
  @Get()
  @ApiOperation({ summary: 'Get all job listings (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchText', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Jobs fetched successfully' })
  async findAll(@Req() request: Request, @Res() res: Response) {
    const userId = request?.user?.id;
    const role = request?.user?.role;
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
      const data = await this.jobsService.findAll(
        userId,
        pageNumber,
        pageLimit,
        searchText,
      );
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

  @Get('/job-applications')
  @ApiOperation({ summary: 'Get all Job Applications of a Lister' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Applicants fetched successfully' })
  async findJobApplications(
    @Req() request: Request,
    @Res() res: Response,
    @Query() pagination: PaginationDto,
    @Query() search: SearchDto,
  ): APIResponse {
    try {
      const userId = request?.user?.id;
      const role = request?.user?.role;
      const { page, limit } = pagination;
      const { searchText, status } = search;
      const data = await this.jobsService.getApplicationsReceived(
        userId,
        role,
        page,
        limit,
        searchText,
        status,
      );
      return res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(data, DATA_FETCHED_SUCCESSFULLY));
    } catch (error) {
      console.error('Error fetching job applicantions:', error);
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

  @Get('/job-with-applicants')
  @ApiOperation({ summary: 'Get all applicants (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Applicants fetched successfully' })
  async findAllJobWithApplicants(
    @Req() request: Request,
    @Res() res: Response,
    @Query() pagination: PaginationDto,
  ): APIResponse {
    try {
      const userId = request?.user?.id;
      const { page, limit } = pagination;
      const data = await this.jobsService.getAllJobsWithApplicants(
        userId,
        page,
        limit,
      );
      return res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(data, DATA_FETCHED_SUCCESSFULLY));
    } catch (error) {
      console.error('Error fetching job applicants:', error);
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

  @Get('/applicants')
  @ApiOperation({ summary: 'Get all applicants (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Applicants fetched successfully' })
  async findAllApplicants(
    @Req() request: Request,
    @Res() res: Response,
    @Query() pagination: PaginationDto,
  ): APIResponse {
    try {
      const userId = request?.user?.id;
      const { page, limit } = pagination;
      const data = await this.jobsService.getAllJobApplications(
        userId,
        page,
        limit,
      );
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

  @Get('/shifts')
  @ApiOperation({
    summary: 'Get job listing shifts for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'Data fetched successfully' })
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

  @Post('updateStatus/:status')
  @ApiOperation({ summary: 'Update job status by ID' })
  @ApiParam({ name: 'status', type: String, description: 'New job status' })
  @ApiBody({ type: UpdateJobStatusDto })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  async updateStatus(
    @Param('status') status: string,
    @Res() res: Response,
    @Body() body: UpdateJobStatusDto,
  ) {
    try {
      const data = await this.jobsService.updateStatus(body.jobId, status);
      if (data.status === JobStatus.closed) {
        return res
          .status(this.http.STATUS_OK)
          .json(
            new SuccessResponse(
              data,
              UPDATE_SUCCESS.replace('{{entity}}', 'status of job'),
            ),
          );
      }
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            UPDATE_ERROR.replace('{{entity}}', 'status of job'),
            error.message,
          ),
        );
    }
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

  @Get('/seekers-applied-and-assigned')
  @ApiOperation({
    summary: 'Get seekers who applied to jobs and are assigned to shifts',
    description: 'Returns a list of seeker-job combinations where seekers have applied to jobs created by the authenticated lister and are assigned to shifts. Each seeker-job combination is a separate entry.'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number for pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of items per page' })
  @ApiQuery({ name: 'seekerName', required: false, type: String, description: 'Filter by seeker name (partial match)' })
  @ApiResponse({ status: 200, description: 'Seekers fetched successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getSeekersAppliedAndAssignedToShifts(
    @Req() request: Request,
    @Res() res: Response,
    @Query() pagination: PaginationDto,
  ): APIResponse {
    try {
      const userId = request?.user?.id;
      const { page, limit } = pagination;
      const seekerName = request.query.seekerName ? String(request.query.seekerName) : undefined;

      const data = await this.jobsService.getSeekersAppliedAndAssignedToShifts(
        userId,
        page,
        limit,
        seekerName,
      );

      return res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(data, DATA_FETCHED_SUCCESSFULLY));
    } catch (error) {
      console.error('Error fetching seekers applied and assigned to shifts:', error);
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            'Error fetching seekers who applied to jobs and are assigned to shifts',
            error.message,
          ),
        );
    }
  }

  @Get("/active-job-listing")
  @ApiOperation({ summary: 'Get all active job listings' })
  @ApiResponse({ status: 200, description: 'Active jobs fetched successfully' })
  async getActiveJobListings(@Req() request: Request, @Res() res: Response) {
    try {
      const userId = request.user.id;
      const userRole = request.user.role;
      if (userRole !== UserRole.job_provider) {
        throw new ForbiddenException('UnAuthorized access to active job listings');
      }
      const data = await this.jobsService.getUnassignedApplications(userId);
      return res
        .status(this.http.STATUS_OK)
        .json(
          new SuccessResponse(
            data,
            DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'active jobs'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            `Error fetching active job listings`,
            error.message,
          ),
        );
    }
  }

  @Get('/byStatus/:status')
  @ApiOperation({ summary: 'Get jobs for user filtered by status' })
  @ApiParam({
    name: 'status',
    required: true,
    enum: JobStatus,
    description: 'Filter jobs by status (e.g., pending, completed, cancelled)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of jobs fetched successfully',
    type: SuccessResponse, // Optionally, you can specify a DTO for better Swagger schema
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    type: ErrorResponse,
  })
  async findUserJobs(
    @Param('status') status: JobStatus,
    @Req() request: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const userId = request?.user?.id;
      const data = await this.jobsService.findUserJobs(userId, status);
      return res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(data, DATA_FETCHED_SUCCESSFULLY));
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            this.FIND_USER_JOBS_ERROR.replace(
              '{{email}}',
              request.user?.email ?? 'unknown',
            ).replace('{{status}}', status),
            error.message,
          ),
        );
    }
  }

  @Post('/apply/:jobId')
  @ApiOperation({ summary: 'Apply for a job by ID' })
  @ApiParam({ name: 'jobId', type: String })
  @ApiResponse({ status: 201, description: 'Application successful' })
  async applyForJob(
    @Req() request: Request,
    @Res() res: Response,
    @Param('jobId') jobId: string,
  ) {
    const entityByName = 'job';
    try {
      const userId = request.user.id;
      const data = await this.jobsService.applyForJob(jobId, userId);
      return res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
        .json(
          new SuccessResponse(
            data,
            CREATED_SUCCESS.replace('{{entity}}', entityByName),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            CREATED_ERROR.replace('{{entity}}', entityByName),
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

  @Post('/applications/:applicationId/approve')
  @ApiOperation({ summary: 'Approve/Shortlist an application (checkmark button)' })
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
  @ApiOperation({ summary: 'Reject an application (X button)' })
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
  @ApiOperation({ summary: 'Hire an applicant (final confirmation)' })
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

}
