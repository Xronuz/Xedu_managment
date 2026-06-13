import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

const STAFF = [
  UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN,
  UserRole.TEACHER, UserRole.CLASS_TEACHER,
];

@ApiTags('Portfolio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'portfolio', version: '1' })
export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}

  @Post()
  @Roles(...STAFF)
  @ApiOperation({ summary: "Portfolio yutug'i qo'shish" })
  create(@Body() dto: CreatePortfolioDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user);
  }

  @Get()
  @Roles(...STAFF, UserRole.PARENT, UserRole.STUDENT)
  @ApiOperation({ summary: "O'quvchining portfolio yutuqlari" })
  findAll(@Query('studentId') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.service.findAllForStudent(studentId, user);
  }

  @Get('teacher-points/me')
  @Roles(...STAFF)
  @ApiOperation({ summary: "O'qituvchining portfolio-KPI ballari" })
  myTeacherPoints(@Query('teacherId') teacherId: string | undefined, @CurrentUser() user: JwtPayload) {
    // teacherId faqat admin/direktor uchun; oddiy o'qituvchiga o'zinikini qaytaradi
    const canQueryOthers = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN].includes(user.role as any);
    return this.service.getTeacherPoints(user, canQueryOthers ? teacherId : undefined);
  }

  @Get(':id')
  @Roles(...STAFF, UserRole.PARENT, UserRole.STUDENT)
  @ApiOperation({ summary: "Yutuq tafsiloti" })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(...STAFF)
  @ApiOperation({ summary: "Yutuqni tahrirlash" })
  update(@Param('id') id: string, @Body() dto: UpdatePortfolioDto, @CurrentUser() user: JwtPayload) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/verify')
  @Roles(...STAFF)
  @ApiOperation({ summary: "Yutuqni tasdiqlash (coin beriladi)" })
  verify(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.verify(id, user);
  }

  @Delete(':id')
  @Roles(...STAFF)
  @ApiOperation({ summary: "Yutuqni o'chirish" })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user);
  }
}
