import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';

const STAFF_ROLES = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN,
  UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
];

const MANAGER_ROLES = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN];

@ApiTags('teacher-attendance')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'teacher-attendance', version: '1' })
export class TeacherAttendanceController {
  constructor(private readonly service: TeacherAttendanceService) {}

  // ── Attendance ────────────────────────────────────────────────────────────

  @Get(':teacherId')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "O'qituvchi davomati" })
  findByTeacher(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findByTeacher(teacherId, user, { from, to });
  }

  @Post('mark')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: "Davomat belgilash" })
  markAttendance(
    @Body() body: {
      teacherId: string;
      date: string;
      status: string;
      scheduleId?: string;
      notes?: string;
      source?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.markAttendance(body, user);
  }

  // ── Substitutions ─────────────────────────────────────────────────────────

  @Get('substitutions')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Almashtirishlar ro\'yxati' })
  findSubstitutions(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('teacherId') teacherId?: string,
    @Query('date') date?: string,
  ) {
    return this.service.findSubstitutions(user, { status, teacherId, date });
  }

  @Get('substitutions/:id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Almashtirish tafsiloti' })
  findSubstitutionById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findSubstitutionById(id, user);
  }

  @Post('substitutions')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Almashtirish yaratish' })
  createSubstitution(
    @Body() body: {
      date: string;
      scheduleId: string;
      originalTeacherId: string;
      substituteTeacherId: string;
      reason?: string;
      notes?: string;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createSubstitution(body, user);
  }

  @Put('substitutions/:id/review')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Almashtirishni tasdiqlash/rad etish' })
  reviewSubstitution(
    @Param('id') id: string,
    @Body() dto: { action: 'approve' | 'reject'; comment?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reviewSubstitution(id, dto, user);
  }
}
