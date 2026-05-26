import { ApiProperty } from '@nestjs/swagger';
import { ExportEntity, ExportFormat, ExportJobStatus } from '@prisma/client';

export class ExportJobResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ExportEntity })
  entity: ExportEntity;

  @ApiProperty({ enum: ExportFormat })
  format: ExportFormat;

  @ApiProperty({ enum: ExportJobStatus })
  status: ExportJobStatus;

  @ApiProperty({ description: 'Progress (0-100)' })
  progress: number;

  @ApiProperty({ nullable: true })
  fileUrl: string | null;

  @ApiProperty({ nullable: true })
  error: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  startedAt: Date | null;

  @ApiProperty({ nullable: true })
  completedAt: Date | null;

  @ApiProperty()
  createdBy: string;
}

export class ExportJobListResponseDto {
  @ApiProperty({ type: [ExportJobResponseDto] })
  data: ExportJobResponseDto[];

  @ApiProperty()
  total: number;
}
