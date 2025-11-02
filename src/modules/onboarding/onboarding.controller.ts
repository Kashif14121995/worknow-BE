import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { OnboardingService } from './onboarding.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { OnboardingStep } from 'src/schemas/onboarding.schema';

@Controller('onboarding')
@ApiTags('Onboarding')
@ApiBearerAuth()
export class OnboardingController {
  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize onboarding for user' })
  @ApiResponse({ status: 201, description: 'Onboarding initialized successfully' })
  async initializeOnboarding(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const onboarding = await this.onboardingService.initializeOnboarding(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          onboarding,
          'Onboarding initialized successfully',
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error initializing onboarding',
          error.message,
        ),
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get onboarding status' })
  @ApiResponse({ status: 200, description: 'Onboarding status fetched successfully' })
  async getStatus(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const onboarding = await this.onboardingService.getOnboardingStatus(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          onboarding,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'onboarding status'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching onboarding status',
          error.message,
        ),
      );
    }
  }

  @Post('complete-step')
  @ApiOperation({ summary: 'Complete an onboarding step' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        step: {
          enum: Object.values(OnboardingStep),
          description: 'Step to mark as complete',
        },
      },
      required: ['step'],
    },
  })
  @ApiResponse({ status: 200, description: 'Step completed successfully' })
  async completeStep(
    @Body('step') step: OnboardingStep,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const onboarding = await this.onboardingService.completeStep(userId, step);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          onboarding,
          UPDATE_SUCCESS.replace('{{entity}}', 'onboarding step'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error completing step',
          error.message,
        ),
      );
    }
  }

  @Patch('current-step')
  @ApiOperation({ summary: 'Update current onboarding step' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        step: {
          enum: Object.values(OnboardingStep),
        },
      },
      required: ['step'],
    },
  })
  @ApiResponse({ status: 200, description: 'Step updated successfully' })
  async updateCurrentStep(
    @Body('step') step: OnboardingStep,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const onboarding = await this.onboardingService.updateCurrentStep(userId, step);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          onboarding,
          UPDATE_SUCCESS.replace('{{entity}}', 'current step'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error updating step',
          error.message,
        ),
      );
    }
  }

  @Post('skip-step')
  @ApiOperation({ summary: 'Skip an onboarding step' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        step: {
          enum: Object.values(OnboardingStep),
        },
      },
      required: ['step'],
    },
  })
  @ApiResponse({ status: 200, description: 'Step skipped successfully' })
  async skipStep(
    @Body('step') step: OnboardingStep,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const onboarding = await this.onboardingService.skipStep(userId, step);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          onboarding,
          'Step skipped successfully',
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error skipping step',
          error.message,
        ),
      );
    }
  }
}

