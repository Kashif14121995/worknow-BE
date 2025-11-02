import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { SubscriptionService } from './subscription.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { SubscriptionPlan } from 'src/schemas/subscription.schema';

@Controller('subscriptions')
@ApiTags('Subscriptions')
@ApiBearerAuth()
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Get('plans')
  @ApiOperation({ summary: 'Get available subscription plans' })
  @ApiResponse({ status: 200, description: 'Plans fetched successfully' })
  async getPlans(@Res() res: Response) {
    try {
      const plans = this.subscriptionService.getPlans();

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          plans,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'subscription plans'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching plans',
          error.message,
        ),
      );
    }
  }

  @Get('my-subscription')
  @ApiOperation({ summary: 'Get user\'s current subscription' })
  @ApiResponse({ status: 200, description: 'Subscription fetched successfully' })
  async getMySubscription(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const subscription = await this.subscriptionService.getUserSubscription(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          subscription,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'subscription'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching subscription',
          error.message,
        ),
      );
    }
  }

  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to a plan' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        plan: { enum: Object.values(SubscriptionPlan) },
        paymentMethodId: { type: 'string' },
      },
      required: ['plan'],
    },
  })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async subscribe(
    @Body('plan') plan: SubscriptionPlan,
    @Body('paymentMethodId') paymentMethodId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const subscription = await this.subscriptionService.subscribe(userId, plan, paymentMethodId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          subscription,
          'Subscription created successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('already') || error.message.includes('Invalid')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error creating subscription',
          error.message,
        ),
      );
    }
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription cancelled successfully' })
  async cancelSubscription(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const subscription = await this.subscriptionService.cancelSubscription(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          subscription,
          'Subscription cancelled successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error cancelling subscription',
          error.message,
        ),
      );
    }
  }
}

