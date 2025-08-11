import {
  IsNotEmpty,
  IsDateString,
  IsMongoId,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShiftDto {
  @ApiProperty({
    description: 'The ID of the associated job',
    example: '64a1f6e15e7b5d001f8b4567',
  })
  @IsMongoId()
  @IsNotEmpty()
  jobId: string;

  @ApiProperty({
    description: 'Shift start date (format: yyyy-mm-dd)',
    example: '2025-08-15',
  })
  @IsDateString()
  startDate: string; // yyyy-mm-dd

  @ApiProperty({
    description: 'Shift end date (format: yyyy-mm-dd)',
    example: '2025-08-15',
  })
  @IsDateString()
  endDate: string; // yyyy-mm-dd

  @ApiProperty({
    description: 'Shift start time in 24-hour format (HH:mm)',
    example: '09:30',
  })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Invalid startTime format (HH:mm)',
  })
  startTime: string;

  @ApiProperty({
    description: 'Shift end time in 24-hour format (HH:mm)',
    example: '17:30',
  })
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Invalid endTime format (HH:mm)',
  })
  endTime: string;
}
