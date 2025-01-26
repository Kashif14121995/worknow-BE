import {
  IsString,
  IsInt,
  Matches,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from 'src/auth/constants';

export class CreateUserDto {
  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  email: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'phone_number must be a valid integer' })
  phone_number: number;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(20, { message: 'Password must not exceed 20 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'password must contain at least one letter and one number',
  })
  password: string;

  @IsEnum([UserRole.job_provider, UserRole.job_seeker], {
    message: `role no match with either ${UserRole.job_provider} or ${UserRole.job_seeker}`,
  })
  role: string;
}

export class loginUserDto {
  @IsString()
  email: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'phone_number must be a valid integer' })
  phone_number: number;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @MaxLength(20, { message: 'password must not exceed 20 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'password must contain at least one letter and one number',
  })
  password: string;
  @IsEnum([UserRole.job_provider, UserRole.job_seeker], {
    message: `role no match with either ${UserRole.job_provider} or ${UserRole.job_seeker}`,
  })
  role: string;
}

export class loginWithOTPUserDto {
  @IsString()
  email: string;

  @IsOptional()
  @IsNumber()
  otp?: number;
}

export class loginWithGoogleUserDto {
  @IsString()
  code: string;

  @IsEnum([UserRole.job_provider, UserRole.job_seeker], {
    message: `role no match with either ${UserRole.job_provider} or ${UserRole.job_seeker}`,
  })
  role: string;
}

export class ForgotPasswordDto {
  @IsString()
  email: string;
}
