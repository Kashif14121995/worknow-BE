import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsEnum,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceType } from 'src/schemas/invoice.schema';

export class InvoiceLineItemDto {
  @ApiProperty({ description: 'Description of the line item', example: 'Shift work payment for Job: Site Worker' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Quantity', example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Unit price', example: 100.00, minimum: 0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Total for this line item', example: 100.00 })
  @IsNumber()
  @Min(0)
  total: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ description: 'User ID to issue invoice to', example: '64a1f6e15e7b5d001f8b4567' })
  @IsMongoId()
  issuedTo: string;

  @ApiProperty({ description: 'Type of invoice', enum: InvoiceType })
  @IsEnum(InvoiceType)
  invoiceType: InvoiceType;

  @ApiProperty({ description: 'Subtotal amount', example: 100.00, minimum: 0 })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ description: 'Tax amount', example: 10.00, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ description: 'Discount amount', example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ description: 'Total amount', example: 110.00, minimum: 0 })
  @IsNumber()
  @Min(0)
  total: number;

  @ApiPropertyOptional({ description: 'Currency', example: 'USD', default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO string)', example: '2024-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ description: 'Invoice line items', type: [InvoiceLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];

  @ApiPropertyOptional({ description: 'Related transaction ID' })
  @IsOptional()
  @IsMongoId()
  transactionId?: string;

  @ApiPropertyOptional({ description: 'Related shift ID' })
  @IsOptional()
  @IsMongoId()
  shiftId?: string;

  @ApiPropertyOptional({ description: 'Related job ID' })
  @IsOptional()
  @IsMongoId()
  jobId?: string;

  @ApiPropertyOptional({ description: 'Related payment ID' })
  @IsOptional()
  @IsMongoId()
  paymentId?: string;

  @ApiPropertyOptional({ description: 'Billing address' })
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @ApiPropertyOptional({ description: 'Billing email' })
  @IsOptional()
  @IsString()
  billingEmail?: string;

  @ApiPropertyOptional({ description: 'Billing phone' })
  @IsOptional()
  @IsString()
  billingPhone?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Payment terms', example: 'Payment due within 30 days' })
  @IsOptional()
  @IsString()
  terms?: string;
}

