import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { SavedSearchService } from './saved-search.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SuccessResponse, ErrorResponse } from 'src/common/utils/response';
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS, CREATED_SUCCESS } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';

@Controller('saved-searches')
@ApiTags('Saved Searches')
@ApiBearerAuth()
export class SavedSearchController {
  constructor(
    private readonly savedSearchService: SavedSearchService,
    private readonly http: HttpStatusCodesService,
  ) {}

  @Post('')
  @ApiOperation({ summary: 'Create a saved search' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        keyword: { type: 'string' },
        jobTypes: { type: 'array', items: { type: 'string' } },
        industries: { type: 'array', items: { type: 'string' } },
        location: { type: 'string' },
        minPayRate: { type: 'number' },
        maxPayRate: { type: 'number' },
        requiredSkills: { type: 'array', items: { type: 'string' } },
        minExperience: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Saved search created successfully' })
  async createSavedSearch(
    @Body() searchData: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const savedSearch = await this.savedSearchService.createSavedSearch(userId, searchData);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          savedSearch,
          CREATED_SUCCESS.replace('{{entity}}', 'saved search'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error creating saved search',
          error.message,
        ),
      );
    }
  }

  @Get('')
  @ApiOperation({ summary: 'Get user\'s saved searches' })
  @ApiResponse({ status: 200, description: 'Saved searches fetched successfully' })
  async getUserSavedSearches(@Req() req: Request, @Res() res: Response) {
    try {
      const userId = req.user.id;
      const searches = await this.savedSearchService.getUserSavedSearches(userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          searches,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'saved searches'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching saved searches',
          error.message,
        ),
      );
    }
  }

  @Patch(':searchId')
  @ApiOperation({ summary: 'Update saved search' })
  @ApiParam({ name: 'searchId', description: 'Saved Search ID' })
  @ApiBody({ schema: { type: 'object' } })
  @ApiResponse({ status: 200, description: 'Saved search updated successfully' })
  async updateSavedSearch(
    @Param('searchId') searchId: string,
    @Body() updates: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      const savedSearch = await this.savedSearchService.updateSavedSearch(searchId, userId, updates);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          savedSearch,
          UPDATE_SUCCESS.replace('{{entity}}', 'saved search'),
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error updating saved search',
          error.message,
        ),
      );
    }
  }

  @Delete(':searchId')
  @ApiOperation({ summary: 'Delete saved search' })
  @ApiParam({ name: 'searchId', description: 'Saved Search ID' })
  @ApiResponse({ status: 200, description: 'Saved search deleted successfully' })
  async deleteSavedSearch(
    @Param('searchId') searchId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = req.user.id;
      await this.savedSearchService.deleteSavedSearch(searchId, userId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          null,
          'Saved search deleted successfully',
        ),
      );
    } catch (error) {
      const status = error.message.includes('not found')
        ? this.http.STATUS_NOT_FOUND
        : this.http.STATUS_INTERNAL_SERVER_ERROR;

      return res.status(status).json(
        new ErrorResponse(
          status,
          'Error deleting saved search',
          error.message,
        ),
      );
    }
  }
}

