import { IsString, IsNotEmpty, IsOptional, IsEmail, IsUUID, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@eduplatform/types';

export class CreateInvitationDto {
  @ApiProperty({ example: 'sardor@maktab.uz' })
  @Transform(({ value }) => value?.toLowerCase?.()?.trim())
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'Sardor' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Karimov' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'teacher', enum: UserRole })
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @ApiPropertyOptional({ example: 'branch-uuid-123' })
  @IsOptional()
  @IsUUID('4')
  branchId?: string;
}
