import { Controller, Post, Get, Param, Res, Body, Query, UseGuards, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ExportService } from './export.service';
import { CreateExportJobDto } from './dto/create-export-job.dto';
import { ExportJobResponseDto, ExportJobListResponseDto } from './dto/export-job-response.dto';
import { JwtPayload, UserRole } from '@eduplatform/types';

@ApiTags('exports')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'exports', version: '1' })
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi eksport job yaratish va ishga tushirish' })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateExportJobDto,
  ): Promise<ExportJobResponseDto> {
    const job = await this.exportService.createAndProcess(user, dto.entity, dto.format, {
      branchId: dto.branchId,
      dateFrom: dto.dateFrom,
      dateTo: dto.dateTo,
      status: dto.status,
      weekType: dto.weekType,
    });
    return this.mapJob(job);
  }

  @Get()
  @ApiOperation({ summary: 'Eksport joblari ro\'yxati' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  async list(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<ExportJobListResponseDto> {
    const result = await this.exportService.listJobs(user, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    return { data: result.data.map(j => this.mapJob(j)), total: result.total };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Bitta eksport job ma\'lumotlari' })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  async getOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ExportJobResponseDto> {
    const job = await this.exportService.getJob(user, id);
    return this.mapJob(job);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Tayyor bo\'lgan eksport faylini yuklab olish' })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  async download(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename, contentType } = await this.exportService.downloadFile(user, id);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eksport jobni bekor qilish' })
  @Roles(
    UserRole.DIRECTOR,
    UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN,
    UserRole.ACCOUNTANT,
    UserRole.TEACHER,
    UserRole.CLASS_TEACHER,
  )
  async cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ExportJobResponseDto> {
    const job = await this.exportService.cancelJob(user, id);
    return this.mapJob(job);
  }

  private mapJob(job: any): ExportJobResponseDto {
    return {
      id: job.id,
      entity: job.entity,
      format: job.format,
      status: job.status,
      progress: job.progress,
      fileUrl: job.fileUrl,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdBy: job.createdBy,
    };
  }
}
