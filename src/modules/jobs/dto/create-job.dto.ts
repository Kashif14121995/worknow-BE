import {
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';

import { AvailableJobs, PaymentType } from '../constants';
export class CreateJobListingDto {
  @IsString()
  address: string;

  @IsString()
  zipCode: string;

  @IsEnum(AvailableJobs)
  type: string;

  @IsArray() // Ensures it's an array
  @IsOptional() // Allows the field to be missing or `undefined`
  @IsString({ each: true }) // Ensures each element is a string
  tags?: string[];

  @IsString()
  @MinLength(3, { message: 'country too short' })
  @MaxLength(50, { message: 'country too long' })
  country: string;

  @IsString()
  @MinLength(3, { message: 'state too short' })
  @MaxLength(50, { message: 'state too long' })
  state: string;

  @IsString()
  @MinLength(3, { message: 'city too short' })
  @MaxLength(50, { message: 'city too long' })
  city: string;

  @IsString()
  @MinLength(10, { message: 'Description too short' })
  @MaxLength(500, { message: 'Description too long' })
  description: string;

  @IsString()
  @MinLength(4, { message: 'company name too short' })
  @MaxLength(50, { message: 'company name too long' })
  companyName: string;

  @IsNumber()
  @Min(1, { message: 'At least hire one person' })
  @Max(10000, { message: 'Very large number of openings provided' })
  minimumRequirements: number;

  @IsNumber()
  @Min(1, { message: 'At least hire one person' })
  @Max(10000, { message: 'Very large number of openings provided' })
  maximumRequirements: number;

  @IsEnum([PaymentType.contractual, PaymentType.per_hour])
  paymentType: string;

  @IsNumber()
  payment: number;

  @IsNumber()
  shiftStartsAt: number;

  @IsNumber()
  shiftEndsAt: number;
}
