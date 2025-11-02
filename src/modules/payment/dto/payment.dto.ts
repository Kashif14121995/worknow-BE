import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsMongoId, IsEnum, Min } from 'class-validator';
import { PaymentTypeEnum } from 'src/schemas/payment.schema';

export class PayForJobPostingDto {
  @ApiProperty({ description: 'Job ID to pay for' })
  @IsMongoId()
  jobId: string;

  @ApiProperty({ description: 'Amount to pay', example: 50.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class PaySeekerDto {
  @ApiProperty({ description: 'Seeker user ID to pay' })
  @IsMongoId()
  seekerId: string;

  @ApiProperty({ description: 'Shift ID for this payment' })
  @IsMongoId()
  shiftId: string;

  @ApiProperty({ description: 'Amount to pay', example: 100.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class WithdrawEarningsDto {
  @ApiProperty({ description: 'Amount to withdraw', example: 500.00 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Bank account details' })
  @IsOptional()
  @IsString()
  accountDetails?: any; // In production, use proper validation
}

