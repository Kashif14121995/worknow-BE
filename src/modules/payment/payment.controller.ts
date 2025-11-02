import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { PaymentService } from './payment.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiBody,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import {
  DATA_FETCHED_SUCCESSFULLY,
  CREATED_SUCCESS,
  CREATED_ERROR,
  UserRole,
} from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import {
  PayForJobPostingDto,
  PaySeekerDto,
  WithdrawEarningsDto,
} from './dto/payment.dto';
import { PaymentTypeEnum, TransactionStatus } from 'src/schemas/payment.schema';

@Controller('payments')
@ApiTags('Payments')
@ApiBearerAuth()
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly http: HttpStatusCodesService,
  ) {}

  // ============================================
  // WALLET OPERATIONS
  // ============================================

  @Get('wallet')
  @ApiOperation({ summary: 'Get wallet balance for current user' })
  @ApiResponse({ status: 200, description: 'Wallet balance fetched successfully' })
  async getWalletBalance(
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const wallet = await this.paymentService.getWalletBalance(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          wallet,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'wallet'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching wallet balance',
          error.message,
        ),
      );
    }
  }

  // ============================================
  // PAYMENT OPERATIONS
  // ============================================

  @Post('job-posting')
  @ApiOperation({ summary: 'Pay for a job posting (Provider only)' })
  @ApiBody({ type: PayForJobPostingDto })
  @ApiResponse({ status: 201, description: 'Payment initiated successfully' })
  async payForJobPosting(
    @Body() dto: PayForJobPostingDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const role = request.user.role;

      if (role !== UserRole.job_provider) {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job providers',
            'Only job providers can pay for job postings',
          ),
        );
      }

      const payment = await this.paymentService.payForJobPosting(
        userId,
        dto.jobId,
        dto.amount,
      );

      return res.status(this.http.STATUS_SUCCESSFULLY_CREATION).json(
        new SuccessResponse(
          payment,
          CREATED_SUCCESS.replace('{{entity}}', 'payment'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          CREATED_ERROR.replace('{{entity}}', 'payment'),
          error.message,
        ),
      );
    }
  }

  @Post('pay-seeker')
  @ApiOperation({ summary: 'Pay a job seeker for completed shift (Provider only)' })
  @ApiBody({ type: PaySeekerDto })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  async paySeekerForShift(
    @Body() dto: PaySeekerDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const providerId = request.user.id;
      const role = request.user.role;

      if (role !== UserRole.job_provider) {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job providers',
            'Only job providers can process payments',
          ),
        );
      }

      const transaction = await this.paymentService.paySeekerForShift(
        providerId,
        dto.seekerId,
        dto.shiftId,
        dto.amount,
      );

      return res.status(this.http.STATUS_SUCCESSFULLY_CREATION).json(
        new SuccessResponse(
          transaction,
          CREATED_SUCCESS.replace('{{entity}}', 'payment'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          CREATED_ERROR.replace('{{entity}}', 'payment'),
          error.message,
        ),
      );
    }
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw earnings to bank account (Seeker only)' })
  @ApiBody({ type: WithdrawEarningsDto })
  @ApiResponse({ status: 201, description: 'Withdrawal initiated successfully' })
  async withdrawEarnings(
    @Body() dto: WithdrawEarningsDto,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const role = request.user.role;

      if (role !== UserRole.job_seeker) {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted to job seekers',
            'Only job seekers can withdraw earnings',
          ),
        );
      }

      const transaction = await this.paymentService.withdrawEarnings(
        userId,
        dto.amount,
        dto.accountDetails || {},
      );

      return res.status(this.http.STATUS_SUCCESSFULLY_CREATION).json(
        new SuccessResponse(
          transaction,
          CREATED_SUCCESS.replace('{{entity}}', 'withdrawal'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          CREATED_ERROR.replace('{{entity}}', 'withdrawal'),
          error.message,
        ),
      );
    }
  }

  // ============================================
  // TRANSACTION & PAYMENT HISTORY
  // ============================================

  @Get('history')
  @ApiOperation({ 
    summary: 'Get transaction/payment history (unified endpoint)',
    description: 'Use query param `view=transactions|payments` to switch between transaction history and payment history. Default is transactions.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: PaymentTypeEnum })
  @ApiQuery({ name: 'status', required: false, enum: TransactionStatus })
  @ApiQuery({ 
    name: 'view', 
    required: false, 
    enum: ['transactions', 'payments'],
    description: 'View type: transactions (from Transaction collection) or payments (from Payment collection). Default: transactions'
  })
  @ApiResponse({ status: 200, description: 'History fetched successfully' })
  async getHistory(
    @Req() request: Request,
    @Res() res: Response,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('type') type?: PaymentTypeEnum,
    @Query('status') status?: TransactionStatus,
    @Query('view') view?: 'transactions' | 'payments',
  ) {
    try {
      const userId = request.user.id;
      let data;

      if (view === 'payments') {
        // Use payment history (from Payment collection)
        data = await this.paymentService.getPaymentHistory(
          userId,
          Number(page),
          Number(limit),
          type,
          status,
        );
      } else {
        // Default: transaction history (from Transaction collection)
        data = await this.paymentService.getTransactionHistory(
          userId,
          Number(page),
          Number(limit),
          type,
          status,
        );
      }

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'history'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching history',
          error.message,
        ),
      );
    }
  }

  // ============================================
  // PAYMENT SUMMARIES
  // ============================================

  @Get('summary')
  @ApiOperation({ 
    summary: 'Get payment summary (role-based)',
    description: 'Returns provider payment summary or seeker earnings summary based on user role',
  })
  @ApiResponse({ status: 200, description: 'Payment summary fetched successfully' })
  async getPaymentSummary(
    @Req() request: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = request.user.id;
      const role = request.user.role;

      let data;

      if (role === UserRole.job_provider) {
        data = await this.paymentService.getProviderPaymentSummary(userId);
      } else if (role === UserRole.job_seeker) {
        data = await this.paymentService.getSeekerPaymentSummary(userId);
      } else {
        return res.status(this.http.STATUS_UNAUTHORIZED).json(
          new ErrorResponse(
            this.http.STATUS_UNAUTHORIZED,
            'Access restricted',
            'Only providers and seekers can access payment summaries',
          ),
        );
      }

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'payment summary'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching payment summary',
          error.message,
        ),
      );
    }
  }
}
