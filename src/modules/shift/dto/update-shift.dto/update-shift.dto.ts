import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftDto } from '../create-shift.dto/create-shift.dto';
import { IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Define enum for type safety
export enum ShiftStatus {
  OPEN = 'open',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
  @ApiPropertyOptional({
    description: 'Status of the shift',
    enum: ShiftStatus,
    example: ShiftStatus.OPEN,
  })
  @IsEnum(ShiftStatus, { message: 'Invalid status' })
  status?: ShiftStatus;
}
