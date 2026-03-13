import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Electronic products and gadgets' })
  @IsOptional()
  @IsString()
  description: string;
}