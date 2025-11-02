import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, IsNumber, IsArray, Min } from 'class-validator';
import { Sanitize } from 'src/common/decorators/sanitize.decorator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Sanitize()
  first_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Sanitize()
  last_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  phone_number?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Sanitize()
  location?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Sanitize()
  education?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  experience?: number;
}

