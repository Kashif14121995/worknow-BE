import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { TaxDocumentService } from './tax-document.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { TaxDocumentType } from 'src/schemas/tax-document.schema';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/constants';

@Controller('tax-documents')
@ApiTags('Tax Documents')
@ApiBearerAuth()
export class TaxDocumentController {
  constructor(
    private readonly taxDocumentService: TaxDocumentService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate year-end tax document' })
  @ApiQuery({ name: 'taxYear', required: true, type: Number, description: 'Tax year (e.g., 2024)' })
  @ApiQuery({ name: 'documentType', required: false, enum: TaxDocumentType, description: 'Type of tax document' })
  @ApiResponse({ status: 201, description: 'Tax document generated successfully' })
  async generateTaxDocument(
    @Query('taxYear') taxYear: string,
    @Query('documentType') documentType: TaxDocumentType,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const year = parseInt(taxYear, 10);

      if (!year || year < 2020 || year > new Date().getFullYear() + 1) {
        return res.status(this.http.STATUS_BAD_REQUEST).json(
          new ErrorResponse(
            this.http.STATUS_BAD_REQUEST,
            'Invalid tax year',
            'Tax year must be a valid year',
          ),
        );
      }

      const taxDocument = await this.taxDocumentService.generateYearEndTaxDocument(
        userId,
        year,
        documentType || TaxDocumentType.FORM_1099_NEC,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          taxDocument,
          'Tax document generated successfully',
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error generating tax document',
          error.message,
        ),
      );
    }
  }

  @Get('')
  @ApiOperation({ summary: 'Get user\'s tax documents' })
  @ApiQuery({ name: 'taxYear', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Tax documents fetched successfully' })
  async getTaxDocuments(
    @Query('taxYear') taxYear: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const year = taxYear ? parseInt(taxYear, 10) : undefined;

      const documents = await this.taxDocumentService.getUserTaxDocuments(userId, year);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          documents,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'tax documents'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching tax documents',
          error.message,
        ),
      );
    }
  }

  @Get(':documentId')
  @ApiOperation({ summary: 'Get tax document by ID' })
  @ApiParam({ name: 'documentId', description: 'Tax Document ID' })
  @ApiResponse({ status: 200, description: 'Tax document fetched successfully' })
  async getTaxDocument(
    @Param('documentId') documentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const document = await this.taxDocumentService.getTaxDocument(documentId, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          document,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'tax document'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error fetching tax document',
          error.message,
        ),
      );
    }
  }

  @Get(':documentId/download')
  @ApiOperation({ summary: 'Download tax document PDF' })
  @ApiParam({ name: 'documentId', description: 'Tax Document ID' })
  @ApiResponse({ status: 200, description: 'PDF downloaded successfully' })
  async downloadTaxDocument(
    @Param('documentId') documentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const pdfBuffer = await this.taxDocumentService.downloadTaxDocumentPDF(documentId, userId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=tax-document-${documentId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : error.message.includes('not yet generated')
        ? this.http.STATUS_BAD_REQUEST
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error downloading tax document',
          error.message,
        ),
      );
    }
  }

  @Post('admin/generate-all')
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Generate tax documents for all users (Admin only)' })
  @ApiQuery({ name: 'taxYear', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Tax documents generation started' })
  async generateAllTaxDocuments(
    @Query('taxYear') taxYear: string,
    @Res() res: Response,
  ) {
    try {
      const year = parseInt(taxYear, 10);

      if (!year || year < 2020 || year > new Date().getFullYear() + 1) {
        return res.status(this.http.STATUS_BAD_REQUEST).json(
          new ErrorResponse(
            this.http.STATUS_BAD_REQUEST,
            'Invalid tax year',
            'Tax year must be a valid year',
          ),
        );
      }

      // Run asynchronously
      this.taxDocumentService.generateYearEndTaxDocumentsForAllUsers(year).catch((error) => {
        console.error('Error generating tax documents for all users:', error);
      });

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          null,
          'Tax document generation started for all users',
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error starting tax document generation',
          error.message,
        ),
      );
    }
  }
}

