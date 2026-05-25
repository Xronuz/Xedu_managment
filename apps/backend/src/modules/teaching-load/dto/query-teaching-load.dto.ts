import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TeachingLoadStatus, GroupType, Semester } from '@eduplatform/types';

export class QueryTeachingLoadDto {
  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsOptional()
  classId?: string;

  @IsString()
  @IsOptional()
  subjectId?: string;

  @IsEnum(TeachingLoadStatus)
  @IsOptional()
  status?: TeachingLoadStatus;

  @IsEnum(GroupType)
  @IsOptional()
  groupType?: GroupType;

  @IsEnum(Semester)
  @IsOptional()
  semester?: Semester;
}
