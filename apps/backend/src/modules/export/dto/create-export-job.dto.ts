import { IsEnum, IsOptional, IsString, IsISO8601 } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExportEntity, ExportFormat } from '@prisma/client';

export class CreateExportJobDto {
  @ApiProperty({ enum: ExportEntity, description: 'Eksport qilinadigan entity' })
  @IsEnum(ExportEntity)
  entity: ExportEntity;

  @ApiProperty({ enum: ExportFormat, description: 'Eksport formati' })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional({ description: 'Filial ID (ixtiyoriy)' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Boshlanish sanasi (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Tugash sanasi (YYYY-MM-DD)' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Status filter (entityga qarab)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Hafta turi (schedules uchun)' })
  @IsOptional()
  @IsString()
  weekType?: string;
}
