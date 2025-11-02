import {
  Controller,
  Post,
  Get,
  UploadedFile,
  Param,
  Res,
  UseInterceptors,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AwsService } from './aws.service';
import { Response } from 'express';
import { FileValidationInterceptor } from 'src/common/interceptors/file-validation.interceptor';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('AWS S3')
@Controller('aws')
export class AwsController {
  constructor(private readonly awsS3Service: AwsService) {}

  @Post('upload')
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file'),
    FileValidationInterceptor,
  )
  @ApiOperation({ summary: 'Upload a file to S3' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 10MB, allowed: images, PDF, DOC)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|webp|pdf|doc|docx)/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const fileUrl = await this.awsS3Service.uploadFile(
      file.originalname,
      file.buffer,
      file.mimetype,
    );
    return { url: fileUrl };
  }

  @Get('file/:key')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retrieve a file from S3' })
  @ApiParam({ name: 'key', required: true, description: 'File key in S3' })
  @ApiResponse({ status: 200, description: 'File retrieved successfully' })
  async getFile(@Param('key') key: string, @Res() res: Response) {
    const fileBuffer = await this.awsS3Service.getFile(key);
    res.send(fileBuffer);
  }
}
