import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsMongoId, MaxLength } from 'class-validator';
import { Sanitize } from 'src/common/decorators/sanitize.decorator';

export class CreateMessageDto {
  @ApiProperty({ description: 'Receiver user ID' })
  @IsMongoId()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ description: 'Message content', maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Message cannot exceed 5000 characters' })
  @Sanitize()
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

