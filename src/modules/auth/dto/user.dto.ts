import {
  IsString,
  IsInt,
  Matches,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsNumber,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'src/constants';
import { Sanitize } from 'src/common/decorators/sanitize.decorator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @Sanitize()
  first_name: string;

  @ApiProperty()
  @IsString()
  @Sanitize()
  last_name: string;

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiPropertyOptional({ example: 9876543210 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'phone_number must be a valid integer' })
  phone_number: number;

  @ApiProperty({
    minLength: 8,
    maxLength: 20,
    example: 'Password123!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(20, { message: 'Password must not exceed 20 characters' })
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.job_provider,
  })
  @IsEnum(UserRole, {
    message: `role must be either ${UserRole.job_provider} or ${UserRole.job_seeker}`,
  })
  role: UserRole;
}

export class LoginUserDto {
  @ApiProperty()
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: 9876543210 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'phone_number must be a valid integer' })
  phone_number: number;

  @ApiProperty({
    example: 'Password123!',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'password must contain at least one letter and one number',
  })
  password: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.job_provider,
  })
  @IsEnum(UserRole, {
    message: `role must be either ${UserRole.job_provider} or ${UserRole.job_seeker}`,
  })
  role: UserRole;
}

export class LoginWithOTPUserDto {
  @ApiProperty()
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: 123456 })
  @IsOptional()
  @IsNumber()
  otp?: number;
}

export class LoginWithGoogleUserDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.job_seeker,
  })
  @IsEnum(UserRole, {
    message: `role must be either ${UserRole.job_provider} or ${UserRole.job_seeker}`,
  })
  role: UserRole;

  @ApiPropertyOptional({
    enum: ['web', 'native'],
    example: 'web',
  })
  @IsOptional()
  @IsIn(['web', 'native'])
  platform?: 'web' | 'native';
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsString()
  email: string;
}
