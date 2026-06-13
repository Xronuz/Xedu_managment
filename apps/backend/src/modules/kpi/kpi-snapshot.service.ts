import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { KpiMetric, KpiSourceType } from '@prisma/client';
import { computeProgress } from './kpi.service';

const MONTH_LABELS_UZ = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

/**
 * Tizim metrikalari uchun snapshot xizmati.
 * Davr yopilganda (oylik cron) yoki qo'lda trigger qilinganda SYSTEM
 * metrikalarning qiymatini operatsion jadvallardan hisoblab,
 * KpiRecord sifatida muzlatadi (isAuto = true).
 */
@Injectable()
export class KpiSnapshotService {
  private readonly logger = new Logger(KpiSnapshotService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /** Har oyning 1-kuni 01:00 (Toshkent) — o'tgan oy uchun snapshot + eslatmalar */
  @Cron('0 1 1 * *', { name: 'kpi-monthly-snapshot', timeZone: 'Asia/Tashkent' })
  async monthlySnapshot() {
    const { start, end } = this.previousMonthRange();
    this.logger.log(`KPI oylik snapshot boshlandi: ${start.toISOString().slice(0, 10)} — ${end.toISOString().slice(0, 10)}`);
    const result = await this.snapshotPeriod(start, end);
    this.logger.log(`KPI snapshot tugadi: ${result.written} yozildi, ${result.skipped} o'tkazib yuborildi`);
    const reminded = await this.remindManualMetricOwners(start);
    if (reminded) this.logger.log(`KPI eslatmalar: ${reminded} ta mas'ulga yuborildi`);
    const alerted = await this.notifyRedZones(start);
    if (alerted) this.logger.log(`KPI qizil zona ogohlantirishlari: ${alerted} ta yuborildi`);
  }

  /**
   * Yopilgan davr snapshot'ida qizil zonaga tushgan metrikalar bo'yicha
   * maktab rahbariyatiga (direktor + zavuch) bitta jamlama in-app
   * ogohlantirish yuboradi.
   */
  async notifyRedZones(periodStart: Date): Promise<number> {
    if (!this.notifications) return 0;

    const records = await this.prisma.kpiRecord.findMany({
      where: { periodStart, isAuto: true, metric: { isActive: true } },
      include: { metric: true },
    });

    // Maktab bo'yicha qizil zonadagi metrikalar
    const redBySchool = new Map<string, { name: string; value: number; target: number; unit: string }[]>();
    for (const r of records) {
      const { status } = computeProgress(r.actualValue, r.metric.targetValue, r.metric.direction);
      if (status !== 'bad') continue;
      const list = redBySchool.get(r.metric.schoolId) ?? [];
      list.push({ name: r.metric.name, value: r.actualValue, target: r.metric.targetValue, unit: r.metric.unit });
      redBySchool.set(r.metric.schoolId, list);
    }

    const monthLabel = `${MONTH_LABELS_UZ[periodStart.getUTCMonth()]} ${periodStart.getUTCFullYear()}`;
    let sent = 0;

    for (const [schoolId, reds] of redBySchool) {
      const recipients = await this.prisma.user.findMany({
        where: { schoolId, role: { in: ['director', 'vice_principal'] }, isActive: true },
        select: { id: true, branchId: true },
      });
      // Notification.branchId majburiy — rahbarda filial bo'lmasa maktabning
      // birinchi aktiv filialiga bog'laymiz
      const fallbackBranch = await this.prisma.branch.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true },
      });

      const list = reds.slice(0, 5).map(r => `• ${r.name}: ${r.value} (maqsad: ${r.target}${r.unit})`).join('\n');
      const more = reds.length > 5 ? `\n…va yana ${reds.length - 5} ta` : '';

