import {
  IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, IsUrl,
  IsDateString, Max, Min, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PortfolioCategoryDto {
  sport = 'sport',
  language_certificate = 'language_certificate',
  olympiad = 'olympiad',
  academic = 'academic',
  arts = 'arts',
  other = 'other',
}

export enum PortfolioLevelDto {
  school = 'school',
  district = 'district',
  region = 'region',
  republic = 'republic',
  international = 'international',
}

export class CreatePortfolioDto {
  @ApiProperty({ description: 'O‘quvchi ID (UUID)' })
  @IsUUID('4', { message: 'studentId UUID formatida bo‘lishi kerak' })
  studentId: string;

  @ApiPropertyOptional({ description: 'Mas‘ul fan ID (UUID) — KPI balli shu fan o‘qituvchisiga beriladi' })
  @IsOptional()
  @IsUUID('4', { message: 'subjectId UUID formatida bo‘lishi kerak' })
  subjectId?: string;

  @ApiProperty({ enum: PortfolioCategoryDto, example: 'olympiad' })
  @IsEnum(PortfolioCategoryDto, { message: 'category noto‘g‘ri' })
  category: PortfolioCategoryDto;

  @ApiProperty({ example: 'Respublika matematika olimpiadasi' })
  @IsString()
  @IsNotEmpty({ message: 'title bo‘sh bo‘lmasligi kerak' })
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ enum: PortfolioLevelDto, example: 'republic' })
  @IsOptional()
  @IsEnum(PortfolioLevelDto, { message: 'level noto‘g‘ri' })
  level?: PortfolioLevelDto;

  @ApiPropertyOptional({ example: "1-o'rin", description: "Natija: o'rin/medal/ball/daraja" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  result?: string;

  @ApiPropertyOptional({ example: 'British Council', description: 'Tashkilot / imtihon markazi' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  issuer?: string;

  @ApiProperty({ example: '2026-03-15', description: 'Erishilgan sana (ISO)' })
  @IsDateString({}, { message: 'achievedAt ISO sana formatida bo‘lishi kerak' })
  achievedAt: string;

  @ApiPropertyOptional({ example: '2028-03-15', description: 'Amal qilish muddati (ISO)' })
  @IsOptional()
  @IsDateString({}, { message: 'expiresAt ISO sana formatida bo‘lishi kerak' })
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Diplom/sertifikat fayli URL' })
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'fileUrl URL bo‘lishi kerak' })
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Qo‘shimcha izoh' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ example: 50, description: 'Tasdiqlanganda beriladigan coin' })
  @IsOptional()
  @IsInt({ message: 'coinReward butun son bo‘lishi kerak' })
  @Min(0)
  @Max(1000)
  coinReward?: number;
}
