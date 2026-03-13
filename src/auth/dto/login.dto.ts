import { IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'mirza@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '1234', minLength: 4 })
  @MinLength(4)
  password: string;
}