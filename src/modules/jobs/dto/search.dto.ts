import { IsOptional, IsString, IsIn } from 'class-validator';

export class SearchDto {
  @IsOptional()
  @IsString()
  searchText?: string = '';

  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'pending', ''], {
    message: 'status must be one of: active, inactive, pending',
  })
  status?: string;
}
