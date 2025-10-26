import { Controller, Get, UseGuards, Req, ForbiddenException, Res, Query, Post, HttpStatus, Body } from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UserRole } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Controller('dashboard')
@ApiTags('Dashboard')
@ApiBearerAuth()
export class DashboardController {
    constructor(
        private readonly http: HttpStatusCodesService,
        private readonly dashboardService: DashboardService
    ) { }

    @Get()
    async getProviderDashboardStats(@Req() req: Request, @Res() res: Response) {
        try {
            const user = (req as any).user;
            if (!user || user.role !== UserRole.job_provider) {
                throw new ForbiddenException('Access restricted to providers');
            }

            const providerId = user.id;
            const data = await this.dashboardService.getProviderDashboardStats(providerId);

            return res
                .status(this.http.STATUS_OK)
                .json(
                    new SuccessResponse(
                        data,
                        DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'dashboard'),
                    ),
                );
        } catch (error) {
            // log error as needed
            console.error(error);
            const status =
                error instanceof ForbiddenException
                    ? this.http.STATUS_UNAUTHORIZED
                    : this.http.STATUS_INTERNAL_SERVER_ERROR;

            return res.status(status).json({
                status: 'error',
                message: error.message || 'Internal server error',
            });
        }
    }

    @Get('upcoming-shifts')
    @ApiOperation({ summary: 'Get all upcoming shifts listings (paginated)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'searchText', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Upcoming shifts fetched successfully' })
    async getUpcomingShifts(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_provider) {
                throw new ForbiddenException('Access restricted to providers');
            }
            const pageNumber = req.query.page
                ? parseInt(String(req.query.page), 10)
                : 1;
            const pageLimit = req.query.limit
                ? parseInt(String(req.query.limit), 10)
                : 10;
            const searchText = req.query.searchText
                ? String(req.query.searchText)
                : '';

            const data = await this.dashboardService.getUpcomingShifts(
                userId,
                searchText,
                pageNumber,
                pageLimit,
            );

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'upcoming shifts'),
                ),
            );
        } catch (error) {
            console.error(error);

            const status =
                error instanceof ForbiddenException
                    ? HttpStatus.UNAUTHORIZED
                    : HttpStatus.INTERNAL_SERVER_ERROR;

            return res.status(status).json({
                status: 'error',
                message: error.message || 'Internal server error',
            });
        }
    }
}
