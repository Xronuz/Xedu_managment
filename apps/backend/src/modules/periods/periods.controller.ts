import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard }  from '@/common/guards/jwt-auth.guard';
import { RolesGuard }    from '@/common/guards/roles.guard';
import { Roles }         from '@/common/decorators/roles.decorator';
import { CurrentUser }   from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { PeriodsService, CreatePeriodDto, UpdatePeriodDto } from './periods.service';

const PERIOD_READERS = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
];

const PERIOD_MANAGERS = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN,
];

@ApiTags('periods')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'periods', version: '1' })
export class PeriodsController {
  constructor(private readonly periodsService: PeriodsService) {}

  @Get()
  @Roles(...PERIOD_READERS)
  @ApiOperation({ summary: 'Dars soatlari ro\'yxati' })
  @ApiQuery({ name: 'branchId', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('branchId') branchId?: string,
  ) {
    return this.periodsService.findAll(user, branchId);
  }

  @Get('branch/:branchId')
  @Roles(...PERIOD_READERS)
  @ApiOperation({ summary: 'Filial bo\'yicha dars soatlari' })
  findByBranch(
    @Param('branchId') branchId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.periodsService.findByBranch(branchId, user);
  }

  @Get(':id')
  @Roles(...PERIOD_READERS)
  @ApiOperation({ summary: 'Dars soati tafsilotlari' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.periodsService.findOne(id, user);
  }

  @Post()
  @Roles(...PERIOD_MANAGERS)
  @ApiOperation({ summary: 'Yangi dars soati qo\'shish' })
  create(@Body() dto: CreatePeriodDto, @CurrentUser() user: JwtPayload) {
    return this.periodsService.create(dto, user);
  }

  @Put(':id')
  @Roles(...PERIOD_MANAGERS)
  @ApiOperation({ summary: 'Dars soatini yangilash' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePeriodDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.periodsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(...PERIOD_MANAGERS)
  @ApiOperation({ summary: 'Dars soatini o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.periodsService.remove(id, user);
  }
}
