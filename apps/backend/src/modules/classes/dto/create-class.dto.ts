import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_GRADE } from '@eduplatform/types';

export class CreateClassDto {
  @ApiProperty({ example: '5-A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: MAX_GRADE })
  @IsInt()
  @Min(1)
  @Max(MAX_GRADE)
  gradeLevel: number;

  @ApiProperty({ example: '2024-2025' })
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiPropertyOptional({ description: 'Sinf rahbari ID (null = olib tashlash)' })
  @IsOptional()
  @IsString()
  classTeacherId?: string | null;

  @ApiPropertyOptional({ description: 'Filial ID (null = maktab bo‘yicha)' })
  @IsOptional()
  @IsUUID('4', { message: 'branchId UUID formatida bo‘lishi kerak' })
  branchId?: string | null;
}
