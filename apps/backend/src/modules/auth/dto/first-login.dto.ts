import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FirstLoginDto {
  @ApiProperty({ example: 'currentPass123' })
  @IsString()
  @IsNotEmpty({ message: 'Joriy parol kiritilishi shart' })
  currentPassword: string;

  @ApiProperty({ example: 'NewSecret123!' })
  @IsString()
  @MinLength(8, { message: 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Parol katta va kichik harf hamda raqam o\'z ichiga olishi kerak',
  })
  newPassword: string;
}
