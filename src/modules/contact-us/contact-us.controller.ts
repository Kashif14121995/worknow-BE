import { Body, Controller, Post, Res, Get } from '@nestjs/common';
import { Response } from 'express';
import { ContactUsService } from './contact-us.service';
import { HttpStatusCodesService } from 'src/modules/http_status_codes/http_status_codes.service';
import { Public } from 'src/plugin/public';
import { ErrorResponse, SuccessResponse } from 'src/common/utils/response';
import { ContactUsDto } from './dto/contact-us.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Contact Us') // Group in Swagger UI
@Controller('contact-us')
export class ContactUsController {
  constructor(
    private readonly contactUsService: ContactUsService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a contact us form message' })
  @ApiBody({ type: ContactUsDto })
  @ApiResponse({ status: 201, description: 'Message submitted successfully' })
  @ApiResponse({ status: 409, description: 'Already Submitted' })
  @ApiResponse({ status: 500, description: 'Submission Failed' })
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
  @ApiOperation({ summary: 'Get all submitted messages' })
  @ApiResponse({ status: 200, description: 'All messages fetched' })
  @ApiResponse({ status: 500, description: 'Failed to fetch messages' })
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
