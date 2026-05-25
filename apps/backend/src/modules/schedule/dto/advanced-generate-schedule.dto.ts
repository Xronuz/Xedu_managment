import { IsString, IsOptional, IsArray, IsInt, Min, Max, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DayOfWeek, WeekType } from '@eduplatform/types';

export class AdvancedGenerateScheduleDto {
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

  @ApiPropertyOptional({ description: 'Strategiya', enum: ['greedy', 'hybrid'], default: 'hybrid' })
  @IsOptional()
  @IsString()
  strategy?: 'greedy' | 'hybrid';

  @ApiPropertyOptional({ description: 'Mavjud jadvalni ustiga yozish', default: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  overwriteExisting?: boolean;

  @ApiPropertyOptional({ description: 'Maksimal vaqt (ms)', default: 10000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Type(() => Number)
  timeoutMs?: number;

  @ApiPropertyOptional({ description: 'Orqaga qaytish chuqurligi (backtracking)', default: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  @Type(() => Number)
  maxDepth?: number;

  @ApiPropertyOptional({ description: 'Hafta turi', enum: WeekType, default: WeekType.ALL })
  @IsOptional()
  @IsEnum(WeekType)
  weekType?: WeekType;
}
