import {
  IsString, IsOptional, IsNumber, IsBoolean, IsEnum,
  IsUUID, MinLength, MaxLength, Min, Max, ValidateIf, IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KpiCategory, KpiDirection, KpiPeriod, KpiSourceType } from '@prisma/client';

export class CreateKpiMetricDto {
  @ApiPropertyOptional({ description: 'Maktab ID (super_admin uchun)' })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({ enum: KpiSourceType, default: 'MANUAL' })
  @IsOptional()
  @IsEnum(KpiSourceType)
  sourceType?: KpiSourceType;

  @ApiPropertyOptional({ description: 'SYSTEM metrika uchun katalog kaliti', example: 'attendance_rate' })
  @ValidateIf((o) => o.sourceType === 'SYSTEM')
  @IsString()
  sourceKey?: string;

  @ApiPropertyOptional({ enum: KpiDirection, default: 'HIGHER_IS_BETTER' })
  @IsOptional()
  @IsEnum(KpiDirection)
  direction?: KpiDirection;

  // SYSTEM metrikada nom/kategoriya katalogdan olinadi — shu sabab ixtiyoriy
  @ApiProperty({ example: 'Davomat foizi', required: false })
  @ValidateIf((o) => o.sourceType !== 'SYSTEM')
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'O‘quvchilarning oylik davomat foizi' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: KpiCategory, example: 'ACADEMIC', required: false })
  @ValidateIf((o) => o.sourceType !== 'SYSTEM')
  @IsEnum(KpiCategory)
  category: KpiCategory;

  @ApiPropertyOptional({ example: 95 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999999)
  targetValue?: number;

  @ApiPropertyOptional({ example: '%' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ enum: KpiPeriod, default: 'MONTHLY' })
  @IsOptional()
  @IsEnum(KpiPeriod)
  period?: KpiPeriod;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filial ID (null = maktab bo‘yicha)' })
  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @ApiPropertyOptional({ description: "Mas'ul xodim (davr yopilganda eslatma oladi)" })
  @IsOptional()
  @IsUUID()
  ownerId?: string | null;
}

export class UpdateKpiMetricDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: KpiDirection })
  @IsOptional()
  @IsEnum(KpiDirection)
  direction?: KpiDirection;

  @ApiPropertyOptional({ description: "Mas'ul xodim (null = olib tashlash)" })
  @IsOptional()
  ownerId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: KpiCategory })
  @IsOptional()
  @IsEnum(KpiCategory)
  category?: KpiCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ enum: KpiPeriod })
  @IsOptional()
  @IsEnum(KpiPeriod)
  period?: KpiPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RunKpiSnapshotDto {
  @ApiPropertyOptional({
    description: "Davr (YYYY-MM). Berilmasa — o'tgan kalendar oy",
    example: '2026-05',
  })
  @IsOptional()
  @IsString()
  period?: string;
}

export class CreateKpiRecordDto {
  @ApiProperty({ example: 'metric-uuid' })
  @IsUUID()
  metricId: string;

  @ApiProperty({ example: 87.5 })
  @IsNumber()
  @Min(0)
  actualValue: number;

  @ApiProperty({ example: '2026-05-01T00:00:00.000Z' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-05-07T23:59:59.000Z' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
