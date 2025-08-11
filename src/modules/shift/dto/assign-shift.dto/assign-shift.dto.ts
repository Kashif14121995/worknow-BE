import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId, ArrayNotEmpty } from 'class-validator';

export class AssignShiftDto {
  @ApiProperty({
    description: 'List of user IDs to assign',
    type: [String],
    example: ['64c8e1c5e3d8b0f9d4b2a7d2', '64c8e1c5e3d8b0f9d4b2a7d3'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  assigneeIds: string[];
}
