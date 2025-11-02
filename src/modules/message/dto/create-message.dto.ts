import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: 'Receiver user ID' })
  @IsMongoId()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ description: 'Job ID (optional, for job-related messages)' })
  @IsOptional()
  @IsMongoId()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Application ID (optional, for application-related messages)' })
  @IsOptional()
  @IsMongoId()
  applicationId?: string;
}

