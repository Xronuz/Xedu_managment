import {
  Controller, Post, Get, Param, Body, UploadedFile, Query,
  UseInterceptors, Res, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ImportService, ImportRow } from './import.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { PrismaService } from '@/common/prisma/prisma.service';

const MANAGERS = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL];

@ApiTags('import')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'import', version: '1' })
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Namuna Excel fayllar ─────────────────────────────────────────────────

  @Get('templates/:type')
  @Roles(...MANAGERS, UserRole.ACCOUNTANT, UserRole.CLASS_TEACHER, UserRole.TEACHER)
  @ApiOperation({ summary: 'Namuna Excel fayl yuklab olish' })
  async downloadTemplate(
    @Param('type') type: 'students' | 'users' | 'schedule' | 'grades' | 'attendance',
    @Res() res: Response,
  ) {
    const buffer = await this.importService.generateTemplate(type);
    const filename = `namuna_${type}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  // ─── O'quvchilar import ───────────────────────────────────────────────────

  @Post('students/parse')
  @Roles(...MANAGERS)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: "O'quvchilar Excel faylini tekshirish (preview)" })
  parseStudents(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseStudents(file.buffer);
  }

  @Post('students/commit')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "O'quvchilarni bazaga saqlash" })
  commitStudents(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload) {
    return this.importService.commitStudents(body.rows, user, body.branchId ?? user.branchId);
  }

  // ─── Xodimlar import ──────────────────────────────────────────────────────

  @Post('users/parse')
  @Roles(UserRole.DIRECTOR)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Xodimlar Excel faylini tekshirish (preview)' })
  parseUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseUsers(file.buffer);
  }

  @Post('users/commit')
  @Roles(UserRole.DIRECTOR)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xodimlarni bazaga saqlash' })
  commitUsers(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload) {
    return this.importService.commitUsers(body.rows, user, body.branchId ?? user.branchId);
  }

  // ─── Jadval import ────────────────────────────────────────────────────────

  @Post('schedule/parse')
  @Roles(...MANAGERS)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Jadval Excel faylini tekshirish (preview)' })
  parseSchedule(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseSchedule(file.buffer, user);
  }

  @Post('schedule/commit')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Jadvalni bazaga saqlash' })
  commitSchedule(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload) {
    return this.importService.commitSchedule(body.rows, user, body.branchId ?? user.branchId);
  }

  // ─── Baholar import ───────────────────────────────────────────────────────

  @Post('grades/parse')
  @Roles(...MANAGERS, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Baholar Excel faylini tekshirish (preview)' })
  parseGrades(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseGrades(file.buffer);
  }

  @Post('grades/commit')
  @Roles(...MANAGERS, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Baholarni bazaga saqlash' })
  commitGrades(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload) {
    return this.importService.commitGrades(body.rows, user, body.branchId ?? user.branchId);
  }

  // ─── Davomat import ───────────────────────────────────────────────────────

  @Post('attendance/parse')
  @Roles(...MANAGERS, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Davomat Excel faylini tekshirish (preview)' })
  parseAttendance(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('Fayl yuklanmadi');
    return this.importService.parseAttendance(file.buffer);
  }

  @Post('attendance/commit')
  @Roles(...MANAGERS, UserRole.TEACHER, UserRole.CLASS_TEACHER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Davomatni bazaga saqlash' })
  commitAttendance(@Body() body: { rows: ImportRow[]; branchId?: string }, @CurrentUser() user: JwtPayload) {
    return this.importService.commitAttendance(body.rows, user, body.branchId ?? user.branchId);
  }

  // ─── Rollback ───────────────────────────────────────────────────────────────

  @Post('rollback')
  @Roles(...MANAGERS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'So‘nggi importni bekor qilish (vaqt oralig‘i bo‘yicha)' })
  async rollback(
    @Query('type') type: 'students' | 'users' | 'schedule' | 'grades' | 'attendance',
    @Query('since') since: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const schoolId = user.schoolId!;
    const sinceDate = new Date(since);
    let deleted = 0;

    switch (type) {
      case 'students':
        const studentIds = await this.prisma.user.findMany({
          where: { schoolId, role: 'student', createdAt: { gte: sinceDate } },
          select: { id: true },
        });
        await this.prisma.classStudent.deleteMany({ where: { studentId: { in: studentIds.map(s => s.id) } } });
        const studentRes = await this.prisma.user.deleteMany({ where: { id: { in: studentIds.map(s => s.id) } } });
        deleted = studentRes.count;
        break;
      case 'schedule':
        const scheduleRes = await this.prisma.schedule.deleteMany({ where: { schoolId, createdAt: { gte: sinceDate } } });
        deleted = scheduleRes.count;
        break;
      case 'grades':
        const gradesRes = await this.prisma.grade.deleteMany({ where: { schoolId, createdAt: { gte: sinceDate } } });
        deleted = gradesRes.count;
        break;
      case 'attendance':
        const attendanceRes = await this.prisma.attendance.deleteMany({ where: { schoolId, createdAt: { gte: sinceDate } } });
        deleted = attendanceRes.count;
        break;
      case 'users':
        const userIds = await this.prisma.user.findMany({
          where: { schoolId, role: { in: ['teacher', 'class_teacher', 'accountant', 'librarian', 'vice_principal'] }, createdAt: { gte: sinceDate } },
          select: { id: true },
        });
        const userRes = await this.prisma.user.deleteMany({ where: { id: { in: userIds.map(u => u.id) } } });
        deleted = userRes.count;
        break;
    }

    return { rolledBack: deleted };
  }
}
