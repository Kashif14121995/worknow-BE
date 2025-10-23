import { Controller, Get, UseGuards, Req, ForbiddenException, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
}
