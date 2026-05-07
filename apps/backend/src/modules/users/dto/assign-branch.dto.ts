import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@eduplatform/types';

export class AssignBranchDto {
  @ApiProperty({ description: 'Filial ID' })
  @IsString()
  branchId: string;

  @ApiProperty({ description: 'Bu filial uchun rol', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
