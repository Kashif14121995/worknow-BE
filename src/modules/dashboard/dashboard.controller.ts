import { Controller, Get, UseGuards, Req, ForbiddenException, Res, Query, Post, HttpStatus, Body, Patch } from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UserRole, UPDATE_SUCCESS, UPDATE_ERROR } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { 
  UpdateWorkExperienceDto, 
  UpdateAvailabilityDto, 
  UpdateWorkLocationDto, 
  UpdateIdentityDto,
  UpdateEducationDto
} from './dto/update-seeker-profile.dto';

@Controller('dashboard')
@ApiTags('Dashboard')
@ApiBearerAuth()
export class DashboardController {
    constructor(
        private readonly http: HttpStatusCodesService,
        private readonly dashboardService: DashboardService
    ) { }

    @Get()
    @Roles(UserRole.job_provider)
    @ApiOperation({ summary: 'Get provider dashboard statistics' })
    async getProviderDashboardStats(@Req() req: Request, @Res() res: Response) {
        try {
            const user = (req as any).user;
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

    // Job Seeker Dashboard Endpoints
    @Get('seeker')
    @ApiOperation({ summary: 'Get job seeker dashboard statistics' })
    @ApiResponse({ status: 200, description: 'Dashboard stats fetched successfully' })
    async getSeekerDashboard(@Req() req: Request, @Res() res: Response) {
        try {
            const user = (req as any).user;
            if (!user || user.role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
            }

            const seekerId = user.id;
            const data = await this.dashboardService.getSeekerDashboardStats(seekerId);

            return res
                .status(this.http.STATUS_OK)
                .json(
                    new SuccessResponse(
                        data,
                        DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'dashboard'),
                    ),
                );
        } catch (error) {
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

    @Get('seeker/recommended-gigs')
    @ApiOperation({ summary: 'Get recommended gigs for job seeker' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'searchText', required: false, type: String })
    @ApiQuery({ name: 'timeframe', required: false, type: String, enum: ['All-time', 'Today', 'This Week', 'This Month'] })
    @ApiResponse({ status: 200, description: 'Recommended gigs fetched successfully' })
    async getRecommendedGigs(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
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
            const timeframe = req.query.timeframe
                ? String(req.query.timeframe)
                : 'All-time';

            const data = await this.dashboardService.getRecommendedGigs(
                userId,
                pageNumber,
                pageLimit,
                searchText,
                timeframe,
            );

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'recommended gigs'),
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

    @Get('seeker/applications')
    @ApiOperation({ summary: 'Get all applications submitted by job seeker' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Applications fetched successfully' })
    async getSeekerApplications(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
            }

            const pageNumber = req.query.page
                ? parseInt(String(req.query.page), 10)
                : 1;
            const pageLimit = req.query.limit
                ? parseInt(String(req.query.limit), 10)
                : 10;
            const status = req.query.status
                ? String(req.query.status)
                : undefined;

            const data = await this.dashboardService.getSeekerApplications(
                userId,
                pageNumber,
                pageLimit,
                status,
            );

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'applications'),
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

    @Get('seeker/earnings')
    @ApiOperation({ summary: 'Get detailed earnings for job seeker' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Earnings fetched successfully' })
    async getSeekerEarnings(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
            }

            const pageNumber = req.query.page
                ? parseInt(String(req.query.page), 10)
                : 1;
            const pageLimit = req.query.limit
                ? parseInt(String(req.query.limit), 10)
                : 10;

            const data = await this.dashboardService.getSeekerEarningsDetail(
                userId,
                pageNumber,
                pageLimit,
            );

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'earnings'),
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

    @Get('seeker/active-jobs')
    @ApiOperation({ summary: 'Get active jobs available for job seeker (Find Gig)' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'searchText', required: false, type: String })
    @ApiResponse({ status: 200, description: 'Active jobs fetched successfully' })
    async getActiveJobsForSeeker(
        @Req() req: Request,
        @Res() res: Response,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
            }

            const pageNumber = req.query.page
                ? parseInt(String(req.query.page), 10)
                : 1;
            const pageLimit = req.query.limit
                ? parseInt(String(req.query.limit), 10)
                : 10;
            const searchText = req.query.searchText
                ? String(req.query.searchText)
                : undefined;

            const data = await this.dashboardService.getActiveJobsForSeeker(
                userId,
                pageNumber,
                pageLimit,
                searchText,
            );

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'active jobs'),
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

    // Profile Setup Update Endpoints
    @Patch('seeker/profile/work-experience')
    @ApiOperation({ summary: 'Update work experience for job seeker' })
    @ApiBody({ type: UpdateWorkExperienceDto })
    @ApiResponse({ status: 200, description: 'Work experience updated successfully' })
    async updateWorkExperience(
        @Req() req: Request,
        @Res() res: Response,
        @Body() dto: UpdateWorkExperienceDto,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
            }

            const data = await this.dashboardService.updateSeekerWorkExperience(userId, dto.experience);

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    UPDATE_SUCCESS.replace('{{entity}}', 'work experience'),
                ),
            );
        } catch (error) {
            console.error(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
                new ErrorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    UPDATE_ERROR.replace('{{entity}}', 'work experience'),
                    error.message,
                ),
            );
        }
    }

    @Patch('seeker/profile/availability')
    @ApiOperation({ summary: 'Update availability/skills for job seeker' })
    @ApiBody({ type: UpdateAvailabilityDto })
    @ApiResponse({ status: 200, description: 'Availability updated successfully' })
    async updateAvailability(
        @Req() req: Request,
        @Res() res: Response,
        @Body() dto: UpdateAvailabilityDto,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
            }

            const data = await this.dashboardService.updateSeekerAvailability(userId, dto.skills);

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    UPDATE_SUCCESS.replace('{{entity}}', 'availability'),
                ),
            );
        } catch (error) {
            console.error(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
                new ErrorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    UPDATE_ERROR.replace('{{entity}}', 'availability'),
                    error.message,
                ),
            );
        }
    }

    @Patch('seeker/profile/work-location')
    @ApiOperation({ summary: 'Update preferred work location for job seeker' })
    @ApiBody({ type: UpdateWorkLocationDto })
    @ApiResponse({ status: 200, description: 'Work location updated successfully' })
    async updateWorkLocation(
        @Req() req: Request,
        @Res() res: Response,
        @Body() dto: UpdateWorkLocationDto,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
            }

            const data = await this.dashboardService.updateSeekerWorkLocation(userId, dto.location);

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    UPDATE_SUCCESS.replace('{{entity}}', 'work location'),
                ),
            );
        } catch (error) {
            console.error(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
                new ErrorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    UPDATE_ERROR.replace('{{entity}}', 'work location'),
                    error.message,
                ),
            );
        }
    }

    @Patch('seeker/profile/education')
    @ApiOperation({ summary: 'Update education for job seeker' })
    @ApiBody({ type: UpdateEducationDto })
    @ApiResponse({ status: 200, description: 'Education updated successfully' })
    async updateEducation(
        @Req() req: Request,
        @Res() res: Response,
        @Body() dto: UpdateEducationDto,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
            }

            const data = await this.dashboardService.updateSeekerEducation(userId, dto.education);

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    UPDATE_SUCCESS.replace('{{entity}}', 'education'),
                ),
            );
        } catch (error) {
            console.error(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
                new ErrorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    UPDATE_ERROR.replace('{{entity}}', 'education'),
                    error.message,
                ),
            );
        }
    }

    @Patch('seeker/profile/identity')
    @ApiOperation({ summary: 'Update identity document for job seeker' })
    @ApiBody({ type: UpdateIdentityDto })
    @ApiResponse({ status: 200, description: 'Identity document updated successfully' })
    async updateIdentity(
        @Req() req: Request,
        @Res() res: Response,
        @Body() dto: UpdateIdentityDto,
    ) {
        try {
            const userId = req?.user?.id;
            const role = req?.user?.role;

            if (!req.user || role !== UserRole.job_seeker) {
                throw new ForbiddenException('Access restricted to job seekers');
            }

            const data = await this.dashboardService.updateSeekerIdentity(userId, dto.identityDocument);

            return res.status(HttpStatus.OK).json(
                new SuccessResponse(
                    data,
                    UPDATE_SUCCESS.replace('{{entity}}', 'identity document'),
                ),
            );
        } catch (error) {
            console.error(error);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
                new ErrorResponse(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    UPDATE_ERROR.replace('{{entity}}', 'identity document'),
                    error.message,
                ),
            );
        }
    }
}
