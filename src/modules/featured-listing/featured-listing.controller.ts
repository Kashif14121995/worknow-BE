import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { FeaturedListingService } from './featured-listing.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/constants';

@Controller('featured-listings')
@ApiTags('Featured Listings')
@ApiBearerAuth()
export class FeaturedListingController {
  constructor(
    private readonly featuredListingService: FeaturedListingService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Get('price')
  @ApiOperation({ summary: 'Get featured listing price' })
  @ApiResponse({ status: 200, description: 'Price fetched successfully' })
  async getPrice(@Res() res: Response) {
    try {
      const price = this.featuredListingService.getFeaturedListingPrice();

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          { price, currency: 'USD', durationDays: 7 },
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'featured listing price'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching price',
          error.message,
        ),
      );
    }
  }

  @Post('make-featured/:jobId')
  @Roles(UserRole.job_provider)
  @ApiOperation({ summary: 'Make a job listing featured (Provider only)' })
  @ApiParam({ name: 'jobId', description: 'Job ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        durationDays: { type: 'number', default: 7 },
        paymentMethodId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Job made featured successfully' })
  async makeJobFeatured(
    @Param('jobId') jobId: string,
    @Body('durationDays') durationDays: number,
    @Body('paymentMethodId') paymentMethodId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const job = await this.featuredListingService.makeJobFeatured(
        userId,
        jobId,
        durationDays || 7,
        paymentMethodId,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          job,
          'Job made featured successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('required') || error.message.includes('reached')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error making job featured',
          error.message,
        ),
      );
    }
  }

  @Get('')
  @ApiOperation({ summary: 'Get featured jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Featured jobs fetched successfully' })
  async getFeaturedJobs(
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    try {
      const jobLimit = limit ? parseInt(limit, 10) : 10;
      const featuredJobs = await this.featuredListingService.getFeaturedJobs(jobLimit);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          featuredJobs,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'featured jobs'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching featured jobs',
          error.message,
        ),
      );
    }
  }
}

