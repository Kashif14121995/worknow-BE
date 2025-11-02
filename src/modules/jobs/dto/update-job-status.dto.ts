import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString, IsNotEmpty } from "class-validator";
import { JobStatus } from "src/constants";

export class UpdateJobStatusDto {
  @ApiProperty({ 
    description: 'New status for the job', 
    enum: JobStatus,
    example: JobStatus.active 
  })
  @IsString()
  @IsNotEmpty()
  @IsEnum(JobStatus)
  status: JobStatus;
}
