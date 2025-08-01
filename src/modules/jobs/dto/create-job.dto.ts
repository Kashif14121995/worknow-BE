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
  IsBoolean,
  IsDateString,
} from 'class-validator';

import { PaymentType } from '../constants';

export class CreateJobListingDto {
  @IsString()
  @MinLength(3)
  jobTitle: string;

  @IsString()
  @MinLength(3)
  jobType: string;

  @IsString()
  @MinLength(2)
  industry: string;

  @IsString()
  shiftDuration: string;

  @IsDateString(
    {},
    { message: 'shiftStartsAt must be a valid ISO date string' },
  )
  shiftStartsAt: string;

  @IsDateString({}, { message: 'shiftEndsAt must be a valid ISO date string' })
  shiftEndsAt: string;

  @IsString()
  workLocation: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(PaymentType, { message: 'paymentType must be hourly or contractual' })
  paymentType: PaymentType;

  @IsString()
  preferredShift: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  matchScore: number;

  @IsBoolean()
  enableSmartRecommendations: boolean;

  @IsBoolean()
  autoShortlistCandidates: boolean;

  @IsString()
  experienceLevel: string;

  @IsString()
  education: string;

  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];
}
