import { Body, Controller, Post, Res, Get } from '@nestjs/common';
import { Response } from 'express';
import { ContactUsService } from './contact-us.service';
import { HttpStatusCodesService } from 'src/http_status_codes/http_status_codes.service';
import { Public } from 'src/plugin/public';
import { ErrorResponse, SuccessResponse } from 'src/utils/response';
import { ContactUsDto } from 'src/dto';

@Controller('contact-us')
export class ContactUsController {
  constructor(
    private readonly contactUsService: ContactUsService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Public()
  @Post()
  async submit(
    @Body() body: ContactUsDto,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.contactUsService.submit(body);
      res
        .status(this.http.STATUS_SUCCESSFULLY_CREATION)
        .json(new SuccessResponse(result, 'Message submitted successfully'));
    } catch (error) {
      if (error.name === 'ConflictException') {
        res
          .status(this.http.STATUS_ALREADY_EXIST)
          .json(
            new ErrorResponse(
              this.http.STATUS_ALREADY_EXIST,
              'Already Submitted',
              error.message,
            ),
          );
      } else {
        res
          .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
          .json(
            new ErrorResponse(
              this.http.STATUS_INTERNAL_SERVER_ERROR,
              'Submission Failed',
              error.message,
            ),
          );
      }
    }
  }

  @Get('list')
  async getAll(@Res() res: Response): Promise<void> {
    try {
      const entries = await this.contactUsService.findAll();
      res
        .status(this.http.STATUS_OK)
        .json(new SuccessResponse(entries, 'All messages fetched'));
    } catch (error) {
      res
        .status(this.http.STATUS_INTERNAL_SERVER_ERROR)
        .json(
          new ErrorResponse(
            this.http.STATUS_INTERNAL_SERVER_ERROR,
            'Failed to fetch messages',
            error.message,
          ),
        );
    }
  }
}
