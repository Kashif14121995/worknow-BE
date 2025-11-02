import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { JobAlertsService } from './job-alerts.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Controller('job-alerts')
@ApiTags('Job Alerts')
@ApiBearerAuth()
export class JobAlertsController {
  constructor(
    private readonly jobAlertsService: JobAlertsService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post('preferences')
  @ApiOperation({ summary: 'Create or update job alert preferences' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emailAlerts: { type: 'boolean' },
        inAppAlerts: { type: 'boolean' },
        pushNotifications: { type: 'boolean' },
        frequency: { enum: ['realtime', 'daily', 'weekly'] },
        preferredJobTypes: { type: 'array', items: { type: 'string' } },
        preferredIndustries: { type: 'array', items: { type: 'string' } },
        preferredLocation: { type: 'string' },
        minPayRate: { type: 'number' },
        maxPayRate: { type: 'number' },
        trendingJobs: { type: 'boolean' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Preferences saved successfully' })
  async upsertPreferences(
    @Body() preferences: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const alertPreference = await this.jobAlertsService.upsertAlertPreferences(userId, preferences);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          alertPreference,
          UPDATE_SUCCESS.replace('{{entity}}', 'alert preferences'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error saving preferences',
          error.message,
        ),
      );
    }
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get job alert preferences' })
  @ApiResponse({ status: 200, description: 'Preferences fetched successfully' })
  async getPreferences(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const preferences = await this.jobAlertsService.getAlertPreferences(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          preferences,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'alert preferences'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching preferences',
          error.message,
        ),
      );
    }
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending jobs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Trending jobs fetched successfully' })
  async getTrendingJobs(
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    try {
      const jobLimit = limit ? parseInt(limit, 10) : 10;
      const trendingJobs = await this.jobAlertsService.getTrendingJobs(jobLimit);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          trendingJobs,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'trending jobs'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching trending jobs',
          error.message,
        ),
      );
    }
  }
}

