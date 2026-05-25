/**
 * ScheduleService — Filiallararo dars jadvali boshqaruvi.
 *
 * Asosiy o'zgarishlar (Phase 4):
 *  - create()/update() → ConflictDetectorService.assertNoClash() orqali
 *    o'qituvchi (school-wide) va xona (branch-scoped) to'qnashuvini tekshiradi
 *  - schedule.branchId → yaratilganda class.branchId dan olinadi (denormalize)
 *  - schedule.startDayMinUtc / endDayMinUtc → UTC minutlar saqlanadi
 *  - getWeek() → school-wide: barcha filiallarning darslarini qaytaradi,
 *    har bir slot uchun isCrossBranch: boolean field qo'shiladi (UI uchun)
 *  - checkConflict() endpointi → ConflictDetectorService ga yo'naltiradi
 *
 * UTC vaqt strategiyasi:
 *  - startTime / endTime → mahalliy vaqt string ("HH:MM")
 *  - startDayMinUtc / endDayMinUtc → UTC minutlar (hafta boshidan)
 *  - Frontend foydalanuvchi vaqtida ko'rsatish uchun school.timezone ishlatsin
 */

import { Injectable, NotFoundException, ConflictException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { RedisService } from '@/common/redis/redis.service';
import { JwtPayload, DayOfWeek, UserRole } from '@eduplatform/types';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { PeriodsService } from '@/modules/periods/periods.service';
import {
  ConflictDetectorService,
  toWeeklyUtcMin,
} from '@/common/utils/conflict-detector';

const SCHEDULE_TTL = 5 * 60; // 5 daqiqa

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly conflictDetector: ConflictDetectorService,
    private readonly periodsService: PeriodsService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  // ── Cache helpers ─────────────────────────────────────────────────────────

  private cacheKey(schoolId: string, suffix: string) {
    return `schedule:${schoolId}:${suffix}`;
  }

  private async invalidateSchoolCache(schoolId: string) {
    const keys = await this.redis.keys(`schedule:${schoolId}:*`);
    if (keys.length > 0) await this.redis.del(...keys);
  }

  // ── Timezone helper (Redis-cached) ───────────────────────────────────────

  /**
   * Maktab timezone ini olish.
   * Redis da 1 soat cache lanadi — har bir create/update da DB ga murojaat
   * qilinishining oldini oladi (cold-path: 1 DB hit/soat; hot-path: Redis O(1)).
   */
  private async getSchoolTimezone(schoolId: string): Promise<string> {
    const cacheKey = `school:tz:${schoolId}`;
    const cached   = await this.redis.get(cacheKey);
    if (cached) return cached;

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { timezone: true },
    });
    const tz = school?.timezone ?? 'Asia/Tashkent';
    // Cache for 1 hour — timezone changes are rare admin operations
    await this.redis.set(cacheKey, tz, 'EX', 3600);
    return tz;
  }

  // ── Read methods ──────────────────────────────────────────────────────────

  async findByClass(classId: string, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const key = this.cacheKey(schoolId, `class:${classId}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const result = await this.prisma.schedule.findMany({
      where: { classId, schoolId },
      include: {
        subject: {
          include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        },
        class: { select: { id: true, name: true, branchId: true } },
        room:  { select: { id: true, name: true, capacity: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });
    await this.redis.setJson(key, result, SCHEDULE_TTL);
    return result;
  }

  async getToday(currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const today = new Date().toISOString().slice(0, 10);
    const key = this.cacheKey(schoolId, `${currentUser.branchId ?? 'all'}:today:${today}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const days: DayOfWeek[] = [
      DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
    ];
    const todayIndex = new Date().getDay();
    const dayOfWeek  = days[todayIndex === 0 ? 6 : todayIndex - 1];

    const where: any = { ...buildTenantWhere(currentUser), dayOfWeek };

    const result = await this.prisma.schedule.findMany({
      where,
      include: {
        subject: {
          include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        },
        class: { select: { id: true, name: true, gradeLevel: true, branchId: true } },
        room:  { select: { id: true, name: true } },
      },
      orderBy: [{ class: { gradeLevel: 'asc' } }, { timeSlot: 'asc' }],
    });
    await this.redis.setJson(key, result, SCHEDULE_TTL);
    return result;
  }

  /**
   * Haftalik jadval.
   * Director: barcha filiallar → isCrossBranch field qo'shiladi (timetable UI uchun).
   * Branch-scoped user: faqat o'z filiali.
   */
  async getWeek(currentUser: JwtPayload, classId?: string) {
    const schoolId   = currentUser.schoolId!;
    const userBranch = currentUser.branchId ?? null;
    const key        = this.cacheKey(schoolId, `${currentUser.branchId ?? 'all'}:week:${classId ?? 'all'}`);
    const cached     = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const where: any = { ...buildTenantWhere(currentUser) };
    if (classId) where.classId = classId;

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        subject: {
          include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        },
        class:  { select: { id: true, name: true, branchId: true } },
        branch: { select: { id: true, name: true, code: true } },
        room:   { select: { id: true, name: true, capacity: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });

    // isCrossBranch: active branch'dan boshqa filial slot'lari "greyed out" bo'ladi
    const result = schedules.map((s) => ({
      ...s,
      isCrossBranch: currentUser.branchId ? s.branchId !== currentUser.branchId : false,
    }));

    await this.redis.setJson(key, result, SCHEDULE_TTL);
    return result;
  }

  // ── Conflict check (legacy endpoint uchun) ────────────────────────────────

  async checkConflict(
    currentUser: JwtPayload,
    params: {
      dayOfWeek: string;
      timeSlot: number;
      teacherId?: string;
      roomNumber?: string;
      roomId?: string;
      classId?: string;
      excludeId?: string;
      branchId?: string;
    },
  ) {
    const schoolId = currentUser.schoolId!;
    const timezone = await this.getSchoolTimezone(schoolId);

    // Period sozlamalaridan startTime/endTime ni olish
    const effectiveBranchId = params.branchId ?? currentUser.branchId;
    if (!effectiveBranchId) {
      throw new ConflictException('Filial IDsi topilmadi — dars soatlari sozlanmagan');
    }
    const period = await this.periodsService.resolvePeriod(
      schoolId,
      effectiveBranchId,
      params.timeSlot,
    );
    if (!period) {
      throw new ConflictException(
        `${params.timeSlot}-dars soati uchun sozlangan vaqt topilmadi. ` +
        "Iltimos, avval 'Dars soatlari' bo'limida bell schedule ni sozlang."
      );
    }
    const startTime = period.startTime;
    const endTime   = period.endTime;

    const conflicts = await this.conflictDetector.checkClash({
      schoolId,
      branchId:  params.branchId ?? currentUser.branchId,
      teacherId: params.teacherId,
      roomId:    params.roomId,
      classId:   params.classId,
      dayOfWeek: params.dayOfWeek,
      startTime,
      endTime,
      timezone,
      excludeId: params.excludeId,
    });

    return { hasConflict: conflicts.length > 0, conflicts };
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateScheduleDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const timezone = await this.getSchoolTimezone(schoolId);

    // Class → branchId ni olish (denormalize uchun)
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
      select: { branchId: true },
    });
    if (!cls) throw new NotFoundException('Sinf topilmadi');
    const branchId = cls.branchId;

    // Branch Admin faqat o'z filialidagi sinf uchun jadval yaratishi mumkin
    if (currentUser.role === UserRole.BRANCH_ADMIN && branchId !== currentUser.branchId) {
      throw new ForbiddenException('Filial admin faqat o\'z filialidagi sinf uchun jadval yaratishi mumkin');
    }

    // Xona tekshiruvi — xona shu filialga tegishli bo'lishi kerak
    if (dto.roomId) {
      const room = await this.prisma.room.findFirst({
        where: { id: dto.roomId, schoolId, branchId },
      });
      if (!room) {
        throw new NotFoundException('Xona topilmadi yoki bu filialga tegishli emas');
      }
    }

    // Teacher ↔ Subject bog'liqligini tekshirish
    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, schoolId },
      select: { teacherId: true, name: true },
    });
    if (!subject) throw new NotFoundException('Fan topilmadi');
    if (subject.teacherId !== dto.teacherId) {
      throw new ConflictException(
        `Tanlangan o'qituvchi "${subject.name}" faniga biriktirilmagan.`,
      );
    }

    // UTC minutlar hisoblash
    const startDayMinUtc = toWeeklyUtcMin(dto.dayOfWeek, dto.startTime, timezone);
    const endDayMinUtc   = toWeeklyUtcMin(dto.dayOfWeek, dto.endTime, timezone);

    // Global conflict detection
    await this.conflictDetector.assertNoClash({
      schoolId,
      branchId,
      teacherId: dto.teacherId,
      roomId:    dto.roomId,
      classId:   dto.classId,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime:   dto.endTime,
      timezone,
    });

    const result = await this.prisma.schedule.create({
      data: {
        schoolId,
        branchId,
        classId:         dto.classId,
        subjectId:       dto.subjectId,
        teacherId:       dto.teacherId,
        roomNumber:      dto.roomNumber,
        roomId:          dto.roomId,
        dayOfWeek:       dto.dayOfWeek as any,
        timeSlot:        dto.timeSlot,
        startTime:       dto.startTime,
        endTime:         dto.endTime,
        startDayMinUtc,
        endDayMinUtc,
      },
      include: {
        subject: true,
        class:   { select: { id: true, name: true, branchId: true } },
        room:    { select: { id: true, name: true } },
      },
    });

    await this.invalidateSchoolCache(schoolId);
    this.eventsGateway?.emitToSchool(schoolId, 'schedule:updated', {
      action: 'create', scheduleId: result.id,
    });
    return result;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: Partial<CreateScheduleDto>, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const slot = await this.prisma.schedule.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: { class: { select: { branchId: true } } },
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi');

    const timezone = await this.getSchoolTimezone(schoolId);

    // Xona tekshiruvi — yangi xona shu filialga tegishli bo'lishi kerak
    if (dto.roomId) {
      const room = await this.prisma.room.findFirst({
        where: { id: dto.roomId, schoolId, branchId: (slot as any).class?.branchId ?? slot.branchId },
      });
      if (!room) {
        throw new NotFoundException('Xona topilmadi yoki bu filialga tegishli emas');
      }
    }

    // Teacher ↔ Subject bog'liqligini tekshirish (agar o'zgartirilsa)
    const effectiveSubjectId  = dto.subjectId  ?? slot.subjectId;
    const effectiveTeacherId  = dto.teacherId  ?? slot.teacherId;
    if (dto.subjectId || dto.teacherId) {
      const subject = await this.prisma.subject.findFirst({
        where: { id: effectiveSubjectId, schoolId },
        select: { teacherId: true, name: true },
      });
      if (!subject) throw new NotFoundException('Fan topilmadi');
      if (subject.teacherId !== effectiveTeacherId) {
        throw new ConflictException(
          `Tanlangan o'qituvchi "${subject.name}" faniga biriktirilmagan.`,
        );
      }
    }

    // Yangilangan vaqtlar
    const newStart = dto.startTime ?? slot.startTime;
    const newEnd   = dto.endTime   ?? slot.endTime;
    const newDay   = dto.dayOfWeek ?? slot.dayOfWeek;

    const startDayMinUtc = toWeeklyUtcMin(newDay, newStart, timezone);
    const endDayMinUtc   = toWeeklyUtcMin(newDay, newEnd, timezone);

    // Conflict detection (o'zini istisno qilib)
    await this.conflictDetector.assertNoClash({
      schoolId,
      branchId:  (slot as any).class?.branchId ?? undefined,
      teacherId: dto.teacherId ?? slot.teacherId,
      roomId:    dto.roomId ?? slot.roomId ?? undefined,
      classId:   dto.classId ?? slot.classId,
      dayOfWeek: newDay,
      startTime: newStart,
      endTime:   newEnd,
      timezone,
      excludeId: id,
    });

    const result = await this.prisma.schedule.update({
      where: { id },
      data: {
        ...(dto as any),
        dayOfWeek: dto.dayOfWeek as any,
        startDayMinUtc,
        endDayMinUtc,
      },
    });

    await this.invalidateSchoolCache(schoolId);
    this.eventsGateway?.emitToSchool(schoolId, 'schedule:updated', {
      action: 'update', scheduleId: id,
    });
    return result;
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, currentUser: JwtPayload) {
    const slot = await this.prisma.schedule.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi');
    await this.prisma.schedule.delete({ where: { id } });
    await this.invalidateSchoolCache(currentUser.schoolId!);
    this.eventsGateway?.emitToSchool(currentUser.schoolId!, 'schedule:updated', {
      action: 'delete', scheduleId: id,
    });
    return { message: 'Jadval sloti o‘chirildi' };
  }

  // ── Cross-branch teacher schedule (UI uchun) ──────────────────────────────

  /**
   * O'qituvchining maktabdagi barcha filiallardagi darslarini qaytaradi.
   * Timetable UI "greyed out" uchun ishlatiladi.
   */
  async getTeacherCrossBranch(
    teacherId: string,
    currentUser: JwtPayload,
    viewerBranchId?: string | null,
  ) {
    const schedules = await this.prisma.schedule.findMany({
      where: { schoolId: currentUser.schoolId!, teacherId },
      include: {
        class:   { select: { id: true, name: true, branchId: true } },
        subject: { select: { id: true, name: true } },
        branch:  { select: { id: true, name: true, code: true } },
        room:    { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });

    return schedules.map((s) => ({
      ...s,
      isCrossBranch: viewerBranchId ? s.branchId !== viewerBranchId : false,
    }));
  }
}
