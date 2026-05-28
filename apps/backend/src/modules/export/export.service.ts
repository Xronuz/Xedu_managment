import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { ExportJob, ExportEntity, ExportFormat, ExportJobStatus, Prisma } from '@prisma/client';
import { JwtPayload } from '@eduplatform/types';
import * as ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import * as path from 'path';
import * as fs from 'fs';

const EXPORT_DIR = path.join(process.cwd(), 'uploads', 'exports');

export interface ExportFilters {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  weekType?: string;
}

/** RBAC mapping: which roles can export which entities */
const ENTITY_ROLE_ACCESS: Record<ExportEntity, string[]> = {
  [ExportEntity.schedules]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.teaching_loads]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.payroll]: ['director', 'vice_principal', 'accountant'],
  [ExportEntity.users]: ['director', 'vice_principal', 'branch_admin'],
  [ExportEntity.analytics_summary]: ['director', 'vice_principal', 'branch_admin', 'accountant'],
  [ExportEntity.classes]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.subjects]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.rooms]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.attendance]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.teacher_attendance]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.substitutions]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.leave_requests]: ['director', 'vice_principal', 'branch_admin'],
  [ExportEntity.workload_report]: ['director', 'vice_principal', 'branch_admin', 'accountant'],
  [ExportEntity.timetable_analytics]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher', 'accountant'],
};

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    if (!fs.existsSync(EXPORT_DIR)) {
      fs.mkdirSync(EXPORT_DIR, { recursive: true });
    }
  }

  /** Validate RBAC for entity export */
  assertCanExport(user: JwtPayload, entity: ExportEntity): void {
    const allowed = ENTITY_ROLE_ACCESS[entity];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(`Siz ${entity} eksport qilish huquqiga ega emassiz`);
    }
  }

  /** Branch scope enforcement for branch_admin */
  applyBranchScope(user: JwtPayload, explicitBranchId?: string): string | { in: string[] } | undefined {
    if (user.role === 'branch_admin') {
      const branches = [user.branchId!, ...(user.assignedBranchIds ?? [])];
      if (explicitBranchId) {
        if (!branches.includes(explicitBranchId)) {
          throw new ForbiddenException('Faqat o\'z filialingiz ma\'lumotlarini eksport qilishingiz mumkin');
        }
        return explicitBranchId;
      }
      return branches.length === 1 ? branches[0] : { in: branches };
    }
    // Director / VP / Accountant can optionally scope to a branch
    return explicitBranchId;
  }

  /** Create an export job record (without processing) */
  async createJob(
    user: JwtPayload,
    entity: ExportEntity,
    format: ExportFormat,
    filters: ExportFilters,
  ): Promise<ExportJob> {
    this.assertCanExport(user, entity);
    const scopedBranchId = this.applyBranchScope(user, filters.branchId);

    const job = await this.prisma.exportJob.create({
      data: {
        schoolId: user.schoolId!,
        branchId: typeof scopedBranchId === 'string' ? scopedBranchId : undefined,
        createdBy: user.sub,
        entity,
        format,
        status: ExportJobStatus.queued,
        progress: 0,
      },
    });

    // Audit log
    await this.auditService.log({
      userId: user.sub,
      schoolId: user.schoolId ?? undefined,
      branchId: typeof scopedBranchId === 'string' ? scopedBranchId : undefined,
      action: 'export',
      entity: 'ExportJob',
      entityId: job.id,
      newData: { entity, format, filters },
    });

    return job;
  }

  /** Create and immediately process an export job (sync fallback) */
  async createAndProcess(
    user: JwtPayload,
    entity: ExportEntity,
    format: ExportFormat,
    filters: ExportFilters,
  ): Promise<ExportJob> {
    const job = await this.createJob(user, entity, format, filters);

    try {
      await this.processJob(job, user, filters);
    } catch (err) {
      this.logger.error(`Export job ${job.id} failed`, err);
      await this.prisma.exportJob.update({
        where: { id: job.id },
        data: { status: ExportJobStatus.failed, error: (err as Error).message },
      });
      throw err;
    }

    return this.prisma.exportJob.findUniqueOrThrow({ where: { id: job.id } });
  }

  /** List export jobs for the current user/school */
  async listJobs(user: JwtPayload, opts: { page?: number; limit?: number } = {}) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ExportJobWhereInput = { schoolId: user.schoolId! };

    // Branch admins only see their branch's exports
    if (user.role === 'branch_admin') {
      const branches = [user.branchId!, ...(user.assignedBranchIds ?? [])];
      where.branchId = branches.length === 1 ? branches[0] : { in: branches };
    }

    // Non-directors/VP only see their own exports
    if (!['director', 'vice_principal'].includes(user.role)) {
      where.createdBy = user.sub;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.exportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.exportJob.count({ where }),
    ]);

    return { data, total };
  }

  /** Get a single export job */
  async getJob(user: JwtPayload, jobId: string): Promise<ExportJob> {
    const job = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Eksport topilmadi');
    if (job.schoolId !== user.schoolId) throw new ForbiddenException();

    // Branch admin scope check
    if (user.role === 'branch_admin') {
      const branches = [user.branchId!, ...(user.assignedBranchIds ?? [])];
      if (job.branchId && !branches.includes(job.branchId)) {
        throw new ForbiddenException();
      }
    }

    // Non-directors/VP can only see their own
    if (!['director', 'vice_principal'].includes(user.role) && job.createdBy !== user.sub) {
      throw new ForbiddenException();
    }

    return job;
  }

  /** Cancel a queued or processing job */
  async cancelJob(user: JwtPayload, jobId: string): Promise<ExportJob> {
    const job = await this.getJob(user, jobId);
    if (job.status === ExportJobStatus.completed || job.status === ExportJobStatus.failed) {
      throw new BadRequestException('Bajarilgan eksportni bekor qilib bo\'lmaydi');
    }
    return this.prisma.exportJob.update({
      where: { id: jobId },
      data: { status: ExportJobStatus.cancelled },
    });
  }

  /** Download a completed export file */
  async downloadFile(user: JwtPayload, jobId: string): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const job = await this.getJob(user, jobId);
    if (job.status !== ExportJobStatus.completed || !job.fileUrl) {
      throw new BadRequestException('Eksport hali tayyor emas');
    }
    const filePath = path.join(EXPORT_DIR, job.fileUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Fayl topilmadi');
    }
    const buffer = fs.readFileSync(filePath);
    const ext = job.format === ExportFormat.xlsx ? 'xlsx' : job.format === ExportFormat.csv ? 'csv' : 'json';
    const filename = `${job.entity}_${job.id.slice(0, 8)}.${ext}`;
    const contentType = job.format === ExportFormat.xlsx
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : job.format === ExportFormat.csv
        ? 'text/csv'
        : 'application/json';
    return { buffer, filename, contentType };
  }

  // ─── Processing ───────────────────────────────────────────────────────────

  async processJob(job: ExportJob, user: JwtPayload, filters: ExportFilters): Promise<void> {
    await this.prisma.exportJob.update({
      where: { id: job.id },
      data: { status: ExportJobStatus.processing, startedAt: new Date(), progress: 10 },
    });

    let buffer: Buffer;
    switch (job.entity) {
      case ExportEntity.schedules:
        buffer = await this.exportSchedules(user, job, filters);
        break;
      case ExportEntity.teaching_loads:
        buffer = await this.exportTeachingLoads(user, job, filters);
        break;
      case ExportEntity.payroll:
        buffer = await this.exportPayroll(user, job, filters);
        break;
      case ExportEntity.users:
        buffer = await this.exportUsers(user, job, filters);
        break;
      case ExportEntity.analytics_summary:
        buffer = await this.exportAnalyticsSummary(user, job, filters);
        break;
      case ExportEntity.classes:
        buffer = await this.exportClasses(user, job, filters);
        break;
      case ExportEntity.subjects:
        buffer = await this.exportSubjects(user, job, filters);
        break;
      case ExportEntity.rooms:
        buffer = await this.exportRooms(user, job, filters);
        break;
      case ExportEntity.attendance:
        buffer = await this.exportAttendance(user, job, filters);
        break;
      case ExportEntity.teacher_attendance:
        buffer = await this.exportTeacherAttendance(user, job, filters);
        break;
      case ExportEntity.substitutions:
        buffer = await this.exportSubstitutions(user, job, filters);
        break;
      case ExportEntity.leave_requests:
        buffer = await this.exportLeaveRequests(user, job, filters);
        break;
      case ExportEntity.workload_report:
        buffer = await this.exportWorkloadReport(user, job, filters);
        break;
      case ExportEntity.timetable_analytics:
        buffer = await this.exportTimetableAnalytics(user, job, filters);
        break;
      default:
        throw new BadRequestException('Noma\'lum entity');
    }

    await this.prisma.exportJob.update({
      where: { id: job.id },
      data: { progress: 90 },
    });

    const filename = `${job.id}.${job.format === ExportFormat.xlsx ? 'xlsx' : job.format === ExportFormat.csv ? 'csv' : 'json'}`;
    const filePath = path.join(EXPORT_DIR, filename);
    fs.writeFileSync(filePath, buffer);

    await this.prisma.exportJob.update({
      where: { id: job.id },
      data: { status: ExportJobStatus.completed, progress: 100, fileUrl: filename, completedAt: new Date() },
    });
  }

  // ─── Filter helpers ───────────────────────────────────────────────────────

  private buildDateFilter(filters: ExportFilters): { gte?: Date; lte?: Date } | undefined {
    if (!filters.dateFrom && !filters.dateTo) return undefined;
    const range: { gte?: Date; lte?: Date } = {};
    if (filters.dateFrom) range.gte = new Date(filters.dateFrom);
    if (filters.dateTo) range.lte = new Date(filters.dateTo);
    return range;
  }

  // ─── Entity Exporters ─────────────────────────────────────────────────────

  private async exportSchedules(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.ScheduleWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;
    if (filters.status) where.status = filters.status as any;
    if (filters.weekType) where.weekType = filters.weekType as any;

    const rows = await this.prisma.schedule.findMany({
      where,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        room: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });

    const data = rows.map(s => ({
      Sinf: s.class?.name ?? '',
      Fan: s.subject?.name ?? '',
      "O'qituvchi": s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : '',
      Kun: s.dayOfWeek,
      Slot: s.timeSlot,
      Boshlanish: s.startTime,
      Tugash: s.endTime,
      Xona: s.room?.name ?? s.roomNumber ?? '',
      "Hafta turi": s.weekType,
      Status: s.status,
      Filial: s.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, 'Jadval');
  }

  private async exportTeachingLoads(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.TeachingLoadWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;
    if (filters.status) where.status = filters.status as any;

    const rows = await this.prisma.teachingLoad.findMany({
      where,
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        subject: { select: { name: true } },
        class: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map(t => ({
      "O'qituvchi": t.teacher ? `${t.teacher.firstName} ${t.teacher.lastName}` : '',
      Fan: t.subject?.name ?? '',
      Sinf: t.class?.name ?? '',
      "Soat/hafta": t.hoursPerWeek,
      "Soat/yil": t.hoursPerYear ?? '',
      Semestr: t.semester ?? '',
      "Guruh turi": t.groupType ?? '',
      "Bo'linish sinfi": t.isSplitClass ? 'Ha' : 'Yo\'q',
      Koeffitsient: t.coefficient,
      Status: t.status,
      Izoh: t.notes ?? '',
      Filial: t.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, "O'quv yuklamalari");
  }

  private async exportPayroll(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.MonthlyPayrollWhereInput = { schoolId: job.schoolId };
    const dateRange = this.buildDateFilter(filters);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    const rows = await this.prisma.monthlyPayroll.findMany({
      where,
      include: {
        items: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const data: Record<string, any>[] = [];
    for (const payroll of rows) {
      for (const item of payroll.items) {
        data.push({
          Period: `${payroll.year}-${String(payroll.month).padStart(2, '0')}`,
          Xodim: item.user ? `${item.user.firstName} ${item.user.lastName}` : '',
          Email: item.user?.email ?? '',
          "Rejalashtirilgan soat": item.scheduledHours,
          "Bajarilgan soat": item.completedHours,
          "Soatlik summa": item.hourlyAmount,
          "Asosiy oylik": item.baseSalary,
          "Ilmiy daraja": item.degreeAllowance,
          "Sertifikat": item.certificateAllowance,
          "Qo'shimcha darslar": item.extraCurricularHours,
          "Qo'shimcha summa": item.extraCurricularAmount,
          Bonus: item.bonuses,
          Jarima: item.deductions,
          "Jami brutto": item.grossTotal,
          Avans: item.advancePaid,
          "Jami netto": item.netTotal,
          Izoh: item.note ?? '',
        });
      }
    }

    return this.serialize(data, job.format, 'Ish haqi');
  }

  private async exportUsers(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.UserWhereInput = { schoolId: job.schoolId };
    if (job.branchId) where.branchId = job.branchId;
    if (filters.status) where.isActive = filters.status === 'active' ? true : filters.status === 'inactive' ? false : undefined;

    const rows = await this.prisma.user.findMany({
      where,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        language: true,
        createdAt: true,
        branch: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map(u => ({
      Ism: u.firstName,
      Familiya: u.lastName,
      Email: u.email,
      Telefon: u.phone ?? '',
      Rol: u.role,
      Holat: u.isActive ? 'Faol' : 'Nofaol',
      Til: u.language,
      "Ro'yxatdan o'tgan": u.createdAt.toISOString().slice(0, 10),
      Filial: u.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, 'Foydalanuvchilar');
  }

  private async exportAnalyticsSummary(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const schoolId = job.schoolId;
    const branchId = job.branchId;
    const where = branchId ? { schoolId, branchId } : { schoolId };

    const [studentCount, teacherCount, classCount, scheduleCount, paymentSum] = await Promise.all([
      this.prisma.user.count({ where: { ...where, role: 'student' } }),
      this.prisma.user.count({ where: { ...where, role: { in: ['teacher', 'class_teacher'] } } }),
      this.prisma.class.count({ where: where as Prisma.ClassWhereInput }),
      this.prisma.schedule.count({ where: { ...where, status: 'published' } as Prisma.ScheduleWhereInput }),
      this.prisma.payment.aggregate({
        where: { ...where, status: 'paid' } as Prisma.PaymentWhereInput,
        _sum: { amount: true },
      }),
    ]);

    const data = [{
      "Ko'rsatkich": "O'quvchilar soni",
      Qiymat: studentCount,
    }, {
      "Ko'rsatkich": "O'qituvchilar soni",
      Qiymat: teacherCount,
    }, {
      "Ko'rsatkich": "Sinflar soni",
      Qiymat: classCount,
    }, {
      "Ko'rsatkich": "Jadval slotlari",
      Qiymat: scheduleCount,
    }, {
      "Ko'rsatkich": "To'langan summa",
      Qiymat: paymentSum._sum.amount ?? 0,
    }];

    return this.serialize(data, job.format, 'Analytics');
  }

  // ─── NEW: Classes ─────────────────────────────────────────────────────────

  private async exportClasses(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.ClassWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;

    const rows = await this.prisma.class.findMany({
      where,
      include: {
        classTeacher: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
        students: { include: { student: { select: { id: true } } } },
      },
      orderBy: { gradeLevel: 'asc' },
    });

    const data = rows.map(c => ({
      Nomi: c.name,
      "Sinf darajasi": c.gradeLevel,
      "Akademik yil": c.academicYear,
      "Sinf rahbari": c.classTeacher ? `${c.classTeacher.firstName} ${c.classTeacher.lastName}` : '',
      "O'quvchilar soni": c.students.length,
      Filial: c.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, 'Sinflar');
  }

  // ─── NEW: Subjects ────────────────────────────────────────────────────────

  private async exportSubjects(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.SubjectWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;

    const rows = await this.prisma.subject.findMany({
      where,
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } },
        branch: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data = rows.map(s => ({
      Nomi: s.name,
      Sinf: s.class?.name ?? '',
      "O'qituvchi": s.teacher ? `${s.teacher.firstName} ${s.teacher.lastName}` : '',
      "Soat/hafta": s.hoursPerWeek,
      Filial: s.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, 'Fanlar');
  }

  // ─── NEW: Rooms ───────────────────────────────────────────────────────────

  private async exportRooms(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.RoomWhereInput = { schoolId: job.schoolId, isActive: true };
    if (job.branchId) where.branchId = job.branchId;

    const rows = await this.prisma.room.findMany({
      where,
      include: {
        branch: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const data = rows.map(r => ({
      Nomi: r.name,
      "Sig'im": r.capacity,
      Qavat: r.floor ?? '',
      Turi: r.type,
      Holat: r.isActive ? 'Faol' : 'Nofaol',
      Filial: r.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, 'Xonalar');
  }

  // ─── NEW: Attendance ──────────────────────────────────────────────────────

  private async exportAttendance(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.AttendanceWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;
    const dateRange = this.buildDateFilter(filters);
    if (dateRange) where.date = dateRange;
    if (filters.status) where.status = filters.status as any;

    const rows = await this.prisma.attendance.findMany({
      where,
      include: {
        student: { select: { firstName: true, lastName: true } },
        class: { select: { name: true } },
        schedule: { select: { subject: { select: { name: true } } } },
        branch: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const data = rows.map(a => ({
      "O'quvchi": a.student ? `${a.student.firstName} ${a.student.lastName}` : '',
      Sinf: a.class?.name ?? '',
      Fan: a.schedule?.subject?.name ?? '',
      Sana: a.date.toISOString().split('T')[0],
      Status: a.status,
      Izoh: a.note ?? '',
      Filial: a.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, 'Davomat');
  }

  // ─── NEW: Teacher Attendance ──────────────────────────────────────────────

  private async exportTeacherAttendance(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.TeacherAttendanceWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;
    const dateRange = this.buildDateFilter(filters);
    if (dateRange) where.date = dateRange;
    if (filters.status) where.status = filters.status as any;

    const rows = await this.prisma.teacherAttendance.findMany({
      where,
      include: {
        teacher: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const data = rows.map(a => ({
      "O'qituvchi": a.teacher ? `${a.teacher.firstName} ${a.teacher.lastName}` : '',
      Sana: a.date.toISOString().split('T')[0],
      Status: a.status,
      Manba: a.source ?? '',
      Izoh: a.notes ?? '',
      Filial: a.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, "O'qituvchi davomati");
  }

  // ─── NEW: Substitutions ───────────────────────────────────────────────────

  private async exportSubstitutions(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.TeacherSubstitutionWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;
    const dateRange = this.buildDateFilter(filters);
    if (dateRange) where.date = dateRange;
    if (filters.status) where.status = filters.status as any;

    const rows = await this.prisma.teacherSubstitution.findMany({
      where,
      include: {
        originalTeacher: { select: { firstName: true, lastName: true } },
        substituteTeacher: { select: { firstName: true, lastName: true } },
        schedule: { select: { subject: { select: { name: true } }, class: { select: { name: true } } } },
        branch: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const data = rows.map(s => ({
      Sana: s.date.toISOString().split('T')[0],
      "Asosiy o'qituvchi": s.originalTeacher ? `${s.originalTeacher.firstName} ${s.originalTeacher.lastName}` : '',
      "Almashtiruvchi": s.substituteTeacher ? `${s.substituteTeacher.firstName} ${s.substituteTeacher.lastName}` : '',
      Sinf: s.schedule?.class?.name ?? '',
      Fan: s.schedule?.subject?.name ?? '',
      Status: s.status,
      Sabab: s.reason ?? '',
      Izoh: s.notes ?? '',
      Filial: s.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, "O'qituvchi almashtirish");
  }

  // ─── NEW: Leave Requests ──────────────────────────────────────────────────

  private async exportLeaveRequests(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const where: Prisma.LeaveRequestWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;
    const dateRange = this.buildDateFilter(filters);
    if (dateRange) {
      where.startDate = dateRange;
    }
    if (filters.status) where.status = filters.status as any;

    const rows = await this.prisma.leaveRequest.findMany({
      where,
      include: {
        requester: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
        approvals: {
          include: {
            approver: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = rows.map(lr => ({
      "So'rovchi": lr.requester ? `${lr.requester.firstName} ${lr.requester.lastName}` : '',
      Sabab: lr.reason,
      "Boshlanish": lr.startDate.toISOString().split('T')[0],
      "Tugash": lr.endDate.toISOString().split('T')[0],
      Status: lr.status,
      Turi: lr.type ?? '',
      "Jadvalga ta'sir": lr.affectsSchedule ? "Ha" : "Yo'q",
      "Ish haqiga ta'sir": lr.affectsPayroll ? "Ha" : "Yo'q",
      "Tasdiqlovchilar": lr.approvals.map(a => `${a.approver?.firstName ?? ''} ${a.approver?.lastName ?? ''}(${a.status})`).join(', '),
      Filial: lr.branch?.name ?? '',
    }));

    return this.serialize(data, job.format, "Ta'til so'rovlari");
  }

  // ─── NEW: Workload Report ─────────────────────────────────────────────────

  private async exportWorkloadReport(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const schoolId = job.schoolId;
    const branchId = job.branchId;

    const teachers = await this.prisma.user.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        role: { in: ['teacher', 'class_teacher'] },
        isActive: true,
      },
      select: { id: true, firstName: true, lastName: true, branchId: true },
    });

    const teacherIds = teachers.map(t => t.id);

    const loads = await this.prisma.teachingLoad.findMany({
      where: {
        schoolId,
        ...(branchId ? { branchId } : {}),
        teacherId: { in: teacherIds },
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    const salaries = await this.prisma.staffSalary.findMany({
      where: { userId: { in: teacherIds }, isActive: true },
      select: { userId: true, weeklyLessonHours: true },
    });
    const salaryMap = new Map(salaries.map(s => [s.userId, s.weeklyLessonHours ?? 18]));

    // Aggregate per teacher
    const teacherMap = new Map<string, {
      name: string;
      plannedHours: number;
      coefficientHours: number;
      classCount: number;
      subjectCount: number;
      splitCount: number;
      loads: any[];
    }>();

    for (const t of teachers) {
      teacherMap.set(t.id, {
        name: `${t.firstName} ${t.lastName}`,
        plannedHours: 0,
        coefficientHours: 0,
        classCount: 0,
        subjectCount: 0,
        splitCount: 0,
        loads: [],
      });
    }

    for (const load of loads) {
      const entry = teacherMap.get(load.teacherId);
      if (!entry) continue;
      entry.plannedHours += load.hoursPerWeek;
      entry.coefficientHours += load.hoursPerWeek * load.coefficient;
      entry.classCount += 1;
      entry.subjectCount = new Set([...entry.loads.map(l => l.subjectName), load.subject?.name]).size;
      if (load.isSplitClass) entry.splitCount += 1;
      entry.loads.push({
        subject: load.subject?.name ?? '',
        class: load.class?.name ?? '',
        hours: load.hoursPerWeek,
        coefficient: load.coefficient,
        branch: load.branch?.name ?? '',
      });
    }

    const data: Record<string, any>[] = [];
    for (const [teacherId, entry] of teacherMap) {
      const contractual = salaryMap.get(teacherId) ?? 18;
      const utilization = contractual > 0 ? Math.round((entry.plannedHours / contractual) * 100) : 0;
      let status = 'balanced';
      if (utilization < 80) status = 'underloaded';
      else if (utilization > 110) status = 'overloaded';

      data.push({
        "O'qituvchi": entry.name,
        "Rejalashtirilgan soat": entry.plannedHours,
        "Shartnoma soat": contractual,
        "Koeffitsientli soat": Math.round(entry.coefficientHours * 10) / 10,
        "Yuklama %": utilization,
        Status: status,
        "Sinf soni": entry.classCount,
        "Fan soni": entry.subjectCount,
        "Bo'linish sinflari": entry.splitCount,
      });
    }

    return this.serialize(data, job.format, 'Ish yuklamalari');
  }

  // ─── NEW: Timetable Analytics ─────────────────────────────────────────────

  private async exportTimetableAnalytics(user: JwtPayload, job: ExportJob, filters: ExportFilters): Promise<Buffer> {
    const schoolId = job.schoolId;
    const branchId = job.branchId;

    // Published schedules count
    const scheduleWhere: Prisma.ScheduleWhereInput = {
      schoolId,
      status: 'published',
      ...(branchId ? { branchId } : {}),
      ...(filters.weekType ? { weekType: filters.weekType as any } : {}),
    };

    const [publishedCount, draftCount, conflictCount, classCount, teacherCount, roomCount] = await Promise.all([
      this.prisma.schedule.count({ where: scheduleWhere }),
      this.prisma.schedule.count({ where: { schoolId, status: 'draft', ...(branchId ? { branchId } : {}) } }),
      this.prisma.schedule.count({ where: { schoolId, status: 'validated', ...(branchId ? { branchId } : {}) } }),
      this.prisma.class.count({ where: { schoolId, ...(branchId ? { branchId } : {}) } }),
      this.prisma.user.count({ where: { schoolId, ...(branchId ? { branchId } : {}), role: { in: ['teacher', 'class_teacher'] } } }),
      this.prisma.room.count({ where: { schoolId, ...(branchId ? { branchId } : {}), isActive: true } }),
    ]);

    // Per-day density
    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels: Record<string, string> = {
      monday: 'Dushanba', tuesday: 'Seshanba', wednesday: 'Chorshanba',
      thursday: 'Payshanba', friday: 'Juma', saturday: 'Shanba', sunday: 'Yakshanba',
    };

    const schedules = await this.prisma.schedule.findMany({
      where: scheduleWhere,
      select: { dayOfWeek: true, timeSlot: true },
    });

    const dayMap = new Map<string, { slots: Set<number>; count: number }>();
    for (const s of schedules) {
      const entry = dayMap.get(s.dayOfWeek) ?? { slots: new Set<number>(), count: 0 };
      entry.slots.add(s.timeSlot);
      entry.count += 1;
      dayMap.set(s.dayOfWeek, entry);
    }

    const data: Record<string, any>[] = [
      { "Ko'rsatkich": "Nashr etilgan slotlar", Qiymat: publishedCount },
      { "Ko'rsatkich": "Qoralama slotlar", Qiymat: draftCount },
      { "Ko'rsatkich": "Tekshiruvdagi slotlar", Qiymat: conflictCount },
      { "Ko'rsatkich": "Jami sinflar", Qiymat: classCount },
      { "Ko'rsatkich": "Jami o'qituvchilar", Qiymat: teacherCount },
      { "Ko'rsatkich": "Jami xonalar", Qiymat: roomCount },
    ];

    for (const day of dayOrder) {
      const entry = dayMap.get(day);
      if (entry) {
        data.push({
          "Ko'rsatkich": `${dayLabels[day] || day} - slotlar`,
          Qiymat: entry.count,
        });
      }
    }

    return this.serialize(data, job.format, 'Jadval analitikasi');
  }

  // ─── Serialization ────────────────────────────────────────────────────────

  private async serialize(data: Record<string, any>[], format: ExportFormat, sheetName: string): Promise<Buffer> {
    if (format === ExportFormat.json) {
      return Buffer.from(JSON.stringify(data, null, 2));
    }
    if (format === ExportFormat.csv) {
      if (data.length === 0) return Buffer.from('');
      const parser = new Parser({
        fields: Object.keys(data[0]),
        header: true,
        withBOM: true,
      });
      return Buffer.from(parser.parse(data), 'utf-8');
    }
    // xlsx
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(sheetName);
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map(k => ({ header: k, key: k, width: Math.max(12, k.length + 4) }));
      for (const row of data) ws.addRow(row);
      ws.getRow(1).font = { bold: true };
    }
    const buf = await workbook.xlsx.writeBuffer();
    return Buffer.from(buf);
  }
}
