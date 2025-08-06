import {
  Controller,
  Post,
  Get,
  UploadedFile,
  Param,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AwsService } from './aws.service';
import { Response } from 'express';
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to S3' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
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
