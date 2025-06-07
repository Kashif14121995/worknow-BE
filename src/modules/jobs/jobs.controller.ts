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
} from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobListingDto } from './dto/create-job.dto';
import { UpdateJobListingDto } from './dto/update-job.dto';
import { JobStatus } from './constants';
import { APIResponse, Request } from 'src/types/express';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';
import { ErrorResponse, SuccessResponse } from 'src/utils/response';
import { PaginationDto } from './dto/pagination.dto';
import {
  CREATED_ERROR,
  CREATED_SUCCESS,
  DATA_FETCHED_SUCCESSFULLY,
  UPDATE_ERROR,
  UPDATE_SUCCESS,
} from 'src/constants';
import { Response } from 'express';
import { SearchDto } from './dto/search.dto';

@Controller('jobs')
export class JobsController {
  private readonly FIND_USER_JOBS_ERROR = `Error fetching user job details for user with email {{email}} for {{status}} jobs`;
  private readonly FIND_USER_JOB_APPLICANTS_ERROR = `Error fetching user job applicants for user with email {{email}} `;
  private readonly FIND_USER__APPLICANTS_ERROR = `Error fetching user job applicants for user with email {{email}} `;

  constructor(
    private readonly jobsService: JobsService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post('listing')
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

  @Get('listing')
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
        role,
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

  @Get('/listing/shifts')
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

  @Get('listing/:id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Patch('listing/:id')
  async update(
    @Param('id') id: string,
    @Res() res: Response,
    @Body() UpdateJobListingDto: UpdateJobListingDto,
  ) {
    try {
      const data = await this.jobsService.update(id, UpdateJobListingDto);
      return res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
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

  @Delete('listing/:id')
  remove(@Param('id') id: string) {
    return this.jobsService.remove(id);
  }

  @Get('/user/listing/:status')
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

  @Get('/applicants')
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

  @Get('/job-with-applicants')
  async findAllJobWithApplicants(
    @Req() request: Request,
    @Res() res: Response,
    @Query() pagination: PaginationDto,
  ): APIResponse {
    try {
      console.log('Fetching job applicants with pagination:', pagination);
      const userId = request?.user?.id;
      console.log('User ID:', userId);
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

  @Get('/job-applications')
  async findJobApplications(
    @Req() request: Request,
    @Res() res: Response,
    @Query() pagination: PaginationDto,
    @Query() search: SearchDto,
  ): APIResponse {
    try {
      console.log('Fetching job applications with pagination:', pagination);
      const userId = request?.user?.id;
      const role = request?.user?.role;
      console.log('User ID:', userId);
      const { page, limit } = pagination;
      const { searchText } = search;
      const data = await this.jobsService.getApplicationsReceived(
        userId,
        role,
        page,
        limit,
        searchText,
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
}
