import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // Swagger decorator
import { JobStatus } from 'src/constants';

export class UpdateJobListingDto {
  @ApiProperty({ enum: JobStatus, description: 'Job status' })
  @IsEnum(JobStatus, { message: 'Invalid job status' })
  status: JobStatus;
}