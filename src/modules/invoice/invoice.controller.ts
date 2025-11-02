import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  Patch,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { InvoiceService } from './invoice.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, CREATED_SUCCESS, CREATED_ERROR, UPDATE_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { InvoiceStatus } from 'src/schemas/invoice.schema';

@Controller('invoices')
@ApiTags('Invoices')
@ApiBearerAuth()
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiBody({ type: CreateInvoiceDto })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const invoice = await this.invoiceService.createInvoice(userId, dto);

      return res.status(this.http.STATUS_SUCCESSFULLY_CREATION).json(
        new SuccessResponse(
          invoice,
          CREATED_SUCCESS.replace('{{entity}}', 'invoice'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          CREATED_ERROR.replace('{{entity}}', 'invoice'),
          error.message,
        ),
      );
    }
  }

  @Post('from-transaction/:transactionId')
  @ApiOperation({ summary: 'Generate invoice automatically from a transaction' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @ApiResponse({ status: 201, description: 'Invoice generated successfully' })
  async generateInvoiceFromTransaction(
    @Param('transactionId') transactionId: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const invoice = await this.invoiceService.generateInvoiceFromTransaction(transactionId);

      return res.status(this.http.STATUS_SUCCESSFULLY_CREATION).json(
        new SuccessResponse(
          invoice,
          CREATED_SUCCESS.replace('{{entity}}', 'invoice'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          CREATED_ERROR.replace('{{entity}}', 'invoice'),
          error.message,
        ),
      );
    }
  }

  @Get(':invoiceId')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID or invoiceId' })
  @ApiResponse({ status: 200, description: 'Invoice fetched successfully' })
  async getInvoice(
    @Param('invoiceId') invoiceId: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const invoice = await this.invoiceService.getInvoiceById(invoiceId, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          invoice,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'invoice'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching invoice',
          error.message,
        ),
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get invoices for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, enum: ['recipient', 'issuer', 'all'], description: 'Filter by user role' })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiResponse({ status: 200, description: 'Invoices fetched successfully' })
  async getUserInvoices(
    @Req() request: Request,
    @Res() res: Response,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('role') role: 'recipient' | 'issuer' | 'all' = 'all',
    @Query('status') status?: InvoiceStatus,
  ) {
    try {
      const userId = request.user.id;
      const data = await this.invoiceService.getUserInvoices(
        userId,
        role,
        Number(page),
        Number(limit),
        status,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'invoices'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching invoices',
          error.message,
        ),
      );
    }
  }

  @Patch(':invoiceId/status')
  @ApiOperation({ summary: 'Update invoice status' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string', enum: Object.values(InvoiceStatus) } } } })
  @ApiResponse({ status: 200, description: 'Invoice status updated successfully' })
  async updateInvoiceStatus(
    @Param('invoiceId') invoiceId: string,
    @Body('status') status: InvoiceStatus,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const invoice = await this.invoiceService.updateInvoiceStatus(invoiceId, status, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          invoice,
          UPDATE_SUCCESS.replace('{{entity}}', 'invoice'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error updating invoice status',
          error.message,
        ),
      );
    }
  }

  @Post(':invoiceId/mark-paid')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  async markInvoiceAsPaid(
    @Param('invoiceId') invoiceId: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const invoice = await this.invoiceService.markInvoiceAsPaid(invoiceId, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          invoice,
          UPDATE_SUCCESS.replace('{{entity}}', 'invoice'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error marking invoice as paid',
          error.message,
        ),
      );
    }
  }

  @Post(':invoiceId/send')
  @ApiOperation({ summary: 'Send invoice via email' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
  async sendInvoice(
    @Param('invoiceId') invoiceId: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      await this.invoiceService.sendInvoiceEmail(invoiceId, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          { message: 'Invoice sent successfully' },
          'Invoice sent successfully',
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error sending invoice',
          error.message,
        ),
      );
    }
  }

  @Get(':invoiceId/generate-pdf')
  @ApiOperation({ summary: 'Generate PDF for an invoice' })
  @ApiParam({ name: 'invoiceId', description: 'Invoice ID' })
  @ApiResponse({ status: 200, description: 'PDF generated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async generateInvoicePdf(
    @Param('invoiceId') invoiceId: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const invoice = await this.invoiceService.getInvoiceById(invoiceId, userId);

      // Check if PDF already exists
      if (invoice.pdfUrl) {
        return res.status(this.http.STATUS_OK).json(
          new SuccessResponse(
            { pdfUrl: invoice.pdfUrl },
            'PDF already exists',
          ),
        );
      }

      // Generate PDF
      const pdfUrl = await this.invoiceService.generatePdfForInvoice(invoiceId, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          { pdfUrl },
          'PDF generated successfully',
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error generating PDF',
          error.message,
        ),
      );
    }
  }
}

