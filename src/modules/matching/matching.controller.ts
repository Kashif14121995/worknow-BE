import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { MatchingService } from './matching.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobPosting } from 'src/schemas';

@Controller('matching')
@ApiTags('Matching')
@ApiBearerAuth()
export class MatchingController {
  constructor(
    private readonly matchingService: MatchingService,
    @InjectModel(JobPosting.name) private jobPostingModel: Model<JobPosting>,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Get('score/:jobId')
  @ApiOperation({ summary: 'Get match score for a specific job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Match score calculated successfully' })
  async getMatchScore(
    @Param('jobId') jobId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const job = await this.jobPostingModel.findById(jobId);

      if (!job) {
        return res.status(this.http.STATUS_NOT_FOUND).json(
          new ErrorResponse(
            this.http.STATUS_NOT_FOUND,
            'Job not found',
            'The specified job does not exist',
          ),
        );
      }

      const matchScore = await this.matchingService.calculateMatchScore(
        userId,
        jobId,
        job as any,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          matchScore,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'match score'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error calculating match score',
          error.message,
        ),
      );
    }
  }

  @Get('recommended-jobs')
  @ApiOperation({ summary: 'Get recommended jobs based on match score' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of jobs to return' })
  @ApiResponse({ status: 200, description: 'Recommended jobs fetched successfully' })
  async getRecommendedJobs(
    @Query('limit') limit: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const jobLimit = limit ? parseInt(limit, 10) : 10;

      const recommendedJobs = await this.matchingService.getRecommendedJobs(userId, jobLimit);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          recommendedJobs,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'recommended jobs'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching recommended jobs',
          error.message,
        ),
      );
    }
  }
}

