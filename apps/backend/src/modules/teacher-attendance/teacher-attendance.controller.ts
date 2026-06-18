import {
  Controller, Get, Post, Put, Body, Param, Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { SubstitutionWorkflowService } from './substitution-workflow.service';
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
  constructor(
    private readonly service: TeacherAttendanceService,
    private readonly workflow: SubstitutionWorkflowService,
  ) {}

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

  // ── Legacy Substitutions (backward compatible) ────────────────────────────

  @Get('substitutions')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Almashtirishlar ro\'yxati (legacy)' })
  findSubstitutions(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('teacherId') teacherId?: string,
    @Query('date') date?: string,
  ) {
    return this.service.findSubstitutions(user, { status, teacherId, date });
  }

  // ── Substitution Workflow (Phase 5B.2) ────────────────────────────────────
  // IMPORTANT: specific GET routes MUST come before parameterized :id catch-all,
  // otherwise NestJS matches "list", "affected", "candidates" etc. as :id values.

  @Get('substitutions/affected')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: "Ta'til ta'sirlangan dars slotlari" })
  @ApiQuery({ name: 'leaveRequestId', required: true })
  getAffectedSchedules(
    @Query('leaveRequestId') leaveRequestId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workflow.getAffectedSchedules(leaveRequestId, user);
  }

  @Get('substitutions/candidates')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: "O'rinbosar nomzodlarini reytinglash" })
  @ApiQuery({ name: 'scheduleId', required: true })
  @ApiQuery({ name: 'date', required: true })
  getCandidates(
    @Query('scheduleId') scheduleId: string,
    @Query('date') date: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workflow.getCandidates(scheduleId, date, user);
  }

  // List and detail via workflow (before :id catch-all)
  @Get('substitutions/list')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Almashtirishlar ro\'yxati' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  listSubstitutions(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('teacherId') teacherId?: string,
    @Query('date') date?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.workflow.listSubstitutions(user, {
      status,
      teacherId,
      date,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('substitutions/detail/:id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Almashtirish tafsiloti' })
  getSubstitution(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.workflow.getSubstitution(id, user);
  }

  // Parameterized :id MUST be last among GET routes to avoid shadowing
  // the specific paths above (list, affected, candidates, detail/:id).
  @Get('substitutions/:id')
  @Roles(...STAFF_ROLES)
  @ApiOperation({ summary: 'Almashtirish tafsiloti (legacy)' })
  findSubstitutionById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findSubstitutionById(id, user);
  }

  @Post('substitutions')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Almashtirish yaratish (legacy)' })
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
  @ApiOperation({ summary: 'Almashtirishni tasdiqlash/rad etish (legacy)' })
  reviewSubstitution(
    @Param('id') id: string,
    @Body() dto: { action: 'approve' | 'reject'; comment?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reviewSubstitution(id, dto, user);
  }

  @Post('substitutions/propose')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Almashtirish taklif qilish' })
  proposeSubstitutions(
    @Body() body: {
      leaveRequestId: string;
      selections: Array<{ scheduleId: string; date: string; substituteTeacherId: string; reason?: string }>;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workflow.proposeSubstitutions(body, user);
  }

  @Post('substitutions/:id/approve')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Almashtirishni tasdiqlash' })
  approveSubstitution(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.workflow.approveSubstitution(id, user);
  }

  @Post('substitutions/:id/reject')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Almashtirishni rad etish' })
  rejectSubstitution(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workflow.rejectSubstitution(id, body.reason, user);
  }

  @Post('substitutions/:id/apply')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: "Almashtirishni qo'llash" })
  applySubstitution(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.workflow.applySubstitution(id, user);
  }

  @Post('substitutions/:id/cancel')
  @Roles(...MANAGER_ROLES)
  @ApiOperation({ summary: 'Almashtirishni bekor qilish' })
  cancelSubstitution(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workflow.cancelSubstitution(id, body.reason, user);
  }
}
