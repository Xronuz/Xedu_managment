import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...', description: 'Taklif tokeni (64 ta hex belgi)' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'YangiKuchliParol123!', description: 'Kamida 8 ta belgi, 1 ta katta harf, 1 ta raqam, 1 ta maxsus belgi' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/[A-Z]/, { message: 'Parol kamida 1 ta katta harfni o\'z ichiga olishi kerak' })
  @Matches(/\d/, { message: 'Parol kamida 1 ta raqamni o\'z ichiga olishi kerak' })
  @Matches(/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/;'`~]/, { message: 'Parol kamida 1 ta maxsus belgini o\'z ichiga olishi kerak' })
  password: string;
}
