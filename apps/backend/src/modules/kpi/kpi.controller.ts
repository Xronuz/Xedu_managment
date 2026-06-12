import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, ParseUUIDPipe, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ModuleAccessGuard } from '@/common/guards/module-access.guard';
import { RequiresModule } from '@/common/decorators/requires-module.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { KpiService } from './kpi.service';
import { KpiSnapshotService } from './kpi-snapshot.service';
import { CreateKpiMetricDto, UpdateKpiMetricDto, CreateKpiRecordDto, RunKpiSnapshotDto } from './dto/create-kpi.dto';
import { KpiCategory } from '@prisma/client';

@ApiTags('kpi')
@ApiBearerAuth('JWT')
@RequiresModule('kpi')
@UseGuards(JwtAuthGuard, RolesGuard, ModuleAccessGuard)
@Controller({ path: 'kpi', version: '1' })
export class KpiController {
  constructor(
    private readonly kpiService: KpiService,
    private readonly snapshotService: KpiSnapshotService,
  ) {}

  @Get('catalog')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tizim metrikalari katalogi (avtomatik KPI shablonlari)' })
  getCatalog(@CurrentUser() user: JwtPayload) {
    return this.kpiService.getCatalog(user);
  }

  @Post('snapshot/run')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "SYSTEM metrikalar snapshot'ini qo'lda ishga tushirish (test/backfill)" })
  async runSnapshot(@Body() dto: RunKpiSnapshotDto, @CurrentUser() user: JwtPayload) {
    let start: Date, end: Date;
    if (dto.period) {
      const m = /^(\d{4})-(\d{2})$/.exec(dto.period);
      if (!m) throw new BadRequestException('period formati: YYYY-MM');
      const year = Number(m[1]);
      const month = Number(m[2]);
      if (month < 1 || month > 12) throw new BadRequestException("Oy 01–12 oralig'ida bo'lishi kerak");
      start = new Date(Date.UTC(year, month - 1, 1));
      end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    } else {
      ({ start, end } = this.snapshotService.previousMonthRange());
    }
    // Super admin bo'lmasa — faqat o'z maktabi uchun
    const schoolId = user.isSuperAdmin ? undefined : user.schoolId!;
    return this.snapshotService.snapshotPeriod(start, end, schoolId);
  }

  @Get('branch-comparison')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tizim metrikalarini filiallar kesimida solishtirish (jonli hisob)' })
  @ApiQuery({ name: 'period', required: false, description: "YYYY-MM (default: o'tgan oy)" })
  async branchComparison(@CurrentUser() user: JwtPayload, @Query('period') period?: string) {
    let start: Date, end: Date;
    if (period) {
      const m = /^(\d{4})-(\d{2})$/.exec(period);
      if (!m) throw new BadRequestException('period formati: YYYY-MM');
      start = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
      end = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0, 23, 59, 59, 999));
    } else {
      ({ start, end } = this.snapshotService.previousMonthRange());
    }
    if (!user.schoolId) throw new BadRequestException('Maktab konteksti yo‘q');
    return this.snapshotService.compareBranches(user.schoolId, start, end);
  }

  @Get('metrics')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrikalar ro‘yxati' })
  @ApiQuery({ name: 'category', required: false, enum: KpiCategory })
  findMetrics(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: KpiCategory,
  ) {
    return this.kpiService.findMetrics(user, category);
  }

  @Get('metrics/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrika tafsilotlari + tarixi' })
  findMetric(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.kpiService.findMetric(id, user);
  }

  @Post('metrics')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrika yaratish' })
  createMetric(@Body() dto: CreateKpiMetricDto, @CurrentUser() user: JwtPayload) {
    return this.kpiService.createMetric(dto, user);
  }

  @Put('metrics/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrika yangilash' })
  updateMetric(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKpiMetricDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.kpiService.updateMetric(id, dto, user);
  }

  @Delete('metrics/:id')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI metrika o‘chirish' })
  deleteMetric(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.kpiService.deleteMetric(id, user);
  }

  @Post('records')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI qiymat kiritish' })
  createRecord(@Body() dto: CreateKpiRecordDto, @CurrentUser() user: JwtPayload) {
    return this.kpiService.createRecord(dto, user);
  }

  @Get('dashboard')
  @Roles(UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'KPI dashboard (so‘nggi qiymatlar)' })
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.kpiService.getDashboard(user);
  }
}
