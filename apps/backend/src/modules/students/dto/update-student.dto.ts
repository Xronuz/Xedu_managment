import { IsOptional, IsString, IsEnum, IsDateString, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum GenderDto {
  male = 'male',
  female = 'female',
}

export class UpdateStudentDto {
  @ApiPropertyOptional({ example: 'Ali' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Valiyev' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^[+\d][\d\s\-().]{5,18}$/, { message: 'phone raqam noto‘g‘ri formatda' })
  phone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  // ─── O'quvchi profili ───────────────────────────────────────────────
  @ApiPropertyOptional({ example: '2012-05-14', description: 'Tug‘ilgan sana (ISO)' })
  @IsOptional()
  @IsDateString({}, { message: 'dateOfBirth ISO sana formatida bo‘lishi kerak' })
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: GenderDto, example: 'male' })
  @IsOptional()
  @IsEnum(GenderDto, { message: 'gender male yoki female bo‘lishi kerak' })
  gender?: GenderDto;

  @ApiPropertyOptional({ example: 'Toshkent, Yunusobod 12-12' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'A-2025-014', description: 'Jurnal / ID raqami' })
  @IsOptional()
  @IsString()
  studentIdNumber?: string;

  @ApiPropertyOptional({ example: '2025-09-01', description: 'Qabul sanasi (ISO)' })
  @IsOptional()
  @IsDateString({}, { message: 'enrollmentDate ISO sana formatida bo‘lishi kerak' })
  enrollmentDate?: string;

  @ApiPropertyOptional({ example: 'Valiyeva Nodira (onasi)' })
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional({ example: '+998901112233' })
  @IsOptional()
  @IsString()
  @Matches(/^[+\d][\d\s\-().]{5,18}$/, { message: 'emergencyContactPhone noto‘g‘ri formatda' })
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ example: 'O(I) Rh+' })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiPropertyOptional({ example: 'Yong‘oqqa allergiya' })
  @IsOptional()
  @IsString()
  medicalNotes?: string;

  @ApiPropertyOptional({ example: 'Matematikaga qiziqishi yuqori, faol' })
  @IsOptional()
  @IsString()
  teacherNotes?: string;
}
