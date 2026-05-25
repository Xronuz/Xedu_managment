import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'Ali' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Valiyev' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'ali@school.uz' })
  @IsEmail({}, { message: 'Email noto‘g‘ri formatda' })
  email: string;

  @ApiProperty({ example: 'Secret123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Parol kamida 8 ta belgidan iborat bo‘lishi kerak' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Parol katta va kichik harf hamda raqam o‘z ichiga olishi kerak',
  })
  password: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^[+\d][\d\s\-().]{5,18}$/, { message: 'phone raqam noto‘g‘ri formatda' })
  phone?: string;

  @ApiPropertyOptional({ description: 'Sinf ID (UUID) — ixtiyoriy' })
  @IsOptional()
  @IsUUID('4', { message: 'classId UUID formatida bo‘lishi kerak' })
  classId?: string;

  @ApiPropertyOptional({ description: 'Filial ID (UUID) — ixtiyoriy, default actor branch' })
  @IsOptional()
  @IsUUID('4', { message: 'branchId UUID formatida bo‘lishi kerak' })
  branchId?: string;
}
