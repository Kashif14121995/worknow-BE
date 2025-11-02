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
import { ShiftService } from './shift.service';
import { CreateShiftDto } from './dto/create-shift.dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto/update-shift.dto';
import { AssignShiftDto } from './dto/assign-shift.dto/assign-shift.dto';
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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@Controller('shifts')
@ApiTags('Shifts')
@ApiBearerAuth()
export class ShiftController {
  private readonly FIND_SHIFTS_ERROR = `Error fetching shifts`;
  private readonly FIND_SHIFT_ERROR = `Error fetching shift details`;

  constructor(
    private readonly shiftService: ShiftService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post('listing')
  @ApiOperation({ summary: 'Create a new shift' })
  @ApiBody({ type: CreateShiftDto })
  async create(
    @Body() dto: CreateShiftDto,
    @Req() request: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const userId = request.user.id;
      const data = await this.shiftService.create(dto, userId);
      return res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
        .json(
          new SuccessResponse(
            data,
            CREATED_SUCCESS.replace('{{entity}}', 'shift'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            CREATED_ERROR.replace('{{entity}}', 'shift'),
            error.message,
          ),
        );
    }
  }

  @Get('listing')
  @ApiOperation({ summary: 'Get all shifts (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchText', required: false, type: String })
  async findAll(
    @Req() request: Request,
    @Res() res: Response,
    @Query() pagination: PaginationDto,
    @Query('searchText') searchText?: string,
  ): APIResponse {
    try {
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const data = await this.shiftService.findAll({ page, limit, searchText });
      return res
        .status(this.http.STATUS_OK)
        .json(
          new SuccessResponse(
            data,
            DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'shift'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            this.FIND_SHIFTS_ERROR,
            error.message,
          ),
        );
    }
  }

  @Get('listing/:id')
  @ApiOperation({ summary: 'Get a shift by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(
    @Param('id') id: string,
    @Res() res: Response,
  ): APIResponse {
    try {
      const data = await this.shiftService.findOne(id);
      return res
        .status(this.http.STATUS_OK)
        .json(
          new SuccessResponse(
            data,
            DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'shift'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            this.FIND_SHIFT_ERROR,
            error.message,
          ),
        );
    }
  }

  @Patch('listing/:id')
  @ApiOperation({ summary: 'Update a shift by ID' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
    @Res() res: Response,
  ): APIResponse {
    try {
      const data = await this.shiftService.update(id, dto);
      return res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
        .json(
          new SuccessResponse(
            data,
            UPDATE_SUCCESS.replace('{{entity}}', 'shift'),
          ),
        );
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            UPDATE_ERROR.replace('{{entity}}', 'shift'),
            error.message,
          ),
        );
    }
  }

  @Delete('listing/:id')
  @ApiOperation({ summary: 'Delete a shift by ID' })
  async remove(
    @Param('id') id: string,
    @Res() res: Response,
  ): APIResponse {
    try {
      const data = await this.shiftService.remove(id);
      return res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(data, 'Shift deleted successfully'));
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            'Error deleting shift',
            error.message,
          ),
        );
    }
  }

  @Post('listing/:id/assign')
  @ApiOperation({ summary: 'Assign users to a shift' })
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignShiftDto,
    @Res() res: Response,
  ): APIResponse {
    try {
      const data = await this.shiftService.assignAssignees(id, dto);
      return res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
        .json(new SuccessResponse(data, 'Shift assigned successfully'));
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            'Error assigning shift',
            error.message,
          ),
        );
    }
  }

  @Post('listing/:id/unassign')
  @ApiOperation({ summary: 'Unassign users from a shift' })
  async unassign(
    @Param('id') id: string,
    @Body() dto: AssignShiftDto,
    @Res() res: Response,
  ): APIResponse {
    try {
      const data = await this.shiftService.unassignAssignees(id, dto);
      return res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(data, 'Shift unassigned successfully'));
    } catch (error) {
      return res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            'Error unassigning shift',
            error.message,
          ),
        );
    }
  }

  // Job Seeker Shift Options (3-dot menu) - These routes must come before the list route to avoid conflicts
  @Get('seeker/:id')
  @ApiOperation({ summary: 'Get shift details for job seeker (View Details option)' })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  @ApiResponse({ status: 200, description: 'Shift details fetched successfully' })
  async getSeekerShiftDetails(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const userId = request.user.id;
      const role = request.user.role;

      if (role !== 'job_seeker') {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job seekers',
            'Only job seekers can access this endpoint',
          ),
        );
      }

      const data = await this.shiftService.getSeekerShiftDetails(id, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'shift details'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching shift details',
          error.message,
        ),
      );
    }
  }

  @Post('seeker/:id/cancel')
  @ApiOperation({ summary: 'Cancel/withdraw from a shift (Cancel option from 3-dot menu)' })
  @ApiParam({ name: 'id', description: 'Shift ID to cancel' })
  @ApiResponse({ status: 200, description: 'Shift cancelled successfully' })
  async cancelSeekerShift(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const userId = request.user.id;
      const role = request.user.role;

      if (role !== 'job_seeker') {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job seekers',
            'Only job seekers can cancel their shifts',
          ),
        );
      }

      const data = await this.shiftService.cancelSeekerShift(id, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          'Shift cancelled successfully',
        ),
      );
    } catch (error) {
      const statusCode = error.message.includes('not found') || error.message.includes('not assigned')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('already started')
          ? this.http.STATUS_BAD_REQUEST
          : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(statusCode).json(
        new ErrorResponse(
          statusCode,
          'Error cancelling shift',
          error.message,
        ),
      );
    }
  }

  @Get('seeker/:id/employer-contact')
  @ApiOperation({ summary: 'Get employer contact info for a shift (Contact option from 3-dot menu)' })
  @ApiParam({ name: 'id', description: 'Shift ID' })
  @ApiResponse({ status: 200, description: 'Employer contact info fetched successfully' })
  async getShiftEmployerContact(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() res: Response,
  ): APIResponse {
    try {
      const userId = request.user.id;
      const role = request.user.role;

      if (role !== 'job_seeker') {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job seekers',
            'Only job seekers can access this endpoint',
          ),
        );
      }

      const data = await this.shiftService.getShiftEmployerContact(id, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'employer contact'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching employer contact',
          error.message,
        ),
      );
    }
  }

  // Job Seeker Shift Management - List shifts by status
  @Get('seeker')
  @ApiOperation({ summary: 'Get shifts for job seeker by status' })
  @ApiQuery({ name: 'status', required: true, enum: ['upcoming', 'applied', 'shortlisted', 'completed'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSeekerShifts(
    @Req() request: Request,
    @Res() res: Response,
    @Query('status') status: 'upcoming' | 'applied' | 'shortlisted' | 'completed',
    @Query() pagination: PaginationDto,
  ): APIResponse {
    try {
      const userId = request.user.id;
      const role = request.user.role;

      if (role !== 'job_seeker') {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job seekers',
            'Only job seekers can access this endpoint',
          ),
        );
      }

      if (!status || !['upcoming', 'applied', 'shortlisted', 'completed'].includes(status)) {
        return res.status(this.http.STATUS_BAD_REQUEST).json(
          new ErrorResponse(
            this.http.STATUS_BAD_REQUEST,
            'Invalid status',
            'Status must be one of: upcoming, applied, shortlisted, completed',
          ),
        );
      }

      const page = pagination.page || 1;
      const limit = pagination.limit || 10;

      const data = await this.shiftService.getSeekerShifts(userId, status, page, limit);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'shifts'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching shifts',
          error.message,
        ),
      );
    }
  }
}
