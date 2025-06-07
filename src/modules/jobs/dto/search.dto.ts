import { IsOptional, IsPositive, IsString } from 'class-validator';

export class SearchDto {
  @IsOptional()
  @IsString()
  searchText?: string = '';
}
