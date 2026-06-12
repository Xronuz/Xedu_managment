import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { CreateKpiMetricDto, UpdateKpiMetricDto, CreateKpiRecordDto } from './dto/create-kpi.dto';
import { KpiCategory, KpiDirection, KpiSourceType } from '@prisma/client';
import { KPI_CATALOG, getCatalogItem } from './kpi-catalog';

@Injectable()
export class KpiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * KPI uchun tenant filtri: maktab-darajali metrikalar (branchId = null)
   * filial kontekstidagi foydalanuvchiga ham ko'rinadi — aks holda
   * buildTenantWhere'ning qattiq branchId filtri ularni yashirib qo'yadi.
   */
  private metricWhere(user: JwtPayload): any {
    const tenant = buildTenantWhere(user);
    if (!tenant.branchId) return tenant;
    const { branchId, ...rest } = tenant;
    return { ...rest, OR: [{ branchId: null }, { branchId }] };
  }

  /** ownerId maktab xodimiga tegishli ekanini tekshiradi */
  private async assertOwnerInSchool(ownerId: string, schoolId: string) {
    const owner = await this.prisma.user.findFirst({
      where: { id: ownerId, schoolId, isActive: true },
      select: { id: true },
    });
    if (!owner) throw new BadRequestException("Mas'ul xodim topilmadi yoki boshqa maktabga tegishli");
  }

  async findMetrics(user: JwtPayload, category?: KpiCategory) {
    const where: any = this.metricWhere(user);
    if (category) where.category = category;
    return this.prisma.kpiMetric.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { records: true } },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findMetric(id: string, user: JwtPayload) {
    const metric = await this.prisma.kpiMetric.findFirst({
      where: { id, ...this.metricWhere(user) },
      include: {
        branch: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        records: {
          orderBy: { periodStart: 'desc' },
          take: 12,
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!metric) throw new NotFoundException('KPI metrika topilmadi');
    return metric;
  }

  /** Maktab uchun katalog: shablonlar + qaysilari allaqachon ulangani */
  async getCatalog(user: JwtPayload) {
    const existing = await this.prisma.kpiMetric.findMany({
      where: { ...this.metricWhere(user), sourceType: KpiSourceType.SYSTEM },
      select: { sourceKey: true, branchId: true },
    });
    const usedKeys = new Set(existing.filter((m) => !m.branchId).map((m) => m.sourceKey));
    return KPI_CATALOG.map((item) => ({
      ...item,
      alreadyAdded: usedKeys.has(item.key),
    }));
  }

  async createMetric(dto: CreateKpiMetricDto, user: JwtPayload) {
    const schoolId = user.isSuperAdmin ? dto.schoolId! : user.schoolId!;
    if (!schoolId) throw new BadRequestException('schoolId majburiy');
    if (dto.ownerId) await this.assertOwnerInSchool(dto.ownerId, schoolId);

    // SYSTEM metrika — katalogdan; nom/birlik/kategoriya/yo'nalish shablondan olinadi
    if (dto.sourceType === KpiSourceType.SYSTEM) {
      const item = dto.sourceKey ? getCatalogItem(dto.sourceKey) : undefined;
      if (!item) throw new BadRequestException("Noto'g'ri sourceKey — katalogda bunday tizim metrikasi yo'q");

      const dup = await this.prisma.kpiMetric.findFirst({
        where: { schoolId, sourceKey: item.key, branchId: dto.branchId ?? null },
      });
      if (dup) throw new BadRequestException('Bu tizim metrikasi allaqachon qo\'shilgan');

      return this.prisma.kpiMetric.create({
        data: {
          name: dto.name || item.name,
          description: dto.description ?? item.description,
          category: item.category,
          targetValue: dto.targetValue ?? item.defaultTarget,
          unit: item.unit,
          period: dto.period ?? 'MONTHLY',
          sourceType: KpiSourceType.SYSTEM,
          sourceKey: item.key,
          direction: item.direction,
          ownerId: dto.ownerId ?? null,
          isActive: dto.isActive ?? true,
          schoolId,
          branchId: dto.branchId,
        },
      });
    }

    return this.prisma.kpiMetric.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        targetValue: dto.targetValue ?? 0,
        unit: dto.unit ?? '%',
        period: dto.period ?? 'MONTHLY',
        direction: dto.direction ?? KpiDirection.HIGHER_IS_BETTER,
        ownerId: dto.ownerId ?? null,
        isActive: dto.isActive ?? true,
        schoolId,
        branchId: dto.branchId,
      },
    });
  }

  async updateMetric(id: string, dto: UpdateKpiMetricDto, user: JwtPayload) {
    const metric = await this.prisma.kpiMetric.findFirst({
      where: { id, ...this.metricWhere(user) },
    });
    if (!metric) throw new NotFoundException('KPI metrika topilmadi');
    if (dto.ownerId) await this.assertOwnerInSchool(dto.ownerId, metric.schoolId);

    return this.prisma.kpiMetric.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category && { category: dto.category }),
        ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
        ...(dto.unit && { unit: dto.unit }),
        ...(dto.period && { period: dto.period }),
        ...(dto.direction && { direction: dto.direction }),
        ...(dto.ownerId !== undefined && { ownerId: dto.ownerId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async deleteMetric(id: string, user: JwtPayload) {
    const metric = await this.prisma.kpiMetric.findFirst({
      where: { id, ...this.metricWhere(user) },
    });
    if (!metric) throw new NotFoundException('KPI metrika topilmadi');

    await this.prisma.kpiMetric.delete({ where: { id } });
    return { message: 'KPI metrika o‘chirildi' };
  }

  async createRecord(dto: CreateKpiRecordDto, user: JwtPayload) {
    const metric = await this.prisma.kpiMetric.findFirst({
      where: { id: dto.metricId, ...this.metricWhere(user) },
    });
    if (!metric) throw new NotFoundException('KPI metrika topilmadi');
    if (metric.sourceType === KpiSourceType.SYSTEM) {
      throw new BadRequestException(
        "Bu tizim metrikasi — qiymati avtomatik hisoblanadi, qo'lda kiritib bo'lmaydi",
      );
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // Bir davrga qayta kiritish = tuzatish (upsert) — @@unique(metricId, periodStart)
    return this.prisma.kpiRecord.upsert({
      where: { metricId_periodStart: { metricId: dto.metricId, periodStart } },
      update: {
        actualValue: dto.actualValue,
        periodEnd,
        notes: dto.notes,
        createdById: user.sub,
        isAuto: false,
      },
      create: {
        metricId: dto.metricId,
        actualValue: dto.actualValue,
        periodStart,
        periodEnd,
        notes: dto.notes,
        createdById: user.sub,
      },
    });
  }

  async getDashboard(user: JwtPayload) {
    const where = this.metricWhere(user);

    const metrics = await this.prisma.kpiMetric.findMany({
      where,
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        records: {
          orderBy: { periodStart: 'desc' },
          take: 6,
        },
      },
    });

    // Oxirgi yopilgan oy boshlanishi — MANUAL metrika shu davr uchun
    // qiymatga ega bo'lmasa "kutilmoqda" deb belgilanadi
    const now = new Date();
    const closedMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const latestRecords = metrics.map(m => {
      const latest = m.records[0];
      const { progress, status } = computeProgress(
        latest?.actualValue ?? null,
        m.targetValue,
        m.direction,
      );
      const awaitingValue =
        m.sourceType === KpiSourceType.MANUAL &&
        m.period === 'MONTHLY' &&
        (!latest || latest.periodStart < closedMonthStart);
      return {
        metricId: m.id,
        name: m.name,
        category: m.category,
        targetValue: m.targetValue,
        unit: m.unit,
        direction: m.direction,
        sourceType: m.sourceType,
        sourceKey: m.sourceKey,
        owner: m.owner ? { id: m.owner.id, name: `${m.owner.firstName} ${m.owner.lastName}`.trim() } : null,
        awaitingValue,
        latestValue: latest?.actualValue ?? null,
        latestPeriod: latest?.periodStart ?? null,
        // Trend: eskidan yangiga qarab (sparkline uchun)
        trend: m.records.slice().reverse().map(r => r.actualValue),
        progress,
        status,
      };
    });

    const byCategory = {} as Record<string, typeof latestRecords>;
    latestRecords.forEach(r => {
      const key = r.category;
      if (!byCategory[key]) byCategory[key] = [];
      byCategory[key].push(r);
    });

    // Umumiy indeks — baholanadigan metrikalar progress'ining o'rtachasi
    // (har biri 100% bilan cheklanadi, "kuzatuv" metrikalari hisobga olinmaydi)
    const scored = latestRecords.filter(r => r.status !== null && r.progress !== null);
    const overallScore = scored.length
      ? Math.round(scored.reduce((s, r) => s + Math.min(r.progress!, 100), 0) / scored.length)
      : null;

    return { metrics: latestRecords, byCategory, overallScore };
  }
}

/**
 * Yo'nalishni hisobga olgan progress va holat zonasi.
 * HIGHER_IS_BETTER: actual/target; LOWER_IS_BETTER: target/actual
 * (qarzdorlik kabi metrikada qiymat target'dan past bo'lsa — yaxshi).
 */
export function computeProgress(
  actual: number | null,
  target: number,
  direction: KpiDirection,
): { progress: number | null; status: 'good' | 'warn' | 'bad' | null } {
  if (actual === null) return { progress: null, status: null };

  // HIGHER metrikada target 0 = maqsad belgilanmagan (masalan, "Yangi leadlar"
  // shunchaki kuzatiladi) — baholamaymiz, neytral ko'rsatamiz
  if (direction !== KpiDirection.LOWER_IS_BETTER && target <= 0) {
    return { progress: null, status: null };
  }

  let ratio: number;
  if (direction === KpiDirection.LOWER_IS_BETTER) {
    if (actual <= target) ratio = 1; // target ichida — to'liq yaxshi
    else ratio = target > 0 ? target / actual : 0;
  } else {
    ratio = actual / target;
  }

  const progress = Math.round(Math.min(ratio, 1.5) * 100);
  const status: 'good' | 'warn' | 'bad' = ratio >= 1 ? 'good' : ratio >= 0.85 ? 'warn' : 'bad';
  return { progress, status };
}
