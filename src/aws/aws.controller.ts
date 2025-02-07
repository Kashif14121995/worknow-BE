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

@Controller('aws')
export class AwsController {
  constructor(private readonly awsS3Service: AwsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const fileUrl = await this.awsS3Service.uploadFile(
      file.originalname,
      file.buffer,
      file.mimetype,
    );
    return { url: fileUrl };
  }

  @Get('file/:key')
  async getFile(@Param('key') key: string, @Res() res: Response) {
    const fileBuffer = await this.awsS3Service.getFile(key);
    res.send(fileBuffer);
  }
}
