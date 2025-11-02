import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CheckInDto {
  @ApiProperty({ description: 'GPS Latitude for check-in location', example: 40.7128 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ description: 'GPS Longitude for check-in location', example: -74.0060 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Optional notes for check-in' })
  @IsOptional()
  notes?: string;
}

export class CheckOutDto {
  @ApiProperty({ description: 'GPS Latitude for check-out location', example: 40.7128 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({ description: 'GPS Longitude for check-out location', example: -74.0060 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ description: 'Optional notes for check-out' })
  @IsOptional()
  notes?: string;
}

