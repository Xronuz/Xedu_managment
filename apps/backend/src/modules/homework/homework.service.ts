import { Injectable, Logger, NotFoundException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { CreateHomeworkDto, UpdateHomeworkDto, SubmitHomeworkDto, GradeSubmissionDto } from './dto/homework.dto';
import { AuditService } from '@/common/audit/audit.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AchievementService } from '@/modules/engagement/achievement.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { assertParentOfChild } from '@/common/utils/parent-guard.util';
import { assertTeacherOfSubject } from '@/common/utils/teacher-guard.util';

@Injectable()
export class HomeworkService {
  private readonly logger = new Logger(HomeworkService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly notificationsService: NotificationsService,
    @Optional() private readonly achievementService: AchievementService,
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
    } else if (currentUser.role === UserRole.PARENT) {
      const links = await this.prisma.parentStudent.findMany({
        where: { parentId: currentUser.sub },
        select: { studentId: true },
      });
      const studentIds = links.map(l => l.studentId);
      const enrollments = await this.prisma.classStudent.findMany({
        where: { studentId: { in: studentIds } },
        select: { classId: true },
      });
      const classIds = [...new Set(enrollments.map(e => e.classId))];
      if (classId && !classIds.includes(classId)) {
        return [];
      }
      where.classId = classId ?? { in: classIds };
    } else if (currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLASS_TEACHER) {
      // Teachers see homework for classes they teach (via Subject.teacherId)
      const taughtClasses = await this.prisma.subject.findMany({
        where: {
          schoolId: currentUser.schoolId!,
          teacherId: currentUser.sub,
          ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
        },
        select: { classId: true },
      });
      const classIds = [...new Set(taughtClasses.map(s => s.classId).filter(Boolean))];
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

    const homeworks = await this.prisma.homework.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true, teacher: { select: { id: true, firstName: true, lastName: true } } } },
        // Students need to see their own submission status per homework
        ...(currentUser.role === UserRole.STUDENT ? {
          submissions: {
            where: { studentId: currentUser.sub },
            select: { id: true, submittedAt: true, score: true },
            take: 1,
          },
        } : {}),
      },
      orderBy: { dueDate: 'asc' },
    });

    // Map submissions[0] → submission and subject.teacher → teacher for frontend
    return homeworks.map((hw: any) => ({
      ...hw,
      submission: hw.submissions?.[0] ?? null,
      submissions: undefined,
      teacher: hw.subject?.teacher ?? null,
    }));
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        submissions: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');

    // ── Submission privacy isolation ──────────────────────────────────────────
    if (currentUser.role === UserRole.STUDENT) {
      homework.submissions = homework.submissions.filter(s => s.studentId === currentUser.sub);
    } else if (currentUser.role === UserRole.PARENT) {
      const links = await this.prisma.parentStudent.findMany({
        where: { parentId: currentUser.sub },
        select: { studentId: true },
      });
      const childIds = new Set(links.map(l => l.studentId));
      homework.submissions = homework.submissions.filter(s => childIds.has(s.studentId));
    }
    // TEACHER / DIRECTOR / VP / BRANCH_ADMIN see all submissions

    return homework;
  }

  async create(dto: CreateHomeworkDto, currentUser: JwtPayload) {
    // ── Teacher scope: must be assigned to this class+subject ──────────────────
    await assertTeacherOfSubject(this.prisma, currentUser, dto.classId, dto.subjectId);

    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId: currentUser.schoolId! },
      select: { branchId: true },
    });
    if (!cls) throw new NotFoundException('Sinf topilmadi');
    const homework = await this.prisma.homework.create({
      data: {
        ...dto,
        dueDate: new Date(dto.dueDate),
        schoolId: currentUser.schoolId!,
        branchId: cls.branchId,
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
      entity: 'Homework',
      entityId: homework.id,
      newData: { title: homework.title, classId: homework.classId, subjectId: homework.subjectId, dueDate: homework.dueDate },
    });

    // ── Sinfning barcha o'quvchilariga bildirishnoma ──────────────────────────
    this.notifyHomeworkCreated(homework, currentUser).catch((err) =>
      this.logger.error(`Uy vazifasi bildirishnomasi yuborilmadi (homeworkId=${homework.id})`, err?.stack ?? err),
    );

    return homework;
  }

  private async notifyHomeworkCreated(homework: any, currentUser: JwtPayload) {
    if (!this.notificationsService) return;
    try {
      const students = await this.prisma.classStudent.findMany({
        where: { classId: homework.classId },
        select: { studentId: true },
      });
      const dueStr = new Date(homework.dueDate).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });
      await Promise.allSettled(
        students.map(s =>
          this.notificationsService!.createInApp({
            schoolId: currentUser.schoolId!,
            recipientId: s.studentId,
            title: `Yangi uy vazifasi: ${homework.subject?.name ?? ''}`,
            body: `"${homework.title}" — muddati: ${dueStr}`,
            type: 'in_app' as any,
          }),
        ),
      );
    } catch {
      // silent
    }
  }

  async update(id: string, dto: UpdateHomeworkDto, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');

    const updated = await this.prisma.homework.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
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
      entity: 'Homework',
      entityId: id,
      oldData: { title: homework.title, dueDate: homework.dueDate },
      newData: dto as any,
    });

    return updated;
  }

  async remove(id: string, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');
    await this.prisma.homework.delete({ where: { id } });

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'delete',
      entity: 'Homework',
      entityId: id,
      oldData: { title: homework.title, classId: homework.classId },
    });

    return { message: 'Uyga vazifa o‘chirildi' };
  }

  async submit(id: string, dto: SubmitHomeworkDto, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({ where: { id, ...buildTenantWhere(currentUser) } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');

    // ── Verify student is enrolled in the homework's class ────────────────────
    const enrollment = await this.prisma.classStudent.findFirst({
      where: { classId: homework.classId, studentId: currentUser.sub },
    });
    if (!enrollment) {
      throw new ForbiddenException('Siz bu sinfning o‘quvchisi emassiz');
    }

    // Upsert: update if already submitted, create otherwise
    const existing = await this.prisma.homeworkSubmission.findFirst({
      where: { homeworkId: id, studentId: currentUser.sub },
    });

    if (existing) {
      return this.prisma.homeworkSubmission.update({
        where: { id: existing.id },
        data: { ...dto, submittedAt: new Date() },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    const submission = await this.prisma.homeworkSubmission.create({
      data: {
        homeworkId: id,
        studentId: currentUser.sub,
        content: dto.content,
        fileUrl: dto.fileUrl,
        submittedAt: new Date(),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // ── Achievement progression on new homework submission ────────────────────
    if (this.achievementService && currentUser.schoolId) {
      this.achievementService.checkAndProgress(
        currentUser.sub, currentUser.schoolId, 'homework_streak',
      ).catch((err) => this.logger.error('Achievement progressi yangilanmadi (homework_streak)', err?.stack ?? err));
      this.achievementService.checkAndProgress(
        currentUser.sub, currentUser.schoolId, 'homework_count',
      ).catch((err) => this.logger.error('Achievement progressi yangilanmadi (homework_count)', err?.stack ?? err));
    }

    return submission;
  }

  async grade(homeworkId: string, submissionId: string, dto: GradeSubmissionDto, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({
      where: { id: homeworkId, ...buildTenantWhere(currentUser) },
      include: { subject: { select: { name: true } } },
    });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');

    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { id: submissionId, homeworkId },
    });
    if (!submission) throw new NotFoundException('Topshiriq topilmadi');

    // ── Atomic transaction: submission + grade bridge ─────────────────────────
    const [updated] = await this.prisma.$transaction([
      this.prisma.homeworkSubmission.update({
        where: { id: submissionId },
        data: { score: dto.score },
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ]);

    // ── Grade bridge: upsert linked Grade record (outside tx for idempotency) ─
    if (dto.score !== null && dto.score !== undefined) {
      const existingGrade = await this.prisma.grade.findFirst({
        where: { homeworkId, studentId: submission.studentId, deletedAt: null },
      });
      const gradePayload = {
        schoolId: homework.schoolId,
        branchId: homework.branchId,
        classId: homework.classId,
        studentId: submission.studentId,
        subjectId: homework.subjectId,
        type: 'homework' as any,
        score: dto.score,
        maxScore: 100,
        date: new Date(homework.dueDate),
        comment: `Homework: ${homework.title}`,
        homeworkId,
        source: 'homework',
        isPublished: true,
        createdById: currentUser.sub,
      };
      if (existingGrade) {
        await this.prisma.grade.update({
          where: { id: existingGrade.id },
          data: {
            score: dto.score,
            maxScore: 100,
            date: new Date(homework.dueDate),
            comment: `Homework: ${homework.title}`,
            createdById: currentUser.sub,
          },
        });
      } else {
        await this.prisma.grade.create({ data: gradePayload });
      }
    }

    // ── O'quvchiga baho haqida bildirishnoma ──────────────────────────────────
    if (this.notificationsService && dto.score !== null && dto.score !== undefined) {
      this.notificationsService.createInApp({
        schoolId: currentUser.schoolId!,
        recipientId: submission.studentId,
        title: `Uy vazifasi baholandi: ${homework.subject?.name ?? ''}`,
        body: `"${homework.title}" — ball: ${dto.score}`,
        type: 'in_app' as any,
      }).catch((err) => this.logger.error(`Baholash bildirishnomasi yuborilmadi (homeworkId=${homeworkId})`, err?.stack ?? err));
    }

    return updated;
  }

  async getMySubmission(homeworkId: string, currentUser: JwtPayload) {
    const homework = await this.prisma.homework.findFirst({ where: { id: homeworkId, ...buildTenantWhere(currentUser) } });
    if (!homework) throw new NotFoundException('Uyga vazifa topilmadi');

    const submission = await this.prisma.homeworkSubmission.findFirst({
      where: { homeworkId, studentId: currentUser.sub },
    });

    if (!submission) throw new NotFoundException('Topshiriq topilmadi');
    return submission;
  }

  async getByChild(childId: string, currentUser: JwtPayload) {
    await assertParentOfChild(this.prisma, currentUser, childId);

    // Find child's current classes
    const classStudents = await this.prisma.classStudent.findMany({
      where: { studentId: childId },
      select: { classId: true },
    });
    const classIds = classStudents.map(cs => cs.classId);

    const homeworks = await this.prisma.homework.findMany({
      where: {
        classId: { in: classIds },
        ...buildTenantWhere(currentUser),
      },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Fetch submissions separately
    const submissions = await this.prisma.homeworkSubmission.findMany({
      where: {
        studentId: childId,
        homeworkId: { in: homeworks.map(h => h.id) },
      },
      select: { id: true, homeworkId: true, submittedAt: true, score: true },
    });
    const submissionMap = new Map(submissions.map(s => [s.homeworkId, s]));

    return homeworks.map(hw => ({
      ...hw,
      submission: submissionMap.get(hw.id) ?? null,
    }));
  }
}
