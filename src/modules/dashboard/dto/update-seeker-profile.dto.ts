import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';

export class UpdateWorkExperienceDto {
  @ApiProperty({ example: 5, description: 'Years of experience' })
  @IsNumber()
  @Min(0)
  @Max(50)
  experience: number;
}

export class UpdateAvailabilityDto {
  @ApiProperty({ 
    example: ['JavaScript', 'React', 'Node.js'], 
    description: 'Array of skills/availability' 
  })
  @IsArray()
  @IsString({ each: true })
  skills: string[];
}

export class UpdateWorkLocationDto {
  @ApiProperty({ example: 'New York, NY', description: 'Preferred work location' })
  @IsString()
  location: string;
}

export class UpdateIdentityDto {
  @ApiPropertyOptional({ 
    example: 'identity_document_url',
    description: 'URL or identifier for uploaded identity document'
  })
  @IsOptional()
  @IsString()
  identityDocument?: string;
}

export class UpdateEducationDto {
  @ApiProperty({ 
    example: "Bachelor's Degree",
    description: 'Education level or qualification' 
  })
  @IsString()
  education: string;
}

