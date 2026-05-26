import { ApiProperty } from '@nestjs/swagger';

export class TodaySummaryStatsDto {
  @ApiProperty() totalClassesToday!: number;
  @ApiProperty() totalTeachersToday!: number;
  @ApiProperty() periodsConfigured!: boolean;
  @ApiProperty() roomsConfigured!: boolean;
}

export class TodaySummaryScheduleDto {
  @ApiProperty() publishedSlots!: number;
  @ApiProperty() draftSlots!: number;
  @ApiProperty() conflicts!: number;
}

export class TodaySummaryStaffDto {
  @ApiProperty() teachersPresent!: number;
  @ApiProperty() teachersAbsent!: number;
  @ApiProperty() teachersSubstituted!: number;
  @ApiProperty() pendingLeaveRequests!: number;
}

export class TodaySummarySubstitutionsDto {
  @ApiProperty() pendingProposals!: number;
  @ApiProperty() activeToday!: number;
}

export class TodaySummaryPayrollDto {
  @ApiProperty() currentMonthStatus!: string;
  @ApiProperty() missingAttendanceCount!: number;
}

export class TodaySummaryAlertsDto {
  @ApiProperty() critical!: number;
  @ApiProperty() warning!: number;
  @ApiProperty() info!: number;
}

export class TodaySummaryResponseDto {
  @ApiProperty() date!: string;
  @ApiProperty() schoolId!: string;
  @ApiProperty({ required: false }) branchId?: string;
  @ApiProperty() stats!: TodaySummaryStatsDto;
  @ApiProperty() schedule!: TodaySummaryScheduleDto;
  @ApiProperty() staff!: TodaySummaryStaffDto;
  @ApiProperty() substitutions!: TodaySummarySubstitutionsDto;
  @ApiProperty() payroll!: TodaySummaryPayrollDto;
  @ApiProperty() alerts!: TodaySummaryAlertsDto;
}

export class OpsAlertDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: ['critical', 'warning', 'info'] }) severity!: 'critical' | 'warning' | 'info';
  @ApiProperty({ enum: ['schedule', 'staff', 'payroll', 'setup'] }) category!: 'schedule' | 'staff' | 'payroll' | 'setup';
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty({ required: false }) entityId?: string;
  @ApiProperty({ required: false }) entityType?: string;
  @ApiProperty({ required: false }) link?: string;
  @ApiProperty() createdAt!: string;
}

export class ReadinessItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() label!: string;
  @ApiProperty() category!: string;
  @ApiProperty() weight!: number;
  @ApiProperty() completed!: boolean;
  @ApiProperty() required!: boolean;
  @ApiProperty({ required: false }) link?: string;
}

export class ReadinessScoreResponseDto {
  @ApiProperty() score!: number;
  @ApiProperty({ enum: ['not_started', 'in_progress', 'ready', 'operational'] }) status!: 'not_started' | 'in_progress' | 'ready' | 'operational';
  @ApiProperty({ type: [ReadinessItemDto] }) checklist!: ReadinessItemDto[];
}
