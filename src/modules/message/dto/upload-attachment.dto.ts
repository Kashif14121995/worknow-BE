import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UploadAttachmentDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'File to attach' })
  @IsNotEmpty()
  file: Express.Multer.File;
}

