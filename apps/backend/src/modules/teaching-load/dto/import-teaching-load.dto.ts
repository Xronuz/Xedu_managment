import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ImportPreviewRowDto {
  row: number;
  teacherId?: string;
  teacherEmail?: string;
  subjectId?: string;
  subjectName?: string;
  classId?: string;
  className?: string;
  hoursPerWeek?: number;
  semester?: string;
  groupType?: string;
  isSplitClass?: boolean;
  coefficient?: number;
  notes?: string;
  errors: string[];
  valid: boolean;
}

export class ImportPreviewResultDto {
  total: number;
  valid: number;
  invalid: number;
  rows: ImportPreviewRowDto[];
}

export class ImportCommitDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportPreviewRowDto)
  rows: ImportPreviewRowDto[];
}

export class ImportCommitResultDto {
  created: number;
  skipped: number;
  errors: string[];
}
