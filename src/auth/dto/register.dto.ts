import { IsEmail, IsEnum, IsNotEmpty, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../roles.enum';

export class RegisterDto {
  @ApiProperty({ example: 'Mirza Salem' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'mirza@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234', minLength: 4 })
  @MinLength(4)
  password: string;

  @ApiPropertyOptional({ enum: Role, example: Role.CUSTOMER })
  @IsOptional()
  @IsEnum(Role)
  role: Role;
}