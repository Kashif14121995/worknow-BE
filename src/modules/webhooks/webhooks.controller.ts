import { Controller, Post, Headers, Body, Req, Res, RawBodyRequest } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from 'src/plugin/public';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Public()
  @Post('stripe')
  @ApiOperation({ summary: 'Stripe webhook endpoint' })
  @ApiHeader({ name: 'stripe-signature', required: true, description: 'Stripe signature header' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ) {
    try {
      await this.webhooksService.handleStripeWebhook(req.rawBody, signature);
      res.status(200).json({ received: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
