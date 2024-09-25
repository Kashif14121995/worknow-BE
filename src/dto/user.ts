import {
  IsString,
  IsInt,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  email: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Phone number must be a valid integer' })
  phone_number: number;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(20, { message: 'Password must not exceed 20 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;
}

export class loginUserDto {
  @IsString()
  email: string;

  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Phone number must be a valid integer' })
  phone_number: number;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(20, { message: 'Password must not exceed 20 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;
}
