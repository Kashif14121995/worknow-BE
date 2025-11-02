import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { VerificationService } from './verification.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { UserRole, VerificationStatus } from 'src/constants';
import { VerificationDocumentType } from 'src/schemas/user-verification.schema';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FileValidationInterceptor } from 'src/common/interceptors/file-validation.interceptor';

@Controller('verification')
@ApiTags('Verification')
@ApiBearerAuth()
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload verification document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        documentType: {
          type: 'string',
          enum: Object.values(VerificationDocumentType),
          description: 'Type of document',
        },
      },
      required: ['file', 'documentType'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'), FileValidationInterceptor)
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('documentType') documentType: VerificationDocumentType,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!file) {
        return res.status(this.http.STATUS_BAD_REQUEST).json(
          new ErrorResponse(
            this.http.STATUS_BAD_REQUEST,
            'File is required',
            'Please upload a file',
          ),
        );
      }

      const userId = req.user.id;
      const verification = await this.verificationService.uploadDocument(
        userId,
        documentType,
        file,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          verification,
          'Document uploaded successfully. Awaiting review.',
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error uploading document',
          error.message,
        ),
      );
    }
  }

  @Get('my-documents')
  @ApiOperation({ summary: 'Get user\'s verification documents' })
  @ApiResponse({ status: 200, description: 'Documents fetched successfully' })
  async getMyDocuments(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const documents = await this.verificationService.getUserVerifications(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          documents,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'verification documents'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching documents',
          error.message,
        ),
      );
    }
  }

  @Get('pending')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get pending verifications (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pending verifications fetched successfully' })
  async getPendingVerifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Res() res?: Response,
  ) {
    try {
      const pageNumber = page ? parseInt(page, 10) : 1;
      const pageLimit = limit ? parseInt(limit, 10) : 20;

      const data = await this.verificationService.getPendingVerifications(pageNumber, pageLimit);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'pending verifications'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching pending verifications',
          error.message,
        ),
      );
    }
  }

  @Patch(':verificationId/review')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Review verification document (Admin only)' })
  @ApiParam({ name: 'verificationId', description: 'Verification ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: { enum: [VerificationStatus.APPROVED, VerificationStatus.REJECTED] },
        rejectionReason: { type: 'string' },
        adminNotes: { type: 'string' },
      },
      required: ['status'],
    },
  })
  @ApiResponse({ status: 200, description: 'Verification reviewed successfully' })
  async reviewVerification(
    @Param('verificationId') verificationId: string,
    @Body('status') status: VerificationStatus.APPROVED | VerificationStatus.REJECTED,
    @Body('rejectionReason') rejectionReason: string,
    @Body('adminNotes') adminNotes: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const adminId = req.user.id;
      const verification = await this.verificationService.reviewVerification(
        verificationId,
        adminId,
        status,
        rejectionReason,
        adminNotes,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          verification,
          UPDATE_SUCCESS.replace('{{entity}}', 'verification'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('already')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error reviewing verification',
          error.message,
        ),
      );
    }
  }
}

