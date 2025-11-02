import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { Request } from 'src/common/types/express';
import { CMSService } from './cms.service';
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
import { DATA_FETCHED_SUCCESSFULLY, UPDATE_SUCCESS, DELETE_SUCCESS, DELETE_ERROR, CREATED_SUCCESS, CREATED_ERROR } from 'src/constants';
import { HttpStatusCodesService } from '../http_status_codes/http_status_codes.service';
import { UserRole } from 'src/constants';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CMSType, CMSStatus } from 'src/schemas/cms.schema';
import { Public } from 'src/plugin/public';

@Controller('cms')
@ApiTags('CMS')
export class CMSController {
  constructor(
    private readonly cmsService: CMSService,
    private readonly http: HttpStatusCodesService,
  ) {}

  // Public: Get published content
  @Public()
  @Get('public/:type')
  @ApiOperation({ summary: 'Get published CMS content (public)' })
  @ApiParam({ name: 'type', enum: CMSType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchText', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Content fetched successfully' })
  async getPublishedContent(
    @Param('type') type: CMSType,
    @Res() res: Response,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('searchText') searchText?: string
  ) {
    try {
      const pageNumber = page ? parseInt(page, 10) : 1;
      const pageLimit = limit ? parseInt(limit, 10) : 20;

      const data = await this.cmsService.getPublishedContent(
        type,
        pageNumber,
        pageLimit,
        searchText,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'content'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching content',
          error.message,
        ),
      );
    }
  }

  // Public: Get single published content by slug
  @Public()
  @Get('public/:type/slug/:slug')
  @ApiOperation({ summary: 'Get published CMS content by slug (public)' })
  @ApiParam({ name: 'type', enum: CMSType })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, description: 'Content fetched successfully' })
  async getPublishedContentBySlug(
    @Param('type') type: CMSType,
    @Param('slug') slug: string,
    @Res() res: Response,
  ) {
    try {
      const data = await this.cmsService.getPublishedContentBySlug(type, slug);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'content'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_NOT_FOUND).json(
        new ErrorResponse(
          this.http.STATUS_NOT_FOUND,
          'Content not found',
          error.message,
        ),
      );
    }
  }

  // Admin: Get all content (MUST be before admin/:contentId to avoid route conflicts)
  @Get('admin')
  @ApiBearerAuth()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get all CMS content (admin only)' })
  @ApiQuery({ name: 'type', required: false, enum: CMSType })
  @ApiQuery({ name: 'status', required: false, enum: CMSStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'searchText', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Content fetched successfully' })
  async getAllContent(
    @Req() req: Request,
    @Res() res: Response,
    @Query('type') type?: CMSType,
    @Query('status') status?: CMSStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('searchText') searchText?: string,
  ) {
    try {
      const pageNumber = page ? parseInt(page, 10) : 1;
      const pageLimit = limit ? parseInt(limit, 10) : 20;

      const data = await this.cmsService.getAllContent(
        type,
        status,
        pageNumber,
        pageLimit,
        searchText,
      );

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'content'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error fetching content',
          error.message,
        ),
      );
    }
  }

  // Admin: Get content by ID (MUST be after admin to avoid route conflicts)
  @Get('admin/:contentId')
  @ApiBearerAuth()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Get CMS content by ID (admin only)' })
  @ApiParam({ name: 'contentId', type: String })
  @ApiResponse({ status: 200, description: 'Content fetched successfully' })
  async getContentById(
    @Param('contentId') contentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const data = await this.cmsService.getContentById(contentId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DATA_FETCHED_SUCCESSFULLY.replace('{{entity}}', 'content'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_NOT_FOUND).json(
        new ErrorResponse(
          this.http.STATUS_NOT_FOUND,
          'Content not found',
          error.message,
        ),
      );
    }
  }

  // Admin: Create content
  @Post('admin')
  @ApiBearerAuth()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Create CMS content (admin only)' })
  @ApiBody({ description: 'Content data' })
  @ApiResponse({ status: 201, description: 'Content created successfully' })
  async createContent(
    @Body() contentData: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const data = await this.cmsService.createContent(contentData);

      return res.status(this.http.STATUS_SUCCESSFULLY_CREATION).json(
        new SuccessResponse(
          data,
          CREATED_SUCCESS.replace('{{entity}}', 'content'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          CREATED_ERROR.replace('{{entity}}', 'content'),
          error.message,
        ),
      );
    }
  }

  // Admin: Update content
  @Patch('admin/:contentId')
  @ApiBearerAuth()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Update CMS content (admin only)' })
  @ApiParam({ name: 'contentId', type: String })
  @ApiBody({ description: 'Content update data' })
  @ApiResponse({ status: 200, description: 'Content updated successfully' })
  async updateContent(
    @Param('contentId') contentId: string,
    @Body() updateData: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const data = await this.cmsService.updateContent(contentId, updateData);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          UPDATE_SUCCESS.replace('{{entity}}', 'content'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error updating content',
          error.message,
        ),
      );
    }
  }

  // Admin: Delete content
  @Delete('admin/:contentId')
  @ApiBearerAuth()
  @Roles(UserRole.admin)
  @ApiOperation({ summary: 'Delete CMS content (admin only)' })
  @ApiParam({ name: 'contentId', type: String })
  @ApiResponse({ status: 200, description: 'Content deleted successfully' })
  async deleteContent(
    @Param('contentId') contentId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const data = await this.cmsService.deleteContent(contentId);

      return res.status(this.http.STATUS_OK).json(
        new SuccessResponse(
          data,
          DELETE_SUCCESS.replace('{{entity}}', 'content'),
        ),
      );
    } catch (error) {
      return res.status(this.http.STATUS_INTERNAL_SERVER_ERROR).json(
        new ErrorResponse(
          this.http.STATUS_INTERNAL_SERVER_ERROR,
          'Error deleting content',
          error.message,
        ),
      );
    }
  }
}

