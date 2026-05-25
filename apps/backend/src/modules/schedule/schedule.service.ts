/**
 * ScheduleService — Filiallararo dars jadvali boshqaruvi.
 *
 * Phase 3: Lifecycle (draft → validated → published → archived) + 2-week rotation (all/numerator/denominator)
 */

import { Injectable, NotFoundException, ConflictException, ForbiddenException, Optional } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { RedisService } from '@/common/redis/redis.service';
import { JwtPayload, DayOfWeek, UserRole, ScheduleStatus, WeekType } from '@eduplatform/types';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { PeriodsService } from '@/modules/periods/periods.service';
import { AuditService } from '@/common/audit/audit.service';
import {
  ConflictDetectorService,
  toWeeklyUtcMin,
} from '@/common/utils/conflict-detector';

const SCHEDULE_TTL = 5 * 60;

/** ISO hafta raqami asosida weekType aniqlash */
function getCurrentWeekType(): WeekType {
  const now = new Date();
  const isoWeek = getISOWeek(now);
  return isoWeek % 2 === 1 ? WeekType.NUMERATOR : WeekType.DENOMINATOR;
}

function getISOWeek(date: Date): number {
  const tmp = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  tmp.setDate(tmp.getDate() - dayNr + 3);
  const firstThursday = tmp.valueOf();
  tmp.setMonth(0, 1);
  if (tmp.getDay() !== 4) {
    tmp.setMonth(0, 1 + ((4 - tmp.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - tmp.valueOf()) / 604800000);
}

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly conflictDetector: ConflictDetectorService,
    private readonly periodsService: PeriodsService,
    private readonly auditService: AuditService,
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

  // ── Timezone helper ───────────────────────────────────────────────────────

  private async getSchoolTimezone(schoolId: string): Promise<string> {
    const cacheKey = `school:tz:${schoolId}`;
    const cached   = await this.redis.get(cacheKey);
    if (cached) return cached;
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId }, select: { timezone: true },
    });
    const tz = school?.timezone ?? 'Asia/Tashkent';
    await this.redis.set(cacheKey, tz, 'EX', 3600);
    return tz;
  }

  // ── Status helpers ────────────────────────────────────────────────────────

  private defaultReadStatus(includeDrafts?: boolean, includeArchived?: boolean): ScheduleStatus[] {
    const statuses = [ScheduleStatus.PUBLISHED];
    if (includeDrafts) statuses.push(ScheduleStatus.DRAFT, ScheduleStatus.VALIDATED);
    if (includeArchived) statuses.push(ScheduleStatus.ARCHIVED);
    return statuses;
  }

  private canPublish(role: UserRole): boolean {
    return [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL].includes(role);
  }

  private assertCanModify(slot: any) {
    if (slot.status === ScheduleStatus.PUBLISHED) {
      throw new ConflictException('Chop etilgan jadvalni bevosita tahrirlash yoki o\'chirish mumkin emas. Avval nashrdan oling.');
    }
    if (slot.status === ScheduleStatus.ARCHIVED) {
      throw new ConflictException('Arxivlangan jadvalni tahrirlash mumkin emas.');
    }
  }

  // ── Audit helper ──────────────────────────────────────────────────────────

  private async audit(
    action: string,
    currentUser: JwtPayload,
    entityId: string,
    oldData?: Record<string, any>,
    newData?: Record<string, any>,
  ) {
    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      branchId: currentUser.branchId ?? undefined,
      action: action as any,
      entity: 'schedule',
      entityId,
      oldData,
      newData,
    });
  }

  // ── Read methods ──────────────────────────────────────────────────────────

  async findByClass(
    classId: string,
    currentUser: JwtPayload,
    options?: { weekType?: WeekType; includeDrafts?: boolean; includeArchived?: boolean },
  ) {
    const schoolId = currentUser.schoolId!;
    const status = this.defaultReadStatus(options?.includeDrafts, options?.includeArchived);
    const key = this.cacheKey(schoolId, `class:${classId}:${options?.weekType ?? 'all'}:${status.join(',')}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const where: any = { classId, schoolId, status: { in: status } };
    if (options?.weekType) {
      where.weekType = { in: [WeekType.ALL, options.weekType] };
    }

    const result = await this.prisma.schedule.findMany({
      where,
      include: {
        subject: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } },
        class: { select: { id: true, name: true, branchId: true } },
        room:  { select: { id: true, name: true, capacity: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });
    await this.redis.setJson(key, result, SCHEDULE_TTL);
    return result;
  }

  async getToday(
    currentUser: JwtPayload,
    options?: { weekType?: WeekType; includeDrafts?: boolean; includeArchived?: boolean },
  ) {
    const schoolId = currentUser.schoolId!;
    const today = new Date().toISOString().slice(0, 10);
    const effectiveWeekType = options?.weekType ?? getCurrentWeekType();
    const status = this.defaultReadStatus(options?.includeDrafts, options?.includeArchived);
    const key = this.cacheKey(schoolId, `${currentUser.branchId ?? 'all'}:today:${today}:${effectiveWeekType}:${status.join(',')}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const days: DayOfWeek[] = [
      DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY, DayOfWeek.SUNDAY,
    ];
    const todayIndex = new Date().getDay();
    const dayOfWeek  = days[todayIndex === 0 ? 6 : todayIndex - 1];

    const where: any = {
      ...buildTenantWhere(currentUser),
      dayOfWeek,
      status: { in: status },
      weekType: { in: [WeekType.ALL, effectiveWeekType] },
    };

    const result = await this.prisma.schedule.findMany({
      where,
      include: {
        subject: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } },
        class: { select: { id: true, name: true, gradeLevel: true, branchId: true } },
        room:  { select: { id: true, name: true } },
      },
      orderBy: [{ class: { gradeLevel: 'asc' } }, { timeSlot: 'asc' }],
    });
    await this.redis.setJson(key, result, SCHEDULE_TTL);
    return result;
  }

  async getWeek(
    currentUser: JwtPayload,
    classId?: string,
    options?: { weekType?: WeekType; includeDrafts?: boolean; includeArchived?: boolean },
  ) {
    const schoolId   = currentUser.schoolId!;
    const userBranch = currentUser.branchId ?? null;
    const status = this.defaultReadStatus(options?.includeDrafts, options?.includeArchived);
    const key = this.cacheKey(schoolId, `${currentUser.branchId ?? 'all'}:week:${classId ?? 'all'}:${options?.weekType ?? 'all'}:${status.join(',')}`);
    const cached = await this.redis.getJson<any[]>(key);
    if (cached) return cached;

    const where: any = { ...buildTenantWhere(currentUser), status: { in: status } };
    if (classId) where.classId = classId;
    if (options?.weekType) {
      where.weekType = { in: [WeekType.ALL, options.weekType] };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        subject: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } },
        class:   { select: { id: true, name: true, branchId: true } },
        branch:  { select: { id: true, name: true, code: true } },
        room:    { select: { id: true, name: true, capacity: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { timeSlot: 'asc' }],
    });

    const result = schedules.map((s) => ({
      ...s,
      isCrossBranch: currentUser.branchId ? s.branchId !== currentUser.branchId : false,
    }));

    await this.redis.setJson(key, result, SCHEDULE_TTL);
    return result;
  }

  // ── Conflict check ────────────────────────────────────────────────────────

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
      weekType?: WeekType;
    },
  ) {
    const schoolId = currentUser.schoolId!;
    const timezone = await this.getSchoolTimezone(schoolId);
    const effectiveBranchId = params.branchId ?? currentUser.branchId;
    if (!effectiveBranchId) {
      throw new ConflictException('Filial IDsi topilmadi');
    }
    const period = await this.periodsService.resolvePeriod(schoolId, effectiveBranchId, params.timeSlot);
    if (!period) {
      throw new ConflictException(
        `${params.timeSlot}-dars soati uchun sozlangan vaqt topilmadi.`
      );
    }

    const conflicts = await this.conflictDetector.checkClash({
      schoolId,
      branchId: effectiveBranchId,
      teacherId: params.teacherId,
      roomId:    params.roomId,
      classId:   params.classId,
      dayOfWeek: params.dayOfWeek,
      startTime: period.startTime,
      endTime:   period.endTime,
      timezone,
      excludeId: params.excludeId,
      weekType:  params.weekType,
    });

    return { hasConflict: conflicts.length > 0, conflicts };
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateScheduleDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;
    const timezone = await this.getSchoolTimezone(schoolId);

    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
      select: { branchId: true },
    });
    if (!cls) throw new NotFoundException('Sinf topilmadi');
    const branchId = cls.branchId;

    if (currentUser.role === UserRole.BRANCH_ADMIN && branchId !== currentUser.branchId) {
      throw new ForbiddenException('Filial admin faqat o\'z filialidagi sinf uchun jadval yaratishi mumkin');
    }

    if (dto.status && dto.status !== ScheduleStatus.DRAFT && !this.canPublish(currentUser.role)) {
      throw new ForbiddenException('Faqat direktor yoki o\'rinbosar boshlang\'ich statusni draftdan boshqa holatda yaratishi mumkin');
    }

    if (dto.roomId) {
      const room = await this.prisma.room.findFirst({ where: { id: dto.roomId, schoolId, branchId } });
      if (!room) throw new NotFoundException('Xona topilmadi yoki bu filialga tegishli emas');
    }

    const subject = await this.prisma.subject.findFirst({
      where: { id: dto.subjectId, schoolId },
      select: { teacherId: true, name: true },
    });
    if (!subject) throw new NotFoundException('Fan topilmadi');
    if (subject.teacherId !== dto.teacherId) {
      throw new ConflictException(`Tanlangan o'qituvchi "${subject.name}" faniga biriktirilmagan.`);
    }

    const startDayMinUtc = toWeeklyUtcMin(dto.dayOfWeek, dto.startTime, timezone);
    const endDayMinUtc   = toWeeklyUtcMin(dto.dayOfWeek, dto.endTime, timezone);

    await this.conflictDetector.assertNoClash({
      schoolId, branchId, teacherId: dto.teacherId, roomId: dto.roomId,
      classId: dto.classId, dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime, endTime: dto.endTime, timezone,
      weekType: dto.weekType ?? WeekType.ALL,
    });

    const result = await this.prisma.schedule.create({
      data: {
        schoolId, branchId,
        classId:    dto.classId,
        subjectId:  dto.subjectId,
        teacherId:  dto.teacherId,
        roomNumber: dto.roomNumber,
        roomId:     dto.roomId,
        dayOfWeek:  dto.dayOfWeek as any,
        timeSlot:   dto.timeSlot,
        startTime:  dto.startTime,
        endTime:    dto.endTime,
        startDayMinUtc, endDayMinUtc,
        status:     dto.status ?? ScheduleStatus.DRAFT,
        weekType:   dto.weekType ?? WeekType.ALL,
      },
      include: {
        subject: true,
        class:   { select: { id: true, name: true, branchId: true } },
        room:    { select: { id: true, name: true } },
      },
    });

    await this.audit('create', currentUser, result.id, undefined, { status: result.status, weekType: result.weekType });
    await this.invalidateSchoolCache(schoolId);
    this.eventsGateway?.emitToSchool(schoolId, 'schedule:updated', { action: 'create', scheduleId: result.id });
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
    this.assertCanModify(slot);

    // Status lifecycle changes must go through dedicated endpoints
    if ('status' in dto) {
      throw new ConflictException('Statusni yangilash uchun maxsus endpointlardan foydalaning (validate, publish, unpublish, archive)');
    }

    const timezone = await this.getSchoolTimezone(schoolId);

    if (dto.roomId) {
      const room = await this.prisma.room.findFirst({
        where: { id: dto.roomId, schoolId, branchId: (slot as any).class?.branchId ?? slot.branchId },
      });
      if (!room) throw new NotFoundException('Xona topilmadi yoki bu filialga tegishli emas');
    }

    const effectiveSubjectId = dto.subjectId ?? slot.subjectId;
    const effectiveTeacherId = dto.teacherId ?? slot.teacherId;
    if (dto.subjectId || dto.teacherId) {
      const subject = await this.prisma.subject.findFirst({
        where: { id: effectiveSubjectId, schoolId },
        select: { teacherId: true, name: true },
      });
      if (!subject) throw new NotFoundException('Fan topilmadi');
      if (subject.teacherId !== effectiveTeacherId) {
        throw new ConflictException(`Tanlangan o'qituvchi "${subject.name}" faniga biriktirilmagan.`);
      }
    }

    const newStart = dto.startTime ?? slot.startTime;
    const newEnd   = dto.endTime   ?? slot.endTime;
    const newDay   = dto.dayOfWeek ?? slot.dayOfWeek;

    const startDayMinUtc = toWeeklyUtcMin(newDay, newStart, timezone);
    const endDayMinUtc   = toWeeklyUtcMin(newDay, newEnd, timezone);

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
      weekType:  (dto.weekType ?? slot.weekType as WeekType),
    });

    const oldData = { status: slot.status, weekType: slot.weekType };
    const result = await this.prisma.schedule.update({
      where: { id },
      data: {
        classId:    dto.classId,
        subjectId:  dto.subjectId,
        teacherId:  dto.teacherId,
        roomNumber: dto.roomNumber,
        roomId:     dto.roomId,
        dayOfWeek:  dto.dayOfWeek as any,
        timeSlot:   dto.timeSlot,
        startTime:  dto.startTime,
        endTime:    dto.endTime,
        weekType:   dto.weekType,
        startDayMinUtc,
        endDayMinUtc,
      },
    });

    await this.audit('update', currentUser, id, oldData, { status: result.status, weekType: result.weekType });
    await this.invalidateSchoolCache(schoolId);
    this.eventsGateway?.emitToSchool(schoolId, 'schedule:updated', { action: 'update', scheduleId: id });
    return result;
  }

  // ── Remove ────────────────────────────────────────────────────────────────

  async remove(id: string, currentUser: JwtPayload) {
    const slot = await this.prisma.schedule.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi');
    this.assertCanModify(slot);

    await this.prisma.schedule.delete({ where: { id } });
    await this.audit('delete', currentUser, id, { status: slot.status, weekType: slot.weekType }, undefined);
    await this.invalidateSchoolCache(currentUser.schoolId!);
    this.eventsGateway?.emitToSchool(currentUser.schoolId!, 'schedule:updated', { action: 'delete', scheduleId: id });
    return { message: 'Jadval sloti o\'chirildi' };
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async validate(id: string, currentUser: JwtPayload) {
    const slot = await this.prisma.schedule.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi');
    if (slot.status !== ScheduleStatus.DRAFT) {
      throw new ConflictException('Faqat qoralama holatidagi jadval tasdiqlanishi mumkin');
    }

    // Run conflict detection against published+validated slots
    const timezone = await this.getSchoolTimezone(currentUser.schoolId!);
    const conflicts = await this.conflictDetector.checkClash({
      schoolId: currentUser.schoolId!,
      branchId: slot.branchId,
      teacherId: slot.teacherId,
      roomId: slot.roomId ?? undefined,
      classId: slot.classId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timezone,
      excludeId: id,
      weekType: slot.weekType as WeekType,
      status: [ScheduleStatus.PUBLISHED, ScheduleStatus.VALIDATED],
    });
    if (conflicts.length > 0) {
      throw new ConflictException(`Tasdiqlashdan oldin ziddiyatlar hal etilishi kerak: ${conflicts.map(c => c.message).join('; ')}`);
    }

    const result = await this.prisma.schedule.update({
      where: { id },
      data: { status: ScheduleStatus.VALIDATED },
    });

    await this.audit('update', currentUser, id, { status: ScheduleStatus.DRAFT }, { status: ScheduleStatus.VALIDATED });
    await this.invalidateSchoolCache(currentUser.schoolId!);
    return result;
  }

  async publish(id: string, currentUser: JwtPayload) {
    if (!this.canPublish(currentUser.role)) {
      throw new ForbiddenException('Faqat direktor yoki o\'rinbosar jadvalni nashr qilishi mumkin');
    }

    const slot = await this.prisma.schedule.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi');
    if (slot.status === ScheduleStatus.PUBLISHED) {
      throw new ConflictException('Jadval allaqachon chop etilgan');
    }
    if (slot.status === ScheduleStatus.ARCHIVED) {
      throw new ConflictException('Arxivlangan jadvalni nashr qilish mumkin emas');
    }

    // Conflict check against existing published slots
    const timezone = await this.getSchoolTimezone(currentUser.schoolId!);
    const conflicts = await this.conflictDetector.checkClash({
      schoolId: currentUser.schoolId!,
      branchId: slot.branchId,
      teacherId: slot.teacherId,
      roomId: slot.roomId ?? undefined,
      classId: slot.classId,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timezone,
      excludeId: id,
      weekType: slot.weekType as WeekType,
      status: [ScheduleStatus.PUBLISHED],
    });
    if (conflicts.length > 0) {
      throw new ConflictException(`Nashr qilishdan oldin ziddiyatlar hal etilishi kerak: ${conflicts.map(c => c.message).join('; ')}`);
    }

    const result = await this.prisma.schedule.update({
      where: { id },
      data: {
        status: ScheduleStatus.PUBLISHED,
        publishedAt: new Date(),
        publishedBy: currentUser.sub,
      },
    });

    await this.audit('update', currentUser, id, { status: slot.status }, { status: ScheduleStatus.PUBLISHED });
    await this.invalidateSchoolCache(currentUser.schoolId!);
    return result;
  }

  async unpublish(id: string, currentUser: JwtPayload) {
    if (!this.canPublish(currentUser.role)) {
      throw new ForbiddenException('Faqat direktor yoki o\'rinbosar jadvalni nashrdan olishi mumkin');
    }

    const slot = await this.prisma.schedule.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi');
    if (slot.status !== ScheduleStatus.PUBLISHED) {
      throw new ConflictException('Faqat chop etilgan jadval nashrdan olinishi mumkin');
    }

    const result = await this.prisma.schedule.update({
      where: { id },
      data: { status: ScheduleStatus.DRAFT, publishedAt: null, publishedBy: null },
    });

    await this.audit('update', currentUser, id, { status: ScheduleStatus.PUBLISHED }, { status: ScheduleStatus.DRAFT });
    await this.invalidateSchoolCache(currentUser.schoolId!);
    return result;
  }

  async archive(id: string, currentUser: JwtPayload) {
    if (!this.canPublish(currentUser.role)) {
      throw new ForbiddenException('Faqat direktor yoki o\'rinbosar jadvalni arxivlashi mumkin');
    }

    const slot = await this.prisma.schedule.findFirst({
      where: { id, schoolId: currentUser.schoolId! },
    });
    if (!slot) throw new NotFoundException('Jadval sloti topilmadi');
    if (slot.status === ScheduleStatus.ARCHIVED) {
      throw new ConflictException('Jadval allaqachon arxivlangan');
    }

    const result = await this.prisma.schedule.update({
      where: { id },
      data: { status: ScheduleStatus.ARCHIVED, publishedAt: null, publishedBy: null },
    });

    await this.audit('update', currentUser, id, { status: slot.status }, { status: ScheduleStatus.ARCHIVED });
    await this.invalidateSchoolCache(currentUser.schoolId!);
    return result;
  }

  async bulkPublish(ids: string[], currentUser: JwtPayload) {
    if (!this.canPublish(currentUser.role)) {
      throw new ForbiddenException('Faqat direktor yoki o\'rinbosar jadval nashr qilishi mumkin');
    }

    const schoolId = currentUser.schoolId!;
    const slots = await this.prisma.schedule.findMany({
      where: { id: { in: ids }, schoolId, status: { in: [ScheduleStatus.DRAFT, ScheduleStatus.VALIDATED] } },
    });
    if (slots.length === 0) throw new NotFoundException('Nashr qilinadigan jadval slotlari topilmadi');

    const timezone = await this.getSchoolTimezone(schoolId);

    // Validate each slot against published slots
    for (const slot of slots) {
      const conflicts = await this.conflictDetector.checkClash({
        schoolId,
        branchId: slot.branchId,
        teacherId: slot.teacherId,
        roomId: slot.roomId ?? undefined,
        classId: slot.classId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone,
        excludeId: slot.id,
        weekType: slot.weekType as WeekType,
        status: [ScheduleStatus.PUBLISHED],
      });
      if (conflicts.length > 0) {
        throw new ConflictException(`Slot ${slot.id}: ${conflicts.map(c => c.message).join('; ')}`);
      }
    }

    const result = await this.prisma.schedule.updateMany({
      where: { id: { in: ids }, schoolId },
      data: { status: ScheduleStatus.PUBLISHED, publishedAt: new Date(), publishedBy: currentUser.sub },
    });

    for (const slot of slots) {
      await this.audit('update', currentUser, slot.id, { status: slot.status }, { status: ScheduleStatus.PUBLISHED });
    }
    await this.invalidateSchoolCache(schoolId);
    return { published: result.count };
  }

  // ── Cross-branch teacher schedule ─────────────────────────────────────────

  async getTeacherCrossBranch(
    teacherId: string,
    currentUser: JwtPayload,
    viewerBranchId?: string | null,
    options?: { weekType?: WeekType; includeArchived?: boolean },
  ) {
    const status = this.defaultReadStatus(false, options?.includeArchived);
    const where: any = { schoolId: currentUser.schoolId!, teacherId, status: { in: status } };
    if (options?.weekType) {
      where.weekType = { in: [WeekType.ALL, options.weekType] };
    }

    const schedules = await this.prisma.schedule.findMany({
      where,
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

  // ── Week type utility ─────────────────────────────────────────────────────

  getCurrentWeekType(): { weekType: WeekType; isoWeekNumber: number } {
    const isoWeek = getISOWeek(new Date());
    return {
      weekType: isoWeek % 2 === 1 ? WeekType.NUMERATOR : WeekType.DENOMINATOR,
      isoWeekNumber: isoWeek,
    };
  }
}
