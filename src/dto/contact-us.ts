import {
  IsEmail,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { UserRole } from 'src/auth/constants';

export class ContactUsDto {
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsEnum([UserRole.job_provider, UserRole.job_seeker], {
    message: `role no match with either ${UserRole.job_provider} or ${UserRole.job_seeker}`,
  })
  role: string;
}
