import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Version, ParseIntPipe, DefaultValuePipe, UseGuards, Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ScheduleService } from './schedule.service';
import { ScheduleExportService } from './schedule-export.service';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { AdvancedSolverService } from './advanced-solver.service';
import { ScheduleRepairService, AnalyzeRepairInput, ApplyRepairInput } from './schedule-repair.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { MoveScheduleDto } from './dto/move-schedule.dto';
import { GenerateScheduleDto } from './dto/generate-schedule.dto';
import { AdvancedGenerateScheduleDto } from './dto/advanced-generate-schedule.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { Response } from 'express';
import { JwtPayload, UserRole, WeekType } from '@eduplatform/types';

@ApiTags('schedule')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'schedule', version: '1' })
export class ScheduleController {
  constructor(
    private readonly scheduleService: ScheduleService,
    private readonly exportService: ScheduleExportService,
    private readonly generatorService: ScheduleGeneratorService,
    private readonly advancedSolver: AdvancedSolverService,
    private readonly repairService: ScheduleRepairService,
  ) {}

  @Get('check-conflict')
  @ApiOperation({ summary: 'Jadval ziddiyatini tekshirish' })
  @ApiQuery({ name: 'dayOfWeek', required: true })
  @ApiQuery({ name: 'timeSlot', required: true, type: Number })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'roomNumber', required: false })
  @ApiQuery({ name: 'roomId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'excludeId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'weekType', required: false, enum: WeekType })
  checkConflict(
    @CurrentUser() user: JwtPayload,
    @Query('dayOfWeek') dayOfWeek: string,
    @Query('timeSlot', ParseIntPipe) timeSlot: number,
    @Query('teacherId') teacherId?: string,
    @Query('roomNumber') roomNumber?: string,
    @Query('roomId') roomId?: string,
    @Query('classId') classId?: string,
    @Query('excludeId') excludeId?: string,
    @Query('branchId') branchId?: string,
    @Query('weekType') weekType?: WeekType,
  ) {
    return this.scheduleService.checkConflict(user, {
      dayOfWeek, timeSlot, teacherId, roomNumber, roomId, classId, excludeId, branchId, weekType,
    });
  }

  @Get('today')
  @ApiOperation({ summary: 'Bugungi darslar' })
  @ApiQuery({ name: 'weekType', required: false, enum: WeekType })
  @ApiQuery({ name: 'includeDrafts', required: false, type: Boolean })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  getToday(
    @CurrentUser() user: JwtPayload,
    @Query('weekType') weekType?: WeekType,
    @Query('includeDrafts') includeDrafts?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.scheduleService.getToday(user, {
      weekType,
      includeDrafts: includeDrafts === 'true',
      includeArchived: includeArchived === 'true',
    });
  }

  @Get('week')
  @ApiOperation({ summary: 'Haftalik jadval' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'weekType', required: false, enum: WeekType })
  @ApiQuery({ name: 'includeDrafts', required: false, type: Boolean })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  getWeek(
    @CurrentUser() user: JwtPayload,
    @Query('classId') classId?: string,
    @Query('weekType') weekType?: WeekType,
    @Query('includeDrafts') includeDrafts?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.scheduleService.getWeek(user, classId, {
      weekType,
      includeDrafts: includeDrafts === 'true',
      includeArchived: includeArchived === 'true',
    });
  }

  @Get('class/:classId')
  @ApiOperation({ summary: 'Sinf jadvali' })
  @ApiQuery({ name: 'weekType', required: false, enum: WeekType })
  @ApiQuery({ name: 'includeDrafts', required: false, type: Boolean })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  findByClass(
    @Param('classId') classId: string,
    @CurrentUser() user: JwtPayload,
    @Query('weekType') weekType?: WeekType,
    @Query('includeDrafts') includeDrafts?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.scheduleService.findByClass(classId, user, {
      weekType,
      includeDrafts: includeDrafts === 'true',
      includeArchived: includeArchived === 'true',
    });
  }

  @Post()
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Jadvalga dars qo‘shish' })
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.create(dto, user);
  }

  @Put(':id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Darsni yangilash' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateScheduleDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Darsni jadvaldan o‘chirish' })
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.remove(id, user);
  }

  @Post(':id/move')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: "Darsni boshqa kun/soatga ko'chirish" })
  move(
    @Param('id') id: string,
    @Body() dto: MoveScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.move(id, dto, user);
  }

  @Get('availability-preview')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: "O'qituvchi/sinf/xona bandligini birgalikda ko'rish" })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'roomId', required: false })
  @ApiQuery({ name: 'weekType', required: false, enum: WeekType })
  @ApiQuery({ name: 'branchId', required: false })
  availabilityPreview(
    @CurrentUser() user: JwtPayload,
    @Query('teacherId') teacherId?: string,
    @Query('classId') classId?: string,
    @Query('roomId') roomId?: string,
    @Query('weekType') weekType?: WeekType,
    @Query('branchId') branchId?: string,
  ) {
    return this.scheduleService.availabilityPreview(user, { teacherId, classId, roomId, weekType, branchId });
  }

  @Get('teacher/:teacherId/cross-branch')
  @Roles(UserRole.DIRECTOR, UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: "O'qituvchining barcha filiallardagi darslarini olish (UI greyed-out uchun)" })
  @ApiQuery({ name: 'viewerBranchId', required: false })
  @ApiQuery({ name: 'weekType', required: false, enum: WeekType })
  getTeacherCrossBranch(
    @Param('teacherId') teacherId: string,
    @CurrentUser() user: JwtPayload,
    @Query('viewerBranchId') viewerBranchId?: string,
    @Query('weekType') weekType?: WeekType,
  ) {
    return this.scheduleService.getTeacherCrossBranch(teacherId, user, viewerBranchId ?? user.branchId, { weekType });
  }

  @Post('generate')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Avto-jadval generatsiyasi (greedy MVP)' })
  async generate(
    @Body() dto: GenerateScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.generatorService.generate(dto, user);
  }

  @Post('generate/commit')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Generatsiya qilingan jadvalni saqlash' })
  async commitGenerated(
    @Body() body: { slots: any[]; overwriteExisting?: boolean },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.generatorService.commitProposed(body.slots, user, body.overwriteExisting);
  }

  @Post('advanced-generate')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Ilg‘or jadval generatsiyasi (hybrid solver)' })
  async advancedGenerate(
    @Body() dto: AdvancedGenerateScheduleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.advancedSolver.run(dto, user);
  }

  @Get('solver-runs')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Solver ishga tushirilish tarixini ko‘rish' })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listSolverRuns(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.advancedSolver.listRuns(user, {
      branchId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // ── Lifecycle endpoints ───────────────────────────────────────────────────

  @Post(':id/validate')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Jadval slotini tasdiqlash (draft → validated)' })
  validate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.validate(id, user);
  }

  @Post(':id/publish')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Jadval slotini nashr qilish (validated|draft → published)' })
  publish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.publish(id, user);
  }

  @Post(':id/unpublish')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Jadval slotini nashrdan olish (published → draft)' })
  unpublish(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.unpublish(id, user);
  }

  @Post(':id/archive')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Jadval slotini arxivlash' })
  archive(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.scheduleService.archive(id, user);
  }

  @Post('bulk-publish')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL)
  @ApiOperation({ summary: 'Bir nechta jadval slotlarini nashr qilish' })
  bulkPublish(
    @Body() body: { ids: string[] },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scheduleService.bulkPublish(body.ids, user);
  }

  @Get('week-type/current')
  @ApiOperation({ summary: 'Joriy hafta turi (surat/maxraj)' })
  getCurrentWeekType() {
    return this.scheduleService.getCurrentWeekType();
  }

  @Get('export/excel')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Jadvalni Excel formatida yuklab olish' })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'weekType', required: false, enum: WeekType })
  @ApiQuery({ name: 'includeDrafts', required: false, type: Boolean })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  async exportExcel(
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
    @Query('classId') classId?: string,
    @Query('weekType') weekType?: WeekType,
    @Query('includeDrafts') includeDrafts?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    const buffer = await this.exportService.exportExcel(user, {
      classId,
      weekType,
      includeDrafts: includeDrafts === 'true',
      includeArchived: includeArchived === 'true',
    });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="jadval_${Date.now()}.xlsx"`);
    res.send(buffer);
  }

  // ── Schedule Repair (Phase 5B.4) ───────────────────────────────────────────

  @Post('repair/analyze')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Jadval buzilishini tahlil qilish va ta\'mir variantlarini taklif qilish' })
  analyzeRepair(
    @Body() input: AnalyzeRepairInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.repairService.analyze(input, user);
  }

  @Post('repair/apply')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Tanlangan ta\'mir variantini qo\'llash (faqat almashtirish)' })
  applyRepair(
    @Body() input: ApplyRepairInput,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.repairService.apply(input, user);
  }
}
