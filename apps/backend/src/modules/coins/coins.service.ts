import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload } from '@eduplatform/types';
import { EngagementConfigService } from '@/modules/engagement/engagement-config.service';
import { AuditLogService } from '@/common/audit/audit-log.service';
import { RecoveryService } from '@/modules/engagement/recovery.service';

export interface CreateShopItemDto {
  name:        string;
  description?: string;
  cost:        number;
  emoji?:      string;
  stock?:      number | null;
}

/** Legacy fallback defaults (per-school config overrides these) */
export const COIN_RULES = {
  GRADE_EXCELLENT:    10,
  ATTENDANCE_WEEKLY:  20,
  ATTENDANCE_MONTHLY: 50,
  DISCIPLINE_PRAISE:  100,
  DISCIPLINE_WARNING: -50,
} as const;

export const COIN_RULES_FALLBACK = {
  GRADE_EXCELLENT:    10,
  ATTENDANCE_WEEKLY:  20,
  ATTENDANCE_MONTHLY: 50,
  DISCIPLINE_PRAISE:  100,
  DISCIPLINE_WARNING: -50,
} as const;

@Injectable()
export class CoinsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engagementConfig: EngagementConfigService,
    private readonly auditLog: AuditLogService,
    private readonly recoveryService: RecoveryService,
  ) {}

  // ─── Internal helpers ──────────────────────────────────────────────────────

  async earnCoins(
    userId:   string,
    schoolId: string,
    amount:   number,
    reason:   string,
    metadata?: Record<string, unknown>,
    awardedBy?: string,
    comment?: string,
  ) {
    if (amount <= 0) return null;

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id: userId, schoolId },
        select: { id: true, coins: true },
      });
      if (!user) throw new NotFoundException('O‘quvchi topilmadi');

      const updated = await tx.user.update({
        where:  { id: userId },
        data:   { coins: { increment: amount } },
        select: { id: true, coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          userId,
          schoolId,
          amount,
          type:    'earn',
          reason:  reason as any,
          balance: updated.coins,
          metadata: (metadata ?? null) as any,
          awardedBy,
          comment,
        },
      });

      // Reputation improvement
      await this.recoveryService.improveReputation(userId, schoolId, 1).catch(() => {});

      return updated;
    });
  }

  async deductCoins(
    userId:   string,
    schoolId: string,
    amount:   number,
    reason:   string,
    metadata?: Record<string, unknown>,
    awardedBy?: string,
    comment?: string,
  ) {
    if (amount <= 0) return null;

    const user = await this.prisma.user.findFirst({
      where:  { id: userId, schoolId },
      select: { coins: true },
    });
    if (!user) throw new NotFoundException('O‘quvchi topilmadi');

    const deduct = Math.abs(amount);
    if (user.coins < deduct) {
      throw new BadRequestException(
        `Yetarli coin yo'q. Mavjud: ${user.coins}, kerak: ${deduct}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const owned = await tx.user.findFirst({ where: { id: userId, schoolId }, select: { id: true } });
      if (!owned) throw new NotFoundException('O‘quvchi topilmadi');

      const updated = await tx.user.update({
        where:  { id: userId },
        data:   { coins: { decrement: deduct } },
        select: { id: true, coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          userId,
          schoolId,
          amount:  -deduct,
          type:    'deduct',
          reason:  reason as any,
          balance: updated.coins,
          metadata: (metadata ?? null) as any,
          awardedBy,
          comment,
        },
      });

      // Reputation deduction
      await tx.engagementReputation.upsert({
        where: { userId },
        create: {
          userId,
          schoolId,
          score: Math.max(0, 100 - deduct),
          consecutiveGood: 0,
          lastDeductionAt: new Date(),
        },
        update: {
          score: { decrement: deduct },
          consecutiveGood: 0,
          lastDeductionAt: new Date(),
        },
      });

      return updated;
    });
  }

  // ─── Rate limit & abuse detection ──────────────────────────────────────────

  async checkTeacherRateLimit(teacherId: string, schoolId: string, studentId?: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyCount = await this.prisma.coinTransaction.count({
      where: {
        schoolId,
        awardedBy: teacherId,
        createdAt: { gte: today },
      },
    });

    if (dailyCount >= 50) {
      throw new ForbiddenException('Kunlik mukofot chegarasiga yetildi (50 ta)');
    }

    if (studentId) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyStudentCount = await this.prisma.coinTransaction.count({
        where: {
          schoolId,
          awardedBy: teacherId,
          userId: studentId,
          createdAt: { gte: weekAgo },
        },
      });
      if (weeklyStudentCount >= 20) {
        throw new ForbiddenException('Bu o‘quvchiga haftalik mukofot chegarasiga yetildi (20 ta)');
      }
    }
  }

  async detectAbuse(schoolId: string, teacherId: string): Promise<{
    flagged: boolean;
    reason?: string;
    dailyCount: number;
    avgDailyCount: number;
  }> {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const teacherDaily = await this.prisma.coinTransaction.groupBy({
      by: ['awardedBy'],
      where: { schoolId, awardedBy: { not: null }, createdAt: { gte: since } },
      _count: true,
    });

    const teacherCounts = teacherDaily.map((t) => t._count);
    const avgCount = teacherCounts.length > 0
      ? teacherCounts.reduce((a, b) => a + b, 0) / teacherCounts.length
      : 0;

    const thisTeacher = teacherDaily.find((t) => t.awardedBy === teacherId)?._count ?? 0;

    const flagged = thisTeacher > avgCount * 3 && avgCount > 0;

    return {
      flagged,
      reason: flagged ? 'O‘rtacha mukofotdan 3 baravar ko‘p' : undefined,
      dailyCount: thisTeacher,
      avgDailyCount: Math.round(avgCount * 10) / 10,
    };
  }

  // ─── Reversal ──────────────────────────────────────────────────────────────

  async reverseTransaction(
    transactionId: string,
    currentUser: JwtPayload,
    reversalReason: string,
  ) {
    const tx = await this.prisma.coinTransaction.findFirst({
      where: { id: transactionId, schoolId: currentUser.schoolId! },
    });
    if (!tx) throw new NotFoundException('Tranzaksiya topilmadi');
    if (tx.reversedBy) throw new BadRequestException('Bu tranzaksiya allaqachon bekor qilingan');

    const reverseAmount = Math.abs(tx.amount);
    const isEarn = tx.type === 'earn';

    return this.prisma.$transaction(async (prismaTx) => {
      // Original tranzaksiyani belgilash
      await prismaTx.coinTransaction.update({
        where: { id: transactionId },
        data: { reversedBy: currentUser.sub },
      });

      // Teskari tranzaksiya yaratish
      const user = await prismaTx.user.findUnique({
        where: { id: tx.userId },
        select: { coins: true },
      });
      if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

      if (isEarn) {
        // Earned coins were given → deduct them back
        if (user.coins < reverseAmount) {
          throw new BadRequestException('Bekor qilish uchun yetarli coin yo‘q');
        }
        await prismaTx.user.update({
          where: { id: tx.userId },
          data: { coins: { decrement: reverseAmount } },
        });
      } else {
        // Deducted coins were taken → give them back
        await prismaTx.user.update({
          where: { id: tx.userId },
          data: { coins: { increment: reverseAmount } },
        });
      }

      const newBalance = isEarn ? user.coins - reverseAmount : user.coins + reverseAmount;

      await prismaTx.coinTransaction.create({
        data: {
          userId: tx.userId,
          schoolId: tx.schoolId,
          amount: isEarn ? -reverseAmount : reverseAmount,
          type: isEarn ? 'deduct' : 'earn',
          reason: 'manual_deduct',
          balance: newBalance,
          awardedBy: currentUser.sub,
          comment: `Bekor qilish: ${reversalReason}`,
          reversalOfId: transactionId,
        },
      });

      // Audit log
      await this.auditLog.create({
        schoolId: currentUser.schoolId!,
        userId: currentUser.sub,
        action: 'update',
        entity: 'CoinTransaction',
        entityId: transactionId,
        newData: { reversalReason, reversedBy: currentUser.sub },
      });

      return { message: 'Tranzaksiya bekor qilindi', originalTxId: transactionId };
    });
  }

  // ─── Student endpoints ─────────────────────────────────────────────────────

  async getBalance(currentUser: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where:  { id: currentUser.sub },
      select: { coins: true },
    });
    return { coins: user?.coins ?? 0 };
  }

  async getHistory(currentUser: JwtPayload, limit = 20) {
    return this.prisma.coinTransaction.findMany({
      where:   { userId: currentUser.sub, schoolId: currentUser.schoolId! },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
  }

  // ─── Shop item CRUD ────────────────────────────────────────────────────────

  async getShopItems(schoolId: string) {
    return this.prisma.coinShopItem.findMany({
      where:   { schoolId, isActive: true },
      orderBy: { cost: 'asc' },
    });
  }

  async getAllShopItems(schoolId: string) {
    return this.prisma.coinShopItem.findMany({
      where:   { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createShopItem(dto: CreateShopItemDto, currentUser: JwtPayload) {
    if (dto.cost <= 0) throw new BadRequestException('Narx musbat bo‘lishi kerak');
    return this.prisma.coinShopItem.create({
      data: {
        schoolId:    currentUser.schoolId!,
        name:        dto.name,
        description: dto.description,
        cost:        dto.cost,
        emoji:       dto.emoji,
        stock:       dto.stock ?? null,
      },
    });
  }

  async updateShopItem(id: string, dto: Partial<CreateShopItemDto> & { isActive?: boolean }, currentUser: JwtPayload) {
    const item = await this.prisma.coinShopItem.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!item) throw new NotFoundException('Mahsulot topilmadi');

    return this.prisma.coinShopItem.update({
      where: { id },
      data: {
        ...(dto.name        !== undefined && { name:        dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.cost        !== undefined && { cost:        dto.cost }),
        ...(dto.emoji       !== undefined && { emoji:       dto.emoji }),
        ...(dto.stock       !== undefined && { stock:       dto.stock }),
        ...(dto.isActive    !== undefined && { isActive:    dto.isActive }),
      },
    });
  }

  async deleteShopItem(id: string, currentUser: JwtPayload) {
    const item = await this.prisma.coinShopItem.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!item) throw new NotFoundException('Mahsulot topilmadi');
    await this.prisma.coinShopItem.delete({ where: { id } });
    return { message: 'Mahsulot o‘chirildi' };
  }

  // ─── Purchase ──────────────────────────────────────────────────────────────

  async spendCoins(itemId: string, currentUser: JwtPayload) {
    const item = await this.prisma.coinShopItem.findFirst({
      where: { id: itemId, schoolId: currentUser.schoolId!, isActive: true },
    });
    if (!item) throw new NotFoundException(`Mahsulot topilmadi`);
    if (item.stock !== null && item.stock <= 0) {
      throw new BadRequestException('Mahsulot tugagan');
    }

    await this.prisma.$transaction(async (tx) => {
      if (item.stock !== null) {
        await tx.coinShopItem.update({
          where: { id: itemId },
          data:  { stock: { decrement: 1 } },
        });
      }
      const user = await tx.user.findUnique({ where: { id: currentUser.sub }, select: { coins: true } });
      if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
      if (user.coins < item.cost) {
        throw new BadRequestException(
          `Yetarli coin yo'q. Mavjud: ${user.coins}, kerak: ${item.cost}`,
        );
      }
      const updated = await tx.user.update({
        where:  { id: currentUser.sub },
        data:   { coins: { decrement: item.cost } },
        select: { id: true, coins: true },
      });
      await tx.coinTransaction.create({
        data: {
          userId:   currentUser.sub,
          schoolId: currentUser.schoolId!,
          amount:   -item.cost,
          type:     'deduct',
          reason:   'shop_purchase',
          balance:  updated.coins,
          metadata: { itemId: item.id, itemName: item.name } as any,
        },
      });
    });

    return {
      message: `"${item.name}" muvaffaqiyatli sotib olindi`,
      cost:    item.cost,
      item,
    };
  }

  // ─── Admin/Teacher: manual award ───────────────────────────────────────────

  async awardManual(
    studentId: string,
    amount: number,
    currentUser: JwtPayload,
    comment?: string,
  ) {
    const student = await this.prisma.user.findFirst({
      where:  { id: studentId, schoolId: currentUser.schoolId! },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    if (!student) throw new NotFoundException('O‘quvchi topilmadi');
    if (student.role !== 'student') {
      throw new BadRequestException(
        `${student.firstName} ${student.lastName} o'quvchi emas`,
      );
    }

    // Rate limit tekshirish
    await this.checkTeacherRateLimit(currentUser.sub, currentUser.schoolId!, studentId);

    if (amount > 0) {
      await this.earnCoins(studentId, currentUser.schoolId!, amount, 'manual_award', {
        awardedBy: currentUser.sub,
      }, currentUser.sub, comment);
    } else {
      await this.deductCoins(studentId, currentUser.schoolId!, Math.abs(amount), 'manual_deduct', {
        deductedBy: currentUser.sub,
      }, currentUser.sub, comment);
    }

    // Audit log
    await this.auditLog.create({
      schoolId: currentUser.schoolId!,
      userId: currentUser.sub,
      action: 'update',
      entity: 'CoinTransaction',
      newData: { studentId, amount, comment, type: amount > 0 ? 'award' : 'deduct' },
    });

    return { studentId, amount, comment };
  }

  // ─── Admin: all students coin balances ─────────────────────────────────────

  async getStudentBalances(currentUser: JwtPayload) {
    return this.prisma.user.findMany({
      where:   { schoolId: currentUser.schoolId!, role: 'student' as any, isActive: true },
      select:  { id: true, firstName: true, lastName: true, coins: true },
      orderBy: { coins: 'desc' },
    });
  }

  // ─── Admin: shop purchase history ─────────────────────────────────────────

  async getShopOrders(currentUser: JwtPayload) {
    return this.prisma.coinTransaction.findMany({
      where:   { schoolId: currentUser.schoolId!, reason: 'shop_purchase' },
      orderBy: { createdAt: 'desc' },
      take:    100,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Admin: audit trail ───────────────────────────────────────────────────

  async getAuditTrail(currentUser: JwtPayload, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.coinTransaction.findMany({
      where: {
        schoolId: currentUser.schoolId!,
        awardedBy: { not: null },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Admin: abuse report ──────────────────────────────────────────────────

  async getAbuseReport(currentUser: JwtPayload) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const teacherStats = await this.prisma.coinTransaction.groupBy({
      by: ['awardedBy'],
      where: {
        schoolId: currentUser.schoolId!,
        awardedBy: { not: null },
        createdAt: { gte: since },
      },
      _count: true,
      _sum: { amount: true },
    });

    const avgCount = teacherStats.length > 0
      ? teacherStats.reduce((sum, t) => sum + t._count, 0) / teacherStats.length
      : 0;

    const flagged = teacherStats
      .filter((t) => t._count > avgCount * 3 && avgCount > 0)
      .map((t) => ({
        teacherId: t.awardedBy,
        actionCount: t._count,
        totalCoins: t._sum.amount ?? 0,
        flagReason: 'O‘rtacha mukofotdan 3 baravar ko‘p',
      }));

    return { averageDailyActions: Math.round(avgCount), flaggedTeachers: flagged };
  }

  // ─── Cron: weekly GPA decline alert → notify parents ──────────────────────

  @Cron('0 18 * * 5')
  async weeklyGpaDeclineAlert() {
    const now        = new Date();
    const day        = now.getDay();
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    thisMonday.setHours(0, 0, 0, 0);
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const avgPct = (grades: { score: number; maxScore: number }[]) =>
      grades.reduce((s, g) => s + (g.maxScore > 0 ? g.score / g.maxScore * 100 : 0), 0) / grades.length;

    const schools = await this.prisma.school.findMany({
      where:  { isActive: true },
      select: { id: true },
    });

    for (const school of schools) {
      const branch = await this.prisma.branch.findFirst({
        where: { schoolId: school.id, isActive: true },
        select: { id: true },
      });
      if (!branch) continue;

      const students = await this.prisma.user.findMany({
        where:  { schoolId: school.id, role: 'student' as any, isActive: true },
        select: { id: true, firstName: true, lastName: true },
      });

      for (const student of students) {
        const [thisWeek, lastWeek] = await Promise.all([
          this.prisma.grade.findMany({
            where:  { studentId: student.id, schoolId: school.id, date: { gte: thisMonday } },
            select: { score: true, maxScore: true },
          }),
          this.prisma.grade.findMany({
            where:  { studentId: student.id, schoolId: school.id, date: { gte: lastMonday, lt: thisMonday } },
            select: { score: true, maxScore: true },
          }),
        ]);

        if (!thisWeek.length || !lastWeek.length) continue;

        const thisAvg = avgPct(thisWeek);
        const lastAvg = avgPct(lastWeek);

        if (thisAvg < lastAvg - 10) {
          const parents = await this.prisma.parentStudent.findMany({
            where:  { studentId: student.id },
            select: { parentId: true },
          });
          if (!parents.length) continue;

          await this.prisma.notification.createMany({
            data: parents.map(p => ({
              schoolId:    school.id,
              branchId:    branch.id,
              recipientId: p.parentId,
              title:       "Farzandingizning natijalari pasaymoqda",
              body:        `${student.firstName} ${student.lastName}ning bu haftadagi o'rtacha ko'rsatkichi ${thisAvg.toFixed(0)}% (o'tgan hafta: ${lastAvg.toFixed(0)}%). E'tibor qarating!`,
            })),
          }).catch(() => {});
        }
      }
    }
  }

  // ─── Cron: weekly attendance bonus ────────────────────────────────────────

  @Cron(CronExpression.EVERY_WEEK)
  async weeklyAttendanceBonus() {
    const now    = new Date();
    const day    = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    monday.setHours(0, 0, 0, 0);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    const schools = await this.prisma.school.findMany({
      where:  { isActive: true },
      select: { id: true },
    });

    for (const school of schools) {
      // Per-school config o'qish
      const config = await this.engagementConfig.getAll(school.id).catch(() => null);
      if (config && !config.engagement_enabled) continue;

      const rules = config?.coin_rules_positive ?? COIN_RULES_FALLBACK;
      const weeklyBonus = (rules as any).attendance_weekly ?? COIN_RULES_FALLBACK.ATTENDANCE_WEEKLY;

      const students = await this.prisma.user.findMany({
        where:  { schoolId: school.id, role: 'student' as any, isActive: true },
        select: { id: true },
      });

      for (const student of students) {
        const records = await this.prisma.attendance.findMany({
          where:  { studentId: student.id, schoolId: school.id, date: { gte: monday, lte: friday } },
          select: { status: true },
        });

        if (records.length === 0) continue;

        const allPresent = records.every((r) => r.status === 'present');
        if (allPresent) {
          await this.earnCoins(
            student.id,
            school.id,
            weeklyBonus,
            'attendance_weekly',
            { weekStart: monday.toISOString().slice(0, 10) },
          ).catch(() => {});
        }
      }
    }
  }
}
