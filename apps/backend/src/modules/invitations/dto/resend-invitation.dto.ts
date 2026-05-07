import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ResendInvitationDto {
  @ApiPropertyOptional({ example: 'Yangi xabar matni' })
  @IsOptional()
  @IsString()
  note?: string;
}
