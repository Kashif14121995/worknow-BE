import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftDto } from '../create-shift.dto/create-shift.dto';
import { IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// Define enum for type safety - matches FRS requirements
export enum ShiftStatus {
  SCHEDULED = 'scheduled',     // Created and awaiting execution
  IN_PROGRESS = 'in_progress', // Worker has checked in
  COMPLETED = 'completed',     // Worker has checked out
  MISSED = 'missed',           // Scheduled time passed without check-in
  CANCELLED = 'cancelled',      // Cancelled by Gig Lister
}

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
  @ApiPropertyOptional({
    description: 'Status of the shift',
    enum: ShiftStatus,
    example: ShiftStatus.SCHEDULED,
  })
  @IsEnum(ShiftStatus, { message: 'Invalid status' })
  status?: ShiftStatus;
}
