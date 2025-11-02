import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { NotificationService } from './notification.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Controller('notifications')
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for authenticated user' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean, description: 'Filter unread only' })
  @ApiResponse({ status: 200, description: 'Notifications fetched successfully' })
  async getNotifications(
    @Req() req: Request,
    @Res() res: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    try {
      const userId = req.user.id;
      const pageNumber = page ? parseInt(page, 10) : 1;
      const pageLimit = limit ? parseInt(limit, 10) : 20;
      const unreadOnlyFlag = unreadOnly === 'true';

      const data = await this.notificationService.getUserNotifications(
        userId,
        pageNumber,
        pageLimit,
        unreadOnlyFlag,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'notifications'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching notifications',
          error.message,
        ),
      );
    }
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count fetched successfully' })
  async getUnreadCount(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const count = await this.notificationService.getUnreadCount(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          { unreadCount: count },
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'unread count'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching unread count',
          error.message,
        ),
      );
    }
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markAsRead(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const notification = await this.notificationService.markAsRead(id, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          notification,
          UPDATE_SUCCESS.replace('{{entity}}', 'notification'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error marking notification as read',
          error.message,
        ),
      );
    }
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      await this.notificationService.markAllAsRead(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          null,
          UPDATE_SUCCESS.replace('{{entity}}', 'notifications'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error marking notifications as read',
          error.message,
        ),
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async deleteNotification(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      await this.notificationService.deleteNotification(id, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          null,
          'Notification deleted successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error deleting notification',
          error.message,
        ),
      );
    }
  }

  @Delete('read/all')
  @ApiOperation({ summary: 'Delete all read notifications' })
  @ApiResponse({ status: 200, description: 'Read notifications deleted successfully' })
  async deleteAllRead(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      await this.notificationService.deleteAllReadNotifications(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          null,
          'Read notifications deleted successfully',
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error deleting read notifications',
          error.message,
        ),
      );
    }
  }
}

