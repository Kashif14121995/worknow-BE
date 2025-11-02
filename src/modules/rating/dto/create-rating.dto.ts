import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  IsMongoId,
  IsEnum,
  IsBoolean,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { RatingType } from 'src/schemas/rating.schema';

export class CreateRatingDto {
  @ApiPropertyOptional({ description: 'User ID being rated (if rating a person)' })
  @IsOptional()
  @IsMongoId()
  ratedUserId?: string;

  @ApiPropertyOptional({ description: 'Job ID being rated' })
  @IsOptional()
  @IsMongoId()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Shift ID related to this rating' })
  @IsOptional()
  @IsMongoId()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'Application ID related to this rating' })
  @IsOptional()
  @IsMongoId()
  applicationId?: string;

  @ApiProperty({ description: 'Type of rating', enum: RatingType })
  @IsEnum(RatingType)
  ratingType: RatingType;

  @ApiProperty({ description: 'Rating value (1-5)', example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Text review', example: 'Great experience, very professional!' })
  @IsOptional()
  @IsString()
  review?: string;

  @ApiPropertyOptional({ description: 'Tags for the rating', example: ['punctual', 'professional'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Whether review is public', default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

