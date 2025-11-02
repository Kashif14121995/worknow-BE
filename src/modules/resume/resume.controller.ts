import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { ResumeService } from './resume.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { FileValidationInterceptor } from 'src/common/interceptors/file-validation.interceptor';

@Controller('resume')
@ApiTags('Resume')
@ApiBearerAuth()
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload and parse resume' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'autoPopulate', required: false, type: Boolean, description: 'Auto-populate profile from resume' })
  @ApiResponse({ status: 201, description: 'Resume uploaded and parsed successfully' })
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  async uploadResume(
    @UploadedFile() file: Express.Multer.File,
    @Query('autoPopulate') autoPopulate: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!file) {
        return res.status(this.http.STATUS_BAD_REQUEST).json(
          new ErrorResponse(
            this.http.STATUS_BAD_REQUEST,
            'File is required',
            'Please upload a resume file',
          ),
        );
      }

      const userId = req.user.id;
      const shouldAutoPopulate = autoPopulate !== 'false';

      const resume = await this.resumeService.uploadResume(userId, file, shouldAutoPopulate);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          resume,
          resume.isProcessed
            ? 'Resume uploaded and parsed successfully. Profile has been updated.'
            : 'Resume uploaded successfully. Parsing may be pending.',
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error uploading resume',
          error.message,
        ),
      );
    }
  }

  @Get('my-resumes')
  @ApiOperation({ summary: 'Get user\'s uploaded resumes' })
  @ApiResponse({ status: 200, description: 'Resumes fetched successfully' })
  async getMyResumes(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const resumes = await this.resumeService.getUserResumes(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          resumes,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'resumes'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching resumes',
          error.message,
        ),
      );
    }
  }

  @Get(':resumeId')
  @ApiOperation({ summary: 'Get resume by ID' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume fetched successfully' })
  async getResume(
    @Param('resumeId') resumeId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const resume = await this.resumeService.getResume(resumeId, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          resume,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'resume'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error fetching resume',
          error.message,
        ),
      );
    }
  }

  @Delete(':resumeId')
  @ApiOperation({ summary: 'Delete resume' })
  @ApiParam({ name: 'resumeId', description: 'Resume ID' })
  @ApiResponse({ status: 200, description: 'Resume deleted successfully' })
  async deleteResume(
    @Param('resumeId') resumeId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      await this.resumeService.deleteResume(resumeId, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          null,
          'Resume deleted successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error deleting resume',
          error.message,
        ),
      );
    }
  }
}

