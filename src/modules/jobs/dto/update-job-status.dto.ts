import { ApiProperty } from "@nestjs/swagger";
import { IsMongoId } from "class-validator";

export class UpdateJobStatusDto {
  @ApiProperty({ example: '66a6d8701b3f5c001f89d9a1' })
  @IsMongoId()
  jobId: string;
}
