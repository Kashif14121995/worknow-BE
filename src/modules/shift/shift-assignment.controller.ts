import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  Patch,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { ShiftAssignmentService } from './shift-assignment.service';
import { CheckInDto, CheckOutDto } from './dto/check-in-out.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { UserRole } from 'src/constants';

@Controller('shifts')
@ApiTags('Shift Assignment')
@ApiBearerAuth()
export class ShiftAssignmentController {
  constructor(
    private readonly shiftAssignmentService: ShiftAssignmentService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post(':shiftId/check-in')
  @ApiOperation({ summary: 'Check-in for a shift (Worker only)' })
  @ApiParam({ name: 'shiftId', description: 'Shift ID' })
  @ApiBody({ type: CheckInDto })
  @ApiResponse({ status: 200, description: 'Checked in successfully' })
  @ApiResponse({ status: 400, description: 'Already checked in or invalid request' })
  async checkIn(
    @Param('shiftId') shiftId: string,
    @Body() dto: CheckInDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const role = req.user.role;

      if (role !== UserRole.job_seeker) {
        return res.status(this.http.STATUS_FORBIDDEN).json(
          new ErrorResponse(
            this.http.STATUS_FORBIDDEN,
            'Only workers can check in',
            'Forbidden',
          ),
        );
      }

      const assignment = await this.shiftAssignmentService.checkIn(shiftId, userId, dto);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          assignment,
          'Checked in successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('Already') || error.message.includes('Must')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Check-in failed',
          error.message,
        ),
      );
    }
  }

  @Post(':shiftId/check-out')
  @ApiOperation({ summary: 'Check-out from a shift (Worker only)' })
  @ApiParam({ name: 'shiftId', description: 'Shift ID' })
  @ApiBody({ type: CheckOutDto })
  @ApiResponse({ status: 200, description: 'Checked out successfully' })
  @ApiResponse({ status: 400, description: 'Must check in first or already checked out' })
  async checkOut(
    @Param('shiftId') shiftId: string,
    @Body() dto: CheckOutDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const role = req.user.role;

      if (role !== UserRole.job_seeker) {
        return res.status(this.http.STATUS_FORBIDDEN).json(
          new ErrorResponse(
            this.http.STATUS_FORBIDDEN,
            'Only workers can check out',
            'Forbidden',
          ),
        );
      }

      const assignment = await this.shiftAssignmentService.checkOut(shiftId, userId, dto);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          assignment,
          'Checked out successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('Must') || error.message.includes('Already')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Check-out failed',
          error.message,
        ),
      );
    }
  }

  @Get(':shiftId/assignment')
  @ApiOperation({ summary: 'Get shift assignment details (Worker)' })
  @ApiParam({ name: 'shiftId', description: 'Shift ID' })
  @ApiResponse({ status: 200, description: 'Assignment fetched successfully' })
  async getAssignment(
    @Param('shiftId') shiftId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const assignment = await this.shiftAssignmentService.getAssignment(shiftId, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          assignment,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'assignment'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error fetching assignment',
          error.message,
        ),
      );
    }
  }

  @Get(':shiftId/assignments')
  @ApiOperation({ summary: 'Get all assignments for a shift (Provider)' })
  @ApiParam({ name: 'shiftId', description: 'Shift ID' })
  @ApiResponse({ status: 200, description: 'Assignments fetched successfully' })
  async getShiftAssignments(
    @Param('shiftId') shiftId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const role = req.user.role;

      if (role !== UserRole.job_provider) {
        return res.status(this.http.STATUS_FORBIDDEN).json(
          new ErrorResponse(
            this.http.STATUS_FORBIDDEN,
            'Only providers can view all assignments',
            'Forbidden',
          ),
        );
      }

      const assignments = await this.shiftAssignmentService.getShiftAssignments(shiftId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          assignments,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'assignments'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching assignments',
          error.message,
        ),
      );
    }
  }

  @Patch(':shiftId/assignment/:workerId/rating')
  @ApiOperation({ summary: 'Rate a worker after shift completion (Provider)' })
  @ApiParam({ name: 'shiftId', description: 'Shift ID' })
  @ApiParam({ name: 'workerId', description: 'Worker ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rating: { type: 'number', minimum: 1, maximum: 5 },
        feedback: { type: 'string' },
      },
      required: ['rating'],
    },
  })
  @ApiResponse({ status: 200, description: 'Rating added successfully' })
  async addRating(
    @Param('shiftId') shiftId: string,
    @Param('workerId') workerId: string,
    @Body('rating') rating: number,
    @Body('feedback') feedback: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const providerId = req.user.id;
      const role = req.user.role;

      if (role !== UserRole.job_provider) {
        return res.status(this.http.STATUS_FORBIDDEN).json(
          new ErrorResponse(
            this.http.STATUS_FORBIDDEN,
            'Only providers can rate workers',
            'Forbidden',
          ),
        );
      }

      const assignment = await this.shiftAssignmentService.addRating(
        shiftId,
        workerId,
        providerId,
        rating,
        feedback,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          assignment,
          UPDATE_SUCCESS.replace('{{entity}}', 'rating'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('can only rate') || error.message.includes('must be between')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error adding rating',
          error.message,
        ),
      );
    }
  }
}

