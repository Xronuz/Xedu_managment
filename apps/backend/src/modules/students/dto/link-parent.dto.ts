import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkParentDto {
  @ApiProperty({ description: 'Mavjud ota-ona user ID (yangi yaratish bo‘lmasa)' })
  @IsOptional()
  @IsUUID('4')
  parentId?: string;

  @ApiPropertyOptional({ example: 'Vali' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Aliyev' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({ example: 'vali@school.uz' })
  @IsOptional()
  @IsEmail({}, { message: 'Email noto‘g‘ri formatda' })
  email?: string;

  @ApiPropertyOptional({ example: 'Secret123!', minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Parol katta va kichik harf hamda raqam o‘z ichiga olishi kerak',
  })
  password?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  @Matches(/^[+\d][\d\s\-().]{5,18}$/, { message: 'phone raqam noto‘g‘ri formatda' })
  phone?: string;
}
