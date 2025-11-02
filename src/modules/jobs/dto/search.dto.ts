import { IsOptional, IsString, IsIn, IsEnum } from 'class-validator';
import { JobApplicationAppliedStatus, JobStatus } from 'src/constants';

export class ApplicationSearchDto {
  @IsOptional()
  @IsString()
  searchText?: string = '';

  @IsOptional()
  @IsEnum(JobApplicationAppliedStatus, {
    message: `status must be one of: ${Object.values(JobApplicationAppliedStatus).join(', ')}`,
  })
  status?: JobApplicationAppliedStatus;
}