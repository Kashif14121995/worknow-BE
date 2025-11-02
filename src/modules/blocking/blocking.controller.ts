import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { BlockingService } from './blocking.service';
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
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { UserRole, BlockReason } from 'src/constants';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('blocking')
@ApiTags('Blocking')
@ApiBearerAuth()
export class BlockingController {
  constructor(
    private readonly blockingService: BlockingService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post('block/:seekerId')
  @Roles(UserRole.job_provider)
  @ApiOperation({ summary: 'Block a worker from applying to your jobs (Provider only)' })
  @ApiParam({ name: 'seekerId', description: 'Worker/Seeker ID to block' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: {
          enum: Object.values(BlockReason),
          description: 'Reason for blocking',
        },
        description: {
          type: 'string',
          description: 'Additional details',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({ status: 201, description: 'Worker blocked successfully' })
  async blockWorker(
    @Param('seekerId') seekerId: string,
    @Body('reason') reason: BlockReason,
    @Body('description') description: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const listerId = req.user.id;
      const block = await this.blockingService.blockWorker(listerId, seekerId, reason, description);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          block,
          'Worker blocked successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('already') || error.message.includes('Only')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error blocking worker',
          error.message,
        ),
      );
    }
  }

  @Get('blocked-workers')
  @Roles(UserRole.job_provider)
  @ApiOperation({ summary: 'Get list of blocked workers (Provider only)' })
  @ApiResponse({ status: 200, description: 'Blocked workers fetched successfully' })
  async getBlockedWorkers(@Req() req: Request, @Res() res: Response) {
    try {
      const listerId = req.user.id;
      const blockedWorkers = await this.blockingService.getBlockedWorkers(listerId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          blockedWorkers,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'blocked workers'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching blocked workers',
          error.message,
        ),
      );
    }
  }

  @Patch('unblock/:blockId')
  @Roles(UserRole.job_provider, UserRole.admin)
  @ApiOperation({ summary: 'Unblock a worker (Provider/Admin)' })
  @ApiParam({ name: 'blockId', description: 'Block ID' })
  @ApiResponse({ status: 200, description: 'Worker unblocked successfully' })
  async unblockWorker(
    @Param('blockId') blockId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const adminId = req.user.role === UserRole.admin ? req.user.id : undefined;
      const block = await this.blockingService.unblockWorker(blockId, adminId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          block,
          UPDATE_SUCCESS.replace('{{entity}}', 'block status'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error unblocking worker',
          error.message,
        ),
      );
    }
  }

  @Get('all')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get all blocks (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Blocks fetched successfully' })
  async getAllBlocks(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    try {
      const pageNumber = page ? parseInt(page, 10) : 1;
      const pageLimit = limit ? parseInt(limit, 10) : 20;

      const data = await this.blockingService.getAllBlocks(pageNumber, pageLimit);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'blocks'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching blocks',
          error.message,
        ),
      );
    }
  }
}

