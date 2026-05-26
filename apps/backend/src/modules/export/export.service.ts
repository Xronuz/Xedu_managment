import { Injectable, Logger, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { ExportJob, ExportEntity, ExportFormat, ExportJobStatus, Prisma, UserRole } from '@prisma/client';
import { JwtPayload } from '@eduplatform/types';
import * as ExcelJS from 'exceljs';
import { Parser } from 'json2csv';
import * as path from 'path';
import * as fs from 'fs';

const EXPORT_DIR = path.join(process.cwd(), 'uploads', 'exports');

/** RBAC mapping: which roles can export which entities */
const ENTITY_ROLE_ACCESS: Record<ExportEntity, string[]> = {
  [ExportEntity.schedules]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.teaching_loads]: ['director', 'vice_principal', 'branch_admin', 'teacher', 'class_teacher'],
  [ExportEntity.payroll]: ['director', 'vice_principal', 'accountant'],
  [ExportEntity.users]: ['director', 'vice_principal', 'branch_admin'],
  [ExportEntity.analytics_summary]: ['director', 'vice_principal', 'branch_admin', 'accountant'],
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
    if (!allowed.includes(user.role as UserRole)) {
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

  /** Create and immediately process an export job (sync for MVP) */
  async createAndProcess(
    user: JwtPayload,
    entity: ExportEntity,
    format: ExportFormat,
    branchId?: string,
  ): Promise<ExportJob> {
    this.assertCanExport(user, entity);
    const scopedBranchId = this.applyBranchScope(user, branchId);

    const job = await this.prisma.exportJob.create({
      data: {
        schoolId: user.schoolId!,
        branchId: scopedBranchId as string | undefined,
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
      newData: { entity, format, branchId: scopedBranchId },
    });

    // Process synchronously for MVP (queued → processing → completed/failed)
    try {
      await this.processJob(job, user);
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

  private async processJob(job: ExportJob, user: JwtPayload): Promise<void> {
    await this.prisma.exportJob.update({
      where: { id: job.id },
      data: { status: ExportJobStatus.processing, startedAt: new Date(), progress: 10 },
    });

    let buffer: Buffer;
    switch (job.entity) {
      case ExportEntity.schedules:
        buffer = await this.exportSchedules(user, job);
        break;
      case ExportEntity.teaching_loads:
        buffer = await this.exportTeachingLoads(user, job);
        break;
      case ExportEntity.payroll:
        buffer = await this.exportPayroll(user, job);
        break;
      case ExportEntity.users:
        buffer = await this.exportUsers(user, job);
        break;
      case ExportEntity.analytics_summary:
        buffer = await this.exportAnalyticsSummary(user, job);
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

  // ─── Entity Exporters ─────────────────────────────────────────────────────

  private async exportSchedules(user: JwtPayload, job: ExportJob): Promise<Buffer> {
    const where: Prisma.ScheduleWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;

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

  private async exportTeachingLoads(user: JwtPayload, job: ExportJob): Promise<Buffer> {
    const where: Prisma.TeachingLoadWhereInput = { ...buildTenantWhere(user, job.schoolId) };
    if (job.branchId) where.branchId = job.branchId;

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

  private async exportPayroll(user: JwtPayload, job: ExportJob): Promise<Buffer> {
    const where: Prisma.MonthlyPayrollWhereInput = { schoolId: job.schoolId };

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

  private async exportUsers(user: JwtPayload, job: ExportJob): Promise<Buffer> {
    const where: Prisma.UserWhereInput = { schoolId: job.schoolId };
    if (job.branchId) where.branchId = job.branchId;

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

  private async exportAnalyticsSummary(user: JwtPayload, job: ExportJob): Promise<Buffer> {
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
