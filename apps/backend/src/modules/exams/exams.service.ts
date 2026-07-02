import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { IsString, IsUUID, IsNumber, IsDateString, IsOptional, IsArray, Min, Max, MaxLength, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { CreateExamDto, UpdateExamDto } from './dto/create-exam.dto';
import { AuditService } from '@/common/audit/audit.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { assertTeacherOfSubject } from '@/common/utils/teacher-guard.util';

export class BulkResultItemDto {
  @IsUUID()
  studentId: string;

  @IsNumber() @Min(0)
  score: number;

  @IsOptional() @IsString() @MaxLength(500)
  comment?: string;
}

export class BulkResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkResultItemDto)
  results: BulkResultItemDto[];
}

export class BulkCreateExamDto {
  @IsString() @MaxLength(200)
  title: string;

  @IsString()
  frequency: string;

  @IsDateString()
  scheduledAt: string;

  @IsNumber() @Min(1) @Max(1000)
  maxScore: number;

  @IsOptional() @IsNumber() @Min(1)
  duration?: number;

  @IsArray() @IsUUID(undefined, { each: true })
  classIds: string[]; // bir yoki bir nechta sinf

  @IsArray() @IsUUID(undefined, { each: true })
  subjectIds: string[]; // bir yoki bir nechta fan
}

