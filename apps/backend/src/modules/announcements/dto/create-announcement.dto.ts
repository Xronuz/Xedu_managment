import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@eduplatform/types';
import { AnnouncementPriority, AnnouncementStatus } from '@prisma/client';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Yangi o‘quv yili boshlanishi' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: '2026-2027 o‘quv yili 1-sentyabrdan boshlanadi...' })
  @IsString()
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional({ enum: AnnouncementPriority, default: 'normal' })
  @IsOptional()
  @IsEnum(AnnouncementPriority)
  priority?: AnnouncementPriority;

  @ApiPropertyOptional({ enum: AnnouncementStatus, default: 'draft' })
  @IsOptional()
  @IsEnum(AnnouncementStatus)
  status?: AnnouncementStatus;

  @ApiPropertyOptional({ description: 'Target roles', enum: UserRole, isArray: true })
  @IsOptional()
  @IsArray()
  targetRoles?: UserRole[];

  @ApiPropertyOptional({ description: 'Target class ID' })
  @IsOptional()
  @IsString()
  targetClassId?: string;

  @ApiPropertyOptional({ description: 'Target branch IDs', type: [String] })
  @IsOptional()
  @IsArray()
  targetBranchIds?: string[];

  @ApiPropertyOptional({ description: 'Schedule for future delivery' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: 'Auto-expire date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Require user acknowledgement', default: false })
  @IsOptional()
  @IsBoolean()
  requireAck?: boolean;
}
