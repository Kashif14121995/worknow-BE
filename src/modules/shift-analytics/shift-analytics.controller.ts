import {
  Controller,
  Get,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { ShiftAnalyticsService } from './shift-analytics.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { UserRole } from 'src/constants';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('shift-analytics')
@ApiTags('Shift Analytics')
@ApiBearerAuth()
@Roles(UserRole.job_provider)
export class ShiftAnalyticsController {
  constructor(
    private readonly analyticsService: ShiftAnalyticsService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Get('')
  @ApiOperation({ summary: 'Get shift analytics (Provider only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  @ApiQuery({ name: 'workerId', required: false, type: String })
  @ApiQuery({ name: 'jobId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Analytics fetched successfully' })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('workerId') workerId?: string,
    @Query('jobId') jobId?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    try {
      const providerId = req.user.id;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const analytics = await this.analyticsService.getProviderShiftAnalytics(
        providerId,
        start,
        end,
        workerId,
        jobId,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          analytics,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'shift analytics'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching analytics',
          error.message,
        ),
      );
    }
  }

  @Get('export-csv')
  @ApiOperation({ summary: 'Export shift analytics as CSV (Provider only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'CSV exported successfully' })
  async exportCSV(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Req() req?: Request,
    @Res() res?: Response,
  ) {
    try {
      const providerId = req.user.id;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const csvBuffer = await this.analyticsService.exportShiftAnalyticsToCSV(
        providerId,
        start,
        end,
      );

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=shift-analytics-${Date.now()}.csv`);
      res.send(csvBuffer);
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error exporting CSV',
          error.message,
        ),
      );
    }
  }
}