      for (const u of recipients) {
        const branchId = u.branchId ?? fallbackBranch?.id;
        if (!branchId) continue;
        try {
          await this.notifications.createInApp({
            schoolId,
            branchId,
            recipientId: u.id,
            title: `KPI qizil zonada — ${monthLabel}`,
            body: `${reds.length} ta ko'rsatkich maqsaddan sezilarli orqada:\n${list}${more}`,
            type: 'in_app',
            category: 'alert',
            priority: 'high',
            metadata: { periodStart: periodStart.toISOString(), metricCount: reds.length },
          });
          sent++;
        } catch (e) {
          this.logger.error(`KPI qizil zona xabari xatosi (user=${u.id}): ${e instanceof Error ? e.message : e}`);
        }
      }
    }
    return sent;
  }

  /**
   * Yopilgan oy uchun qiymati hali kiritilmagan MANUAL (oylik) metrikalar
   * egalariga in-app eslatma yuboradi.
   */
  async remindManualMetricOwners(periodStart: Date): Promise<number> {
    if (!this.notifications) return 0;

    const pending = await this.prisma.kpiMetric.findMany({
      where: {
        isActive: true,
        sourceType: KpiSourceType.MANUAL,
        period: 'MONTHLY',
        ownerId: { not: null },
        records: { none: { periodStart } },
      },
      include: {
        owner: { select: { id: true, branchId: true } },
      },
    });

    const monthLabel = `${MONTH_LABELS_UZ[periodStart.getUTCMonth()]} ${periodStart.getUTCFullYear()}`;
    let sent = 0;

    for (const metric of pending) {
      const branchId = metric.branchId ?? metric.owner?.branchId;
      if (!metric.owner || !branchId) continue; // Notification.branchId majburiy
      try {
        await this.notifications.createInApp({
          schoolId: metric.schoolId,
          branchId,
          recipientId: metric.owner.id,
          title: 'KPI qiymatini kiriting',
          body: `"${metric.name}" metrikasi uchun ${monthLabel} qiymati hali kiritilmagan.`,
          type: 'in_app',
          category: 'reminder',
          metadata: { metricId: metric.id, periodStart: periodStart.toISOString() },
        });
        sent++;
      } catch (e) {
        this.logger.error(`KPI eslatma xatosi (metric=${metric.id}): ${e instanceof Error ? e.message : e}`);
      }
    }
    return sent;
  }

  /** O'tgan kalendar oy chegaralari (UTC) */
  previousMonthRange(now = new Date()): { start: Date; end: Date } {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
    return { start, end };
  }

  /**
   * Berilgan davr uchun barcha (yoki bitta maktabning) aktiv SYSTEM
   * metrikalarini hisoblab yozadi. Mavjud davr yozuvi yangilanadi (upsert).
   */
  async snapshotPeriod(start: Date, end: Date, schoolId?: string) {
    const metrics = await this.prisma.kpiMetric.findMany({
      where: {
        isActive: true,
        sourceType: KpiSourceType.SYSTEM,
        ...(schoolId ? { schoolId } : {}),
      },
    });

    let written = 0;
    let skipped = 0;

    for (const metric of metrics) {
      try {
        const value = await this.computeValue(metric, start, end);
        if (value === null) {
          skipped++;
          continue;
        }
        await this.prisma.kpiRecord.upsert({
          where: { metricId_periodStart: { metricId: metric.id, periodStart: start } },
          update: { actualValue: value, periodEnd: end, isAuto: true },
          create: {
            metricId: metric.id,
            actualValue: value,
            periodStart: start,
            periodEnd: end,
            isAuto: true,
            notes: 'Avtomatik snapshot',
          },
        });
        written++;
      } catch (e) {
        this.logger.error(`KPI hisoblash xatosi (${metric.sourceKey}, metric=${metric.id}): ${e instanceof Error ? e.message : e}`);
        skipped++;
      }
    }

    return { written, skipped, total: metrics.length, periodStart: start, periodEnd: end };
  }

  /**
   * Maktab-darajali SYSTEM metrikalarni filiallar kesimida jonli hisoblaydi
   * (solishtiruv jadvali uchun — snapshot yozilmaydi).
   */
  async compareBranches(schoolId: string, start: Date, end: Date) {
    const [branches, metrics] = await Promise.all([
      this.prisma.branch.findMany({
        where: { schoolId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.kpiMetric.findMany({
        where: { schoolId, isActive: true, sourceType: KpiSourceType.SYSTEM, branchId: null },
        orderBy: { name: 'asc' },
      }),
    ]);

    const rows: Array<{
      metricId: string;
      key: string | null;
      name: string;
      unit: string;
      direction: string;
      targetValue: number;
      values: Record<string, number | null>;
    }> = [];
    for (const metric of metrics) {
      const values: Record<string, number | null> = {};
      for (const b of branches) {
        values[b.id] = await this.computeValue(metric, start, end, b.id);
      }
      rows.push({
        metricId: metric.id,
        key: metric.sourceKey,
        name: metric.name,
        unit: metric.unit,
        direction: metric.direction,
        targetValue: metric.targetValue,
        values,
      });
    }

    return { branches, rows, periodStart: start, periodEnd: end };
  }

  /**
   * Bitta metrika qiymatini hisoblaydi. null = davrda ma'lumot yo'q
   * (yozuv yaratilmaydi, 0% deb yolg'on ko'rsatmaslik uchun).
   * branchOverride — solishtiruv jadvalida metrikani muayyan filial
   * kesimida hisoblash uchun.
   */
  async computeValue(metric: KpiMetric, start: Date, end: Date, branchOverride?: string): Promise<number | null> {
    const branchId = branchOverride ?? metric.branchId;
    const scope = {
      schoolId: metric.schoolId,
      ...(branchId ? { branchId } : {}),
    };

    switch (metric.sourceKey) {
      case 'attendance_rate': {
        const [total, came] = await Promise.all([
          this.prisma.attendance.count({
            where: { ...scope, date: { gte: start, lte: end } },
          }),
          this.prisma.attendance.count({
            where: { ...scope, date: { gte: start, lte: end }, status: { in: ['present', 'late'] } },
          }),
        ]);
        if (total === 0) return null;
        return round2((came / total) * 100);
      }

      case 'average_grade': {
        // Vaznli o'rtacha: sum(score) / sum(maxScore) — baholar turli
        // shkalada bo'lishi mumkinligini hisobga oladi
        const agg = await this.prisma.grade.aggregate({
          where: {
            ...scope,
            date: { gte: start, lte: end },
            deletedAt: null,
            isPublished: true,
          },
          _sum: { score: true, maxScore: true },
        });
        const sumScore = agg._sum.score ?? 0;
        const sumMax = agg._sum.maxScore ?? 0;
        if (sumMax === 0) return null;
        return round2((sumScore / sumMax) * 100);
      }

      case 'payment_collection_rate': {
        // Davrda muddati kelgan to'lovlar ichida to'langanlari (summa bo'yicha)
        const due = await this.prisma.payment.aggregate({
          where: {
            ...scope,
            dueDate: { gte: start, lte: end },
            status: { notIn: ['cancelled', 'refunded'] },
          },
          _sum: { amount: true },
        });
        const paid = await this.prisma.payment.aggregate({
          where: {
            ...scope,
            dueDate: { gte: start, lte: end },
            status: 'paid',
          },
          _sum: { amount: true },
        });
        const dueSum = due._sum.amount ?? 0;
        if (dueSum === 0) return null;
        return round2(((paid._sum.amount ?? 0) / dueSum) * 100);
      }

      case 'overdue_debt': {
        // Davr oxiriga ko'ra muddati o'tgan, hali to'lanmagan summa
        const agg = await this.prisma.payment.aggregate({
          where: {
            ...scope,
            status: { in: ['pending', 'overdue'] },
            dueDate: { lte: end },
          },
          _sum: { amount: true },
        });
        return round2(agg._sum.amount ?? 0);
      }

      case 'lead_conversion_rate': {
        const [created, converted] = await Promise.all([
          this.prisma.lead.count({
            where: { ...scope, createdAt: { gte: start, lte: end } },
          }),
          this.prisma.lead.count({
            where: { ...scope, status: 'CONVERTED', updatedAt: { gte: start, lte: end } },
          }),
        ]);
        if (created === 0) return null;
        return round2((converted / created) * 100);
      }

      case 'new_leads': {
        return this.prisma.lead.count({
          where: { ...scope, createdAt: { gte: start, lte: end } },
        });
      }

      case 'achievement_points': {
        // Davrda tasdiqlangan yutuqlar uchun o'qituvchilarga berilgan ballar yig'indisi
        const agg = await this.prisma.teacherKpiPoint.aggregate({
          where: { ...scope, createdAt: { gte: start, lte: end } },
          _sum: { points: true },
        });
        return round2(agg._sum.points ?? 0);
      }

      default:
        this.logger.warn(`Noma'lum sourceKey: ${metric.sourceKey}`);
        return null;
    }
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
