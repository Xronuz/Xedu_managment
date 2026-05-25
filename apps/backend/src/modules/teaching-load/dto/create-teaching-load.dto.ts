import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, Min, Max, Length } from 'class-validator';
import { GroupType, Semester, TeachingLoadStatus } from '@eduplatform/types';

export class CreateTeachingLoadDto {
  @IsString()
  teacherId: string;

  @IsString()
  subjectId: string;

  @IsString()
  classId: string;

  @IsNumber()
  @Min(1)
  @Max(40)
  hoursPerWeek: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  hoursPerYear?: number;

  @IsEnum(Semester)
  @IsOptional()
  semester?: Semester;

  @IsEnum(GroupType)
  @IsOptional()
  groupType?: GroupType;

  @IsBoolean()
  @IsOptional()
  isSplitClass?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0.1)
  coefficient?: number;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;
}

export class UpdateTeachingLoadDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(40)
  hoursPerWeek?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  hoursPerYear?: number;

  @IsEnum(Semester)
  @IsOptional()
  semester?: Semester;

  @IsEnum(GroupType)
  @IsOptional()
  groupType?: GroupType;

  @IsBoolean()
  @IsOptional()
  isSplitClass?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0.1)
  coefficient?: number;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  notes?: string;

  @IsEnum(TeachingLoadStatus)
  @IsOptional()
  status?: TeachingLoadStatus;
}
