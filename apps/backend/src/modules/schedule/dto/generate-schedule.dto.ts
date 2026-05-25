import { IsString, IsOptional, IsArray, IsInt, Min, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DayOfWeek } from '@eduplatform/types';

export class GenerateScheduleDto {
  @ApiPropertyOptional({ description: 'Filial ID (null = barcha filiallar uchun Director)' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Hafta kunlari (null = monday-saturday)', type: [String], example: ['monday', 'tuesday'] })
  @IsOptional()
  @IsArray()
  @IsEnum(DayOfWeek, { each: true })
  daysOfWeek?: DayOfWeek[];

  @ApiPropertyOptional({ description: 'Sinf IDlari (null = barcha sinflar)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classIds?: string[];

  @ApiPropertyOptional({ description: 'Fan IDlari (null = barcha fanlar)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectIds?: string[];

  @ApiPropertyOptional({ description: 'Strategiya', enum: ['greedy'], default: 'greedy' })
  @IsOptional()
  @IsString()
  strategy?: 'greedy';

  @ApiPropertyOptional({ description: 'Mavjud jadvalni ustiga yozish', default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  overwriteExisting?: boolean;

  @ApiPropertyOptional({ description: 'Maksimal vaqt (ms)', default: 30000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Type(() => Number)
  timeoutMs?: number;
}
