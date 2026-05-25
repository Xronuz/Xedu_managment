import { IsString, IsNotEmpty, IsInt, Min, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DayOfWeek } from '@eduplatform/types';

export class MoveScheduleDto {
  @ApiProperty({ enum: DayOfWeek })
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @ApiProperty({ example: 1, description: 'Dars tartib raqami (1-8)' })
  @IsInt()
  @Min(1)
  timeSlot: number;

  @ApiPropertyOptional({ description: 'Room modelidan xona IDsi' })
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @ApiPropertyOptional({ example: '201', description: 'Legacy: string xona raqami' })
  @IsOptional()
  @IsString()
  roomNumber?: string;
}
