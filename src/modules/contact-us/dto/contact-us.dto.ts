import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ContactUsDto {
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Admin', description: 'Role of the user' })
  @IsNotEmpty()
  @IsString()
  role: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'Email address of the user' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
