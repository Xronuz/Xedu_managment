import { Controller, Get, Post, Patch, Param, Body, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { UserRole } from '@eduplatform/types';
import { DemoRequestsService, CreateDemoRequestDto, UpdateDemoRequestDto } from './demo-requests.service';
import { DemoRequestStatus } from '@prisma/client';

@ApiTags('demo-requests')
@Controller({ path: 'demo-requests', version: '1' })
export class DemoRequestsController {
  constructor(private readonly service: DemoRequestsService) {}

  /** Public — auth talab qilinmaydi */
  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Demo so\'rov yuborish (public)' })
  create(@Body() dto: CreateDemoRequestDto) {
    return this.service.create(dto);
  }

  /** Super admin endpoints */
  @Get()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Barcha demo so\'rovlar (super admin)' })
  findAll(
    @Query('page')   page   = 1,
    @Query('limit')  limit  = 20,
    @Query('status') status?: DemoRequestStatus,
  ) {
    return this.service.findAll({ page: +page, limit: +limit, status });
  }

  @Get('stats')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Demo so\'rovlar statistikasi' })
  getStats() {
    return this.service.getStats();
  }

  @Get(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Demo so\'rov detail' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Status / notes yangilash' })
  update(@Param('id') id: string, @Body() dto: UpdateDemoRequestDto) {
    return this.service.update(id, dto);
  }
}
