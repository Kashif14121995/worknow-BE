import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsMongoId } from 'class-validator';

export class UpdateApplicationDto {
  @ApiPropertyOptional({
    description: 'Shift ID to assign to this application',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId({ message: 'shiftId must be a valid MongoDB ObjectId' })
  shiftId?: string;

  // Note: status cannot be edited directly - must use approve/reject/hire endpoints
  // appliedBy and appliedFor are immutable
}

