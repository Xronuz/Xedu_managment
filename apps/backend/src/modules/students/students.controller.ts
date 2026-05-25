import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { LinkParentDto } from './dto/link-parent.dto';

@ApiTags('Students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'students', version: '1' })
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(
    UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: "Yangi o'quvchi qo'shish" })
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: JwtPayload) {
    return this.studentsService.create(dto, user);
  }

  @Get()
  @Roles(
    UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER,
    UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
  )
  @ApiOperation({ summary: "O'quvchilar ro'yxati" })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.studentsService.findAll(user, page, limit, search);
  }

  @Get(':id')
  @Roles(
    UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER,
    UserRole.ACCOUNTANT, UserRole.LIBRARIAN,
  )
  @ApiOperation({ summary: "O'quvchi ma'lumotlari" })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(
    UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: "O'quvchi ma'lumotlarini yangilash" })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.update(id, dto, user);
  }

  @Post(':id/parents/link')
  @Roles(
    UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL,
    UserRole.BRANCH_ADMIN, UserRole.TEACHER, UserRole.CLASS_TEACHER,
  )
  @ApiOperation({ summary: "Ota-onani o'quvchiga biriktirish (mavjud yoki yangi)" })
  linkParent(
    @Param('id') studentId: string,
    @Body() dto: LinkParentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentsService.linkParent(studentId, dto, user);
  }
}