@Injectable()
export class ExamsService {
  private readonly logger = new Logger(ExamsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  async findAll(currentUser: JwtPayload, classId?: string, subjectId?: string) {
    const where: any = { ...buildTenantWhere(currentUser) };
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    // ── Role-based scope isolation ────────────────────────────────────────────
    if (currentUser.role === UserRole.STUDENT) {
      const enrollments = await this.prisma.classStudent.findMany({
        where: { studentId: currentUser.sub },
        select: { classId: true },
      });
      const classIds = enrollments.map(e => e.classId);
      if (classId && !classIds.includes(classId)) {
        return [];
      }
      where.classId = classId ?? { in: classIds };
      where.isPublished = true; // Students only see published exams
    } else if (currentUser.role === UserRole.PARENT) {
      const links = await this.prisma.parentStudent.findMany({
        where: { parentId: currentUser.sub },
        select: { studentId: true },
      });
      const childIds = links.map(l => l.studentId);
      const enrollments = await this.prisma.classStudent.findMany({
        where: { studentId: { in: childIds } },
        select: { classId: true },
      });
      const classIds = [...new Set(enrollments.map(e => e.classId))];
      if (classId && !classIds.includes(classId)) {
        return [];
      }
      where.classId = classId ?? { in: classIds };
      where.isPublished = true; // Parents only see published exams
    } else if (currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLASS_TEACHER) {
      const taught = await this.prisma.subject.findMany({
        where: {
          schoolId: currentUser.schoolId!,
          teacherId: currentUser.sub,
          ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
        },
        select: { classId: true },
      });
      const classIds = [...new Set(taught.map(s => s.classId).filter(Boolean))];
      if (classIds.length > 0) {
        if (classId) {
          if (!classIds.includes(classId)) {
            return [];
          }
        } else {
          where.classId = { in: classIds };
        }
      }
    }

    return this.prisma.exam.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');
    return exam;
  }

  async create(dto: CreateExamDto, currentUser: JwtPayload) {
    // ── Teacher scope: must be assigned to this class+subject ──────────────────
    await assertTeacherOfSubject(this.prisma, currentUser, dto.classId, dto.subjectId);

    // Derive branchId from the selected class
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: currentUser.schoolId! },
      select: { branchId: true },
    });
    const exam = await this.prisma.exam.create({
      data: {
        ...dto,
        scheduledAt: new Date(dto.scheduledAt),
        frequency: dto.frequency as any,
        schoolId: currentUser.schoolId!,
        branchId: cls!.branchId,
        isPublished: false,
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'Exam',
      entityId: exam.id,
      newData: { title: exam.title, classId: exam.classId, subjectId: exam.subjectId, scheduledAt: exam.scheduledAt },
    });

    return exam;
  }

  async update(id: string, dto: UpdateExamDto, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    const updated = await this.prisma.exam.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        frequency: dto.frequency as any,
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'Exam',
      entityId: id,
      oldData: { title: exam.title, scheduledAt: exam.scheduledAt, isPublished: exam.isPublished },
      newData: dto as any,
    });

    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');
    await this.prisma.exam.delete({ where: { id } });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'delete',
      entity: 'Exam',
      entityId: id,
      oldData: { title: exam.title, classId: exam.classId, subjectId: exam.subjectId },
    });

    return { message: 'Imtihon o‘chirildi' };
  }

  async publish(id: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    const updated = await this.prisma.exam.update({
      where: { id },
      data: { isPublished: true },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'Exam',
      entityId: id,
      oldData: { isPublished: exam.isPublished },
      newData: { isPublished: true },
    });

    return updated;
  }

  async unpublish(id: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    const updated = await this.prisma.exam.update({
      where: { id },
      data: { isPublished: false },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'Exam',
      entityId: id,
      oldData: { isPublished: exam.isPublished },
      newData: { isPublished: false },
    });

    return updated;
  }

  /**
   * Imtihon natijalari — shu imtihon sinfidagi EXAM tipidagi baholarni qaytaradi.
   * Sana oralig'i: scheduledAt ± 3 kun (bir xil kunda bir nechta imtihon bo'lishi mumkin)
   *
   * RBAC:
   * - STUDENT: faqat o'z bahosi
   * - PARENT: faqat farzandining bahosi
   * - TEACHER/CLASS_TEACHER: barcha baholar (o'z sinfi/fani uchun)
   * - DIRECTOR/VP/BRANCH_ADMIN: barcha baholar (tenant scope)
   */
  async getResults(id: string, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    const scheduledAt = exam.scheduledAt ?? new Date();
    const dateFrom = new Date(scheduledAt);
    dateFrom.setDate(dateFrom.getDate() - 3);
    const dateTo = new Date(scheduledAt);
    dateTo.setDate(dateTo.getDate() + 3);

    const gradeWhere: any = {
      schoolId: currentUser.schoolId!,
      classId: exam.classId,
      subjectId: exam.subjectId,
      type: 'exam',
      createdAt: { gte: dateFrom, lte: dateTo },
      deletedAt: null,
    };

    // ── Privacy isolation ─────────────────────────────────────────────────────
    if (currentUser.role === UserRole.STUDENT) {
      gradeWhere.studentId = currentUser.sub;
      gradeWhere.isPublished = true;
    } else if (currentUser.role === UserRole.PARENT) {
      const links = await this.prisma.parentStudent.findMany({
        where: { parentId: currentUser.sub },
        select: { studentId: true },
      });
      const childIds = links.map(l => l.studentId);
      gradeWhere.studentId = { in: childIds };
      gradeWhere.isPublished = true;
    }

    const grades = await this.prisma.grade.findMany({
      where: gradeWhere,
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { score: 'desc' },
    });

    // Statistika
    const scores = grades.map(g => g.score);
    const total = grades.length;
    const avg = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0;
    const maxScore = grades[0]?.score ?? 0;
    const minScore = scores.length ? Math.min(...scores) : 0;
    const passed = grades.filter(g => g.score >= exam.maxScore * 0.5).length;
    const failed = total - passed;

    return {
      exam,
      grades,
      stats: {
        total,
        avg,
        max: maxScore,
        min: minScore,
        passed,
        failed,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      },
    };
  }

  // Bir nechta sinf × fan kombinatsiyasi uchun toplu yaratish
  async bulkCreate(dto: BulkCreateExamDto, currentUser: JwtPayload) {
    const { classIds, subjectIds, title, frequency, scheduledAt, maxScore, duration } = dto;
    const schoolId = currentUser.schoolId!;
    const date = new Date(scheduledAt);
    const freq = frequency as any;

    // Fetch branchIds for each class
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds }, schoolId },
      select: { id: true, branchId: true },
    });
    const classBranchMap = new Map(classes.map(c => [c.id, c.branchId]));

    const data = classIds.flatMap((classId) =>
      subjectIds.map((subjectId) => ({
        schoolId,
        branchId: classBranchMap.get(classId)!,
        classId,
        subjectId,
        title,
        frequency: freq,
        maxScore,
        scheduledAt: date,
        duration,
        isPublished: false,
      })),
    );

    await this.prisma.exam.createMany({ data });

    const created = await this.prisma.exam.findMany({
      where: {
        schoolId,
        scheduledAt: date,
        title,
        classId: { in: classIds },
        subjectId: { in: subjectIds },
      },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });
    return { count: data.length, exams: created };
  }

  /**
   * Imtihon natijalarini toplu kiritish.
   * Mavjud yozuvlar scheduledAt ±3 kun oralig'ida o'chirib qayta yoziladi.
   */
  async submitBulkResults(examId: string, dto: BulkResultsDto, currentUser: JwtPayload) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, ...buildTenantWhere(currentUser) },
    });
    if (!exam) throw new NotFoundException('Imtihon topilmadi');

    const scheduledAt = exam.scheduledAt ?? new Date();
    const dateFrom = new Date(scheduledAt);
    dateFrom.setDate(dateFrom.getDate() - 3);
    const dateTo = new Date(scheduledAt);
    dateTo.setDate(dateTo.getDate() + 3);

    const studentIds = dto.results.map(r => r.studentId);

    // ── Atomic transaction: soft-delete old + create new ──────────────────────
    await this.prisma.$transaction([
      this.prisma.grade.updateMany({
        where: {
          schoolId: currentUser.schoolId!,
          classId: exam.classId,
          subjectId: exam.subjectId,
          type: 'exam',
          date: { gte: dateFrom, lte: dateTo },
          studentId: { in: studentIds },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      }),
      this.prisma.grade.createMany({
        data: dto.results.map(r => ({
          schoolId: currentUser.schoolId!,
          branchId: exam.branchId,
          classId: exam.classId,
          subjectId: exam.subjectId,
          studentId: r.studentId,
          type: 'exam' as any,
          score: r.score,
          maxScore: exam.maxScore,
          comment: r.comment,
          date: scheduledAt,
          examId,
          source: 'manual',
          isPublished: true,
          createdById: currentUser.sub,
        })),
      }),
    ]);

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'ExamResult',
      entityId: examId,
      newData: { count: dto.results.length, examId },
    });

    // H-2: Imtihon natijasi → ota-onaga bildirishnoma (batched, not N+1)
    try {
      const examInfo = await this.prisma.exam.findUnique({
        where: { id: examId },
        select: { title: true, maxScore: true },
      });
      const school = await this.prisma.school.findUnique({
        where: { id: currentUser.schoolId! },
        select: { name: true },
      });

      // Batch-fetch all parent links
      const allParentLinks = await this.prisma.parentStudent.findMany({
        where: { studentId: { in: studentIds } },
        select: { studentId: true, parentId: true },
      });
      const parentsByStudent = new Map<string, string[]>();
      for (const link of allParentLinks) {
        const arr = parentsByStudent.get(link.studentId) ?? [];
        arr.push(link.parentId);
        parentsByStudent.set(link.studentId, arr);
      }

      // Build all notifications in memory
      const notifications: any[] = [];
      for (const result of dto.results) {
        const pct = examInfo?.maxScore ? Math.round((result.score / examInfo.maxScore) * 100) : 0;
        const notifTitle = `📝 Imtihon natijasi: ${examInfo?.title ?? 'Imtihon'}`;
        const notifBody  = `${school?.name ?? 'Maktab'}: Ball — ${result.score}/${examInfo?.maxScore ?? '?'} (${pct}%)`;

        notifications.push({
          schoolId: currentUser.schoolId!,
          branchId: exam.branchId,
          recipientId: result.studentId,
          title: notifTitle,
          body: notifBody,
          type: 'in_app',
        });

        this.eventsGateway?.emitToUser(result.studentId, 'notification:new', {
          title: notifTitle,
          body: notifBody,
        });

        const parentIds = parentsByStudent.get(result.studentId) ?? [];
        for (const parentId of parentIds) {
          const parentTitle = `📝 Farzandingiz imtihon natijasi`;
          const parentBody  = `${examInfo?.title ?? 'Imtihon'}: ${result.score}/${examInfo?.maxScore ?? '?'} (${pct}%) — ${school?.name ?? ''}`;
          notifications.push({
            schoolId: currentUser.schoolId!,
            branchId: exam.branchId,
            recipientId: parentId,
            title: parentTitle,
            body: parentBody,
            type: 'in_app',
          });

          this.eventsGateway?.emitToUser(parentId, 'notification:new', {
            title: parentTitle,
            body: parentBody,
          });
        }
      }

      // Batch insert notifications (chunked to avoid param limits)
      const CHUNK = 100;
      for (let i = 0; i < notifications.length; i += CHUNK) {
        const chunk = notifications.slice(i, i + CHUNK);
        await this.prisma.notification.createMany({ data: chunk })
          .catch((err) => this.logger.error('Imtihon bildirishnomalari saqlanmadi', err?.stack ?? err));
      }
    } catch (err: any) {
      // Bildirishnoma yuborilmasa ham asosiy natija qaytariladi
      this.logger.error('Imtihon natija bildirishnomalarida xato', err?.stack ?? err);
    }

    return { saved: dto.results.length };
  }

  /** Dashboard widget: exams scheduled in the next N days */
  async getUpcoming(currentUser: JwtPayload, days = 7) {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + days);

    return this.prisma.exam.findMany({
      where: {
        ...buildTenantWhere(currentUser),
        scheduledAt: { gte: from, lte: to },
        isPublished: true,
      },
      include: {
        class:   { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 10,
    });
  }
}
