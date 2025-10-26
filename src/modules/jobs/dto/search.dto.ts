import { IsOptional, IsString, IsIn, IsEnum } from 'class-validator';
import { JobStatus } from 'src/constants';

export class SearchDto {
  @IsOptional()
  @IsString()
  searchText?: string = '';

  @IsOptional()
  @IsEnum(JobStatus, {
    message: `status must be one of: ${Object.values(JobStatus).join(', ')}`,
  })
  status?: JobStatus;
}