import { Body, Controller, Post, Res, Get } from '@nestjs/common';
import { Response } from 'express';
import { NewsletterService } from './newsletter.service';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';
import { Public } from 'src/plugin/public';
import { ErrorResponse, SuccessResponse } from 'src/utils/response';
import { SubscribeDto } from 'src/dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(
    private readonly newsletterService: NewsletterService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Public()
  @Post('subscribe')
  async subscribe(
    @Body() body: SubscribeDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.newsletterService.subscribe(body.email);
      res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
        .json(new SuccessResponse(result, 'Subscribed successfully'));
    } catch (error) {
      if (error.name === 'ConflictException') {
        res
          .status(this.http.STATUS_ALREADY_EXIST)
          .json(
            new ErrorResponse(
              this.http.STATUS_ALREADY_EXIST,
              'Already Subscribed',
              error.message,
            ),
          );
      } else {
        res
          .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
          .json(
            new ErrorResponse(
              this.http.STATUS_INTERNAL_SERVER_ERROR,
              'Subscription Failed',
              error.message,
            ),
          );
      }
    }
  }

  @Get()
  async getAll(@Res() res: Response): Promise<void> {
    try {
      const emails = await this.newsletterService.findAll();
      res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(emails, 'All subscribers fetched'));
    } catch (error) {
      res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            'Failed to fetch subscribers',
            error.message,
          ),
        );
    }
  }
}
