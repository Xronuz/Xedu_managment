import { IsEnum, IsOptional, IsString } from 'class-validator';
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
}
