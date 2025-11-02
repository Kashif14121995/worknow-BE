import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { RatingService } from './rating.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, CREATED_SUCCESS, CREATED_ERROR } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { CreateRatingDto } from './dto/create-rating.dto';

@Controller('ratings')
@ApiTags('Ratings')
@ApiBearerAuth()
export class RatingController {
  constructor(
    private readonly ratingService: RatingService,
    private readonly http: HttpStatusCodesService,
  ) {}

  // ============================================
  // RATING CREATION
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Create a new rating/review' })
  @ApiResponse({ status: 201, description: 'Rating created successfully' })
  async createRating(
    @Body() dto: CreateRatingDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const rating = await this.ratingService.createRating(userId, dto);

      return res.status(this.http.STATUS_SUCCESSFULLY_CREATION).json(
        new SuccessResponse(
          rating,
          CREATED_SUCCESS.replace('{{entity}}', 'rating'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          CREATED_ERROR.replace('{{entity}}', 'rating'),
          error.message,
        ),
      );
    }
  }

  // ============================================
  // RATING RETRIEVAL
  // ============================================

  @Get('user/:userId')
  @ApiOperation({ 
    summary: 'Get ratings for a specific user',
    description: 'Use query param `includeAverage=true` to include average rating in response'
  })
  @ApiParam({ name: 'userId', description: 'User ID to get ratings for' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeAverage', required: false, type: Boolean, description: 'Include average rating in response' })
  @ApiResponse({ status: 200, description: 'Ratings fetched successfully' })
  async getUserRatings(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('includeAverage') includeAverage: boolean = false,
    @Res() res: Response,
  ) {
    try {
      const data = await this.ratingService.getUserRatings(
        userId,
        Number(page),
        Number(limit),
      );

      // Include average rating if requested
      if (includeAverage) {
        const averageRating = await this.ratingService.getUserAverageRating(userId);
        return res.status(this.http.STATUS_OK).json(
          new SuccessResponse(
            {
              ...data,
              averageRating,
            },
            DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'ratings'),
          ),
        );
      }

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'ratings'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching ratings',
          error.message,
        ),
      );
    }
  }

  @Get('job/:jobId')
  @ApiOperation({ 
    summary: 'Get ratings for a specific job',
    description: 'Use query param `includeAverage=true` to include average rating in response'
  })
  @ApiParam({ name: 'jobId', description: 'Job ID to get ratings for' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeAverage', required: false, type: Boolean, description: 'Include average rating in response' })
  @ApiResponse({ status: 200, description: 'Ratings fetched successfully' })
  async getJobRatings(
    @Param('jobId') jobId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('includeAverage') includeAverage: boolean = false,
    @Res() res: Response,
  ) {
    try {
      const data = await this.ratingService.getJobRatings(
        jobId,
        Number(page),
        Number(limit),
      );

      // Include average rating if requested
      if (includeAverage) {
        const averageRating = await this.ratingService.getJobAverageRating(jobId);
        return res.status(this.http.STATUS_OK).json(
          new SuccessResponse(
            {
              ...data,
              averageRating,
            },
            DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'ratings'),
          ),
        );
      }

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'ratings'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching ratings',
          error.message,
        ),
      );
    }
  }

  // ============================================
  // AVERAGE RATINGS (Standalone endpoints for convenience)
  // ============================================

  @Get('user/:userId/average')
  @ApiOperation({ summary: 'Get average rating for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Average rating fetched successfully' })
  async getUserAverageRating(
    @Param('userId') userId: string,
    @Res() res: Response,
  ) {
    try {
      const averageRating = await this.ratingService.getUserAverageRating(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          { averageRating },
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'average rating'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching average rating',
          error.message,
        ),
      );
    }
  }

  @Get('job/:jobId/average')
  @ApiOperation({ summary: 'Get average rating for a job' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Average rating fetched successfully' })
  async getJobAverageRating(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    try {
      const averageRating = await this.ratingService.getJobAverageRating(jobId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          { averageRating },
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'average rating'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching average rating',
          error.message,
        ),
      );
    }
  }
}
