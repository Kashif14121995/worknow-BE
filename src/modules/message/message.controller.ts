import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, CREATED_SUCCESS, CREATED_ERROR } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Controller('messages')
@ApiTags('Messages')
@ApiBearerAuth()
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Body() dto: CreateMessageDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const senderId = request.user.id;
      const message = await this.messageService.sendMessage(senderId, dto);
      return res.status(this.http.STATUS_SUCCESSFULLY_CREATION).json(
        new SuccessResponse(
          message,
          CREATED_SUCCESS.replace('{{entity}}', 'message'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          CREATED_ERROR.replace('{{entity}}', 'message'),
          error.message,
        ),
      );
    }
  }

  @Get('conversation/:userId')
  @ApiOperation({ summary: 'Get conversation between current user and another user' })
  @ApiParam({ name: 'userId', description: 'User ID to get conversation with' })
  @ApiQuery({ name: 'jobId', required: false, description: 'Filter by job ID' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Conversation fetched successfully' })
  async getConversation(
    @Param('userId') userId: string,
    @Query('jobId') jobId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const currentUserId = request.user.id;
      const conversation = await this.messageService.getConversation(
        currentUserId,
        userId,
        jobId,
        Number(page),
        Number(limit),
      );
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          conversation,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'conversation'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching conversation',
          error.message,
        ),
      );
    }
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Conversations fetched successfully' })
  async getConversations(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const conversations = await this.messageService.getConversations(
        userId,
        Number(page),
        Number(limit),
      );
      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          conversations,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'conversations'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching conversations',
          error.message,
        ),
      );
    }
  }
}

