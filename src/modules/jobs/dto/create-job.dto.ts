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
import { ApiProperty } from '@nestjs/swagger';
import { PaymentType } from 'src/constants';

export class CreateJobListingDto {
  @ApiProperty({ example: 'Software Developer' })
  @IsString()
  @MinLength(3)
  jobTitle: string;

  @ApiProperty({ example: 'Full-time' })
  @IsString()
  @MinLength(3)
  jobType: string;

  @ApiProperty({ example: 'Information Technology' })
  @IsString()
  @MinLength(2)
  industry: string;

  @ApiProperty({ example: '8 hours' })
  @IsString()
  shiftDuration: string;

  @ApiProperty({
    example: '2025-09-01T09:00:00.000Z',
    description: 'Start time of the shift in ISO format',
  })
  @IsDateString({}, { message: 'shiftStartsAt must be a valid ISO date string' })
  shiftStartsAt: string;

  @ApiProperty({
    example: '2025-09-01T17:00:00.000Z',
    description: 'End time of the shift in ISO format',
  })
  @IsDateString({}, { message: 'shiftEndsAt must be a valid ISO date string' })
  shiftEndsAt: string;

  @ApiProperty({ example: 'San Francisco, CA' })
  @IsString()
  workLocation: string;

  @ApiProperty({
    example: 'Responsible for developing and maintaining web applications.',
    minLength: 10,
    maxLength: 1000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 10, minimum: 1 })
  @IsNumber()
  @Min(1)
  positions: number;

  @ApiProperty({
    enum: PaymentType,
    example: PaymentType.hourly,
    description: 'Payment type must be hourly or contractual',
  })
  @IsEnum(PaymentType, {
    message: 'paymentType must be hourly or contractual',
  })
  paymentType: PaymentType;

  @ApiProperty({ example: 'Morning' })
  @IsString()
  preferredShift: string;

  @ApiProperty({ example: 85, minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  matchScore: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  enableSmartRecommendations: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  autoShortlistCandidates: boolean;

  @ApiProperty({ example: 'Mid-level' })
  @IsString()
  experienceLevel: string;

  @ApiProperty({ example: 'Bachelor’s Degree in Computer Science' })
  @IsString()
  education: string;

  @ApiProperty({
    example: ['JavaScript', 'React', 'Node.js'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  requiredSkills: string[];

  saveStatus?: 'draft' | 'publish' = 'publish'; // Default to active if not specified
}
