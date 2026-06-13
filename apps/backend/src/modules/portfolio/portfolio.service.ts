import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { CoinsService } from '@/modules/coins/coins.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { assertParentOfChild } from '@/common/utils/parent-guard.util';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';

const CREATOR_SELECT = {
  verifiedBy: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  subject: { select: { id: true, name: true } },
};

// Daraja bo'yicha o'qituvchiga beriladigan KPI ball og'irligi
const LEVEL_POINTS: Record<string, number> = {
  school: 1,
  district: 3,
  region: 5,
  republic: 10,
  international: 20,
};

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly coins: CoinsService,
  ) {}

  /** Verify the student exists and is inside the actor's tenant/branch scope. */
  private async assertStudentInScope(studentId: string, actor: JwtPayload) {
    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        role: UserRole.STUDENT as any,
        ...(actor.isSuperAdmin ? {} : buildTenantWhere(actor)),
      },
      select: { id: true, branchId: true },
    });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");
    if (actor.role === UserRole.BRANCH_ADMIN && student.branchId !== actor.branchId) {
      throw new ForbiddenException("Filial admin faqat o'z filialidagi o'quvchilar bilan ishlay oladi");
    }
    return student;
  }

  async create(dto: CreatePortfolioDto, actor: JwtPayload) {
    const student = await this.assertStudentInScope(dto.studentId, actor);

    const created = await this.prisma.studentAchievement.create({
      data: {
        schoolId: actor.schoolId!,
        branchId: student.branchId ?? actor.branchId ?? null,
        studentId: dto.studentId,
        subjectId: dto.subjectId ?? null,
        category: dto.category as any,
        title: dto.title,
        level: (dto.level as any) ?? null,
        result: dto.result ?? null,
        issuer: dto.issuer ?? null,
        achievedAt: new Date(dto.achievedAt),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        fileUrl: dto.fileUrl ?? null,
        description: dto.description ?? null,
        coinReward: dto.coinReward ?? 0,
        createdById: actor.sub,
      },
      include: CREATOR_SELECT,
    });

    await this.audit.log({
      userId: actor.sub,
      schoolId: actor.schoolId ?? undefined,
      action: 'create',
      entity: 'StudentAchievement',
      entityId: created.id,
      newData: { studentId: dto.studentId, title: dto.title, category: dto.category },
    });

    return created;
  }

  /** List a student's portfolio. Staff: tenant-scoped. Student/Parent: own only. */
  async findAllForStudent(studentId: string, actor: JwtPayload) {
    await assertParentOfChild(this.prisma, actor, studentId);
    return this.prisma.studentAchievement.findMany({
      where: { studentId, ...buildTenantWhere(actor) },
      include: CREATOR_SELECT,
      orderBy: [{ achievedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, actor: JwtPayload) {
    const item = await this.prisma.studentAchievement.findFirst({
      where: { id, ...(actor.isSuperAdmin ? {} : buildTenantWhere(actor)) },
      include: CREATOR_SELECT,
    });
    if (!item) throw new NotFoundException('Yutuq topilmadi');
    await assertParentOfChild(this.prisma, actor, item.studentId);
    return item;
  }

  async update(id: string, dto: UpdatePortfolioDto, actor: JwtPayload) {
    await this.findOne(id, actor); // scope + existence

    const data: Record<string, any> = {};
    if (dto.subjectId !== undefined) data.subjectId = dto.subjectId ?? null;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.level !== undefined) data.level = dto.level ?? null;
    if (dto.result !== undefined) data.result = dto.result;
    if (dto.issuer !== undefined) data.issuer = dto.issuer;
    if (dto.achievedAt !== undefined) data.achievedAt = new Date(dto.achievedAt);
    if (dto.expiresAt !== undefined) data.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.fileUrl !== undefined) data.fileUrl = dto.fileUrl;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.coinReward !== undefined) data.coinReward = dto.coinReward;

    const updated = await this.prisma.studentAchievement.update({
      where: { id },
      data,
      include: CREATOR_SELECT,
    });

    await this.audit.log({
      userId: actor.sub,
      schoolId: actor.schoolId ?? undefined,
      action: 'update',
      entity: 'StudentAchievement',
      entityId: id,
      newData: data,
    });

    return updated;
  }

  /**
   * Verify an achievement. Awards coinReward to the student (best-effort —
   * rate-limit/abuse guards may decline, but verification still succeeds).
   * Idempotent: re-verifying an already-verified item does not re-award.
   */
  async verify(id: string, actor: JwtPayload) {
    const item = await this.findOne(id, actor);
    if (item.verified) {
      return { ...item, coinAwarded: 0, alreadyVerified: true };
    }

    const updated = await this.prisma.studentAchievement.update({
      where: { id },
      data: { verified: true, verifiedById: actor.sub, verifiedAt: new Date() },
      include: CREATOR_SELECT,
    });

    let coinAwarded = 0;
    if (item.coinReward > 0) {
      try {
        await this.coins.awardManual(
          item.studentId,
          item.coinReward,
          actor,
          `Portfolio yutug'i tasdiqlandi: ${item.title}`,
        );
        coinAwarded = item.coinReward;
      } catch {
        // Coin berilmadi (rate-limit / abuse guard), lekin tasdiq saqlanadi
        coinAwarded = 0;
      }
    }

    // Fan o'qituvchisiga KPI ball — yutuq fanga bog'langan bo'lsa
    let teacherPointsAwarded = 0;
    if (item.subjectId) {
      const subject = await this.prisma.subject.findUnique({
        where: { id: item.subjectId },
        select: { id: true, teacherId: true },
      });
      if (subject?.teacherId) {
        const points = LEVEL_POINTS[item.level ?? 'school'] ?? 1;
        // Idempotent: achievementId unique — qayta tasdiqda ikkilanmaydi
        await this.prisma.teacherKpiPoint.upsert({
          where: { achievementId: item.id },
          update: {},
          create: {
            schoolId: item.schoolId,
            branchId: item.branchId,
            teacherId: subject.teacherId,
            studentId: item.studentId,
            subjectId: subject.id,
            achievementId: item.id,
            points,
            level: item.level,
            awardedById: actor.sub,
          },
        });
        teacherPointsAwarded = points;
      }
    }

    await this.audit.log({
      userId: actor.sub,
      schoolId: actor.schoolId ?? undefined,
      action: 'update',
      entity: 'StudentAchievement',
      entityId: id,
      newData: { verified: true, coinAwarded, teacherPointsAwarded },
    });

    return { ...updated, coinAwarded, teacherPointsAwarded, alreadyVerified: false };
  }

  /**
   * O'qituvchining portfolio-KPI ballari xulosasi (o'zi yoki admin ko'rsatgan).
   * Jami, shu oydagi, daraja bo'yicha va so'nggi yozuvlar.
   */
  async getTeacherPoints(actor: JwtPayload, teacherId?: string) {
    const target = teacherId ?? actor.sub;
    const points = await this.prisma.teacherKpiPoint.findMany({
      where: { teacherId: target, schoolId: actor.schoolId ?? undefined },
      include: {
        achievement: {
          select: {
            id: true, title: true, category: true, level: true,
            student: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = points.reduce((s, p) => s + p.points, 0);
    const thisMonth = points
      .filter((p) => p.createdAt >= monthStart)
      .reduce((s, p) => s + p.points, 0);
    const byLevel = points.reduce((acc, p) => {
      const key = p.level ?? 'school';
      acc[key] = (acc[key] ?? 0) + p.points;
      return acc;
    }, {} as Record<string, number>);

    return {
      teacherId: target,
      total,
      thisMonth,
      count: points.length,
      byLevel,
      recent: points.slice(0, 10),
    };
  }

  async remove(id: string, actor: JwtPayload) {
    const item = await this.findOne(id, actor);
    await this.prisma.studentAchievement.delete({ where: { id } });
    await this.audit.log({
      userId: actor.sub,
      schoolId: actor.schoolId ?? undefined,
      action: 'delete',
      entity: 'StudentAchievement',
      entityId: id,
      oldData: { studentId: item.studentId, title: item.title },
    });
    return { id, deleted: true };
  }
}
