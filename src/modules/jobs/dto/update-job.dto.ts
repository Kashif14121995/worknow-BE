import { IsEnum } from 'class-validator';
import { JobStatus } from '../constants';

export class UpdateJobListingDto {
  @IsEnum(JobStatus, { message: 'Invalid job status' })
  status: JobStatus;
}
