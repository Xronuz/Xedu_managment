import { IsString, IsUUID, IsOptional, MaxLength, IsArray, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional({ type: [String], description: 'Bir nechta sinf IDlari (classId bilan birga ishlatilmaydi)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classIds?: string[];

  @ApiProperty()
  @IsUUID()
  teacherId: string;

  @ApiPropertyOptional({ example: 2, description: 'Haftalik dars soatlari' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  hoursPerWeek?: number;
}

export class UpdateSubjectDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  classId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  teacherId?: string;

  @ApiPropertyOptional({ example: 2, description: 'Haftalik dars soatlari' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  hoursPerWeek?: number;
}
