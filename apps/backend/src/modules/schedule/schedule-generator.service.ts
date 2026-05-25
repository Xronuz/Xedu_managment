import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConflictDetectorService, toWeeklyUtcMin } from '@/common/utils/conflict-detector';
import { JwtPayload, DayOfWeek, UserRole } from '@eduplatform/types';

// ─── Tip lar ─────────────────────────────────────────────────────────────────

export interface LessonDemand {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  hoursPerWeek: number;
}

export interface ProposedSlot {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
  dayOfWeek: DayOfWeek;
  timeSlot: number;
  startTime: string;
  endTime: string;
}

export interface PlacementFailure {
  demand: LessonDemand;
  attemptedSlots: Array<{ dayOfWeek: DayOfWeek; timeSlot: number; roomId?: string; reason: string }>;
  finalReason: string;
  message: string;
}

export interface GeneratorConflictReport {
  totalDemands: number;
  placed: number;
  failed: number;
  proposedSlots: ProposedSlot[];
  failures: PlacementFailure[];
  stats: {
    byReason: Record<string, number>;
    byTeacher: Record<string, number>;
    byClass: Record<string, number>;
    bySubject: Record<string, number>;
  };
}

interface CandidateSlot {
  dayOfWeek: DayOfWeek;
  timeSlot: number;
  startTime: string;
  endTime: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class ScheduleGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflictDetector: ConflictDetectorService,
  ) {}

  async generate(
    dto: {
      branchId?: string;
      daysOfWeek?: DayOfWeek[];
      classIds?: string[];
      subjectIds?: string[];
      overwriteExisting?: boolean;
    },
    currentUser: JwtPayload,
  ): Promise<GeneratorConflictReport> {
    const schoolId = currentUser.schoolId!;
    const daysOfWeek = dto.daysOfWeek ?? [
      DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY,
    ];

    // Branch scope
    let targetBranchId: string | undefined = dto.branchId;
    if (currentUser.role === UserRole.BRANCH_ADMIN) {
      if (targetBranchId && targetBranchId !== currentUser.branchId) {
        throw new ForbiddenException('Filial admin faqat o\'z filiali uchun jadval yaratishi mumkin');
      }
      targetBranchId = currentUser.branchId ?? undefined;
    }
    if (!targetBranchId) {
      throw new NotFoundException('Filial IDsi kerak');
    }

    const timezone = await this.getSchoolTimezone(schoolId);

    // ── 1. Load data ──────────────────────────────────────────────────────────
    const [subjects, periods, rooms, existingSchedules] = await Promise.all([
      this.prisma.subject.findMany({
        where: {
          schoolId,
          branchId: targetBranchId,
          ...(dto.classIds?.length ? { classId: { in: dto.classIds } } : {}),
          ...(dto.subjectIds?.length ? { id: { in: dto.subjectIds } } : {}),
        },
        select: {
          id: true, classId: true, teacherId: true, name: true, hoursPerWeek: true,
        },
      }),
      this.prisma.period.findMany({
        where: { schoolId, branchId: targetBranchId, isActive: true },
        select: { periodNumber: true, startTime: true, endTime: true },
        orderBy: { periodNumber: 'asc' },
      }),
      this.prisma.room.findMany({
        where: { schoolId, branchId: targetBranchId, isActive: true },
        select: { id: true, name: true },
      }),
      this.prisma.schedule.findMany({
        where: {
          schoolId,
          branchId: targetBranchId,
          ...(dto.classIds?.length ? { classId: { in: dto.classIds } } : {}),
          dayOfWeek: { in: daysOfWeek as any },
        },
        select: {
          classId: true, teacherId: true, roomId: true,
          dayOfWeek: true, timeSlot: true, startTime: true, endTime: true,
        },
      }),
    ]);

    if (periods.length === 0) {
      return this.emptyReport('Dars soatlari sozlanmagan');
    }
    if (subjects.length === 0) {
      return this.emptyReport('Fanlar topilmadi');
    }

    // ── 2. Build demands ──────────────────────────────────────────────────────
    const demands: LessonDemand[] = subjects.map(s => ({
      id: `${s.classId}-${s.id}`,
      classId: s.classId,
      subjectId: s.id,
      teacherId: s.teacherId,
      hoursPerWeek: s.hoursPerWeek ?? 2,
    }));

    // Expand demands into individual lesson instances
    const lessonInstances: Array<LessonDemand & { instanceIndex: number }> = [];
    for (const d of demands) {
      for (let i = 0; i < d.hoursPerWeek; i++) {
        lessonInstances.push({ ...d, instanceIndex: i });
      }
    }

    // ── 3. Build candidate grid ───────────────────────────────────────────────
    const candidates: CandidateSlot[] = [];
    for (const day of daysOfWeek) {
      for (const p of periods) {
        candidates.push({
          dayOfWeek: day,
          timeSlot: p.periodNumber,
          startTime: p.startTime,
          endTime: p.endTime,
        });
      }
    }

    // ── 4. Sort demands by difficulty (deterministic) ─────────────────────────
    // Teachers/classes with fewer free slots are harder to place.
    const teacherSlotCount = new Map<string, number>();
    const classSlotCount   = new Map<string, number>();
    for (const inst of lessonInstances) {
      teacherSlotCount.set(inst.teacherId, (teacherSlotCount.get(inst.teacherId) ?? 0) + 1);
      classSlotCount.set(inst.classId, (classSlotCount.get(inst.classId) ?? 0) + 1);
    }

    const sortedInstances = [...lessonInstances].sort((a, b) => {
      // Higher hoursPerWeek first
      if (b.hoursPerWeek !== a.hoursPerWeek) return b.hoursPerWeek - a.hoursPerWeek;
      // Then teacher with more demands first (harder to fit)
      const tDiff = (teacherSlotCount.get(b.teacherId) ?? 0) - (teacherSlotCount.get(a.teacherId) ?? 0);
      if (tDiff !== 0) return tDiff;
      // Then class with more demands first
      const cDiff = (classSlotCount.get(b.classId) ?? 0) - (classSlotCount.get(a.classId) ?? 0);
      if (cDiff !== 0) return cDiff;
      // Deterministic tie-breaker
      return a.id.localeCompare(b.id);
    });

    // ── 5. Greedy placement ───────────────────────────────────────────────────
    const proposedSlots: ProposedSlot[] = [];
    const failures: PlacementFailure[] = [];
    const placedKeys = new Set<string>(); // tracks what we placed in this run

    for (const inst of sortedInstances) {
      const attempted: PlacementFailure['attemptedSlots'] = [];
      let placed = false;

      // Candidate rooms: try all rooms, prefer no room first if none required
      const roomCandidates = [undefined, ...rooms.map(r => r.id)];

      for (const candidate of candidates) {
        // Check if class already has something in this slot (from this generation)
        const classKey = `${inst.classId}:${candidate.dayOfWeek}:${candidate.timeSlot}`;
        if (placedKeys.has(classKey)) {
          attempted.push({ ...candidate, reason: 'SINF_BUSY' });
          continue;
        }

        // Check if teacher already has something in this slot (from this generation)
        const teacherKey = `${inst.teacherId}:${candidate.dayOfWeek}:${candidate.timeSlot}`;
        if (placedKeys.has(teacherKey)) {
          attempted.push({ ...candidate, reason: 'TEACHER_BUSY' });
          continue;
        }

        for (const roomId of roomCandidates) {
          if (roomId) {
            const roomKey = `${roomId}:${candidate.dayOfWeek}:${candidate.timeSlot}`;
            if (placedKeys.has(roomKey)) {
              attempted.push({ ...candidate, roomId, reason: 'ROOM_BUSY' });
              continue;
            }
          }

          // Check against existing DB schedules
          const conflicts = await this.conflictDetector.checkClash({
            schoolId,
            branchId: targetBranchId,
            teacherId: inst.teacherId,
            roomId: roomId || undefined,
            classId: inst.classId,
            dayOfWeek: candidate.dayOfWeek,
            startTime: candidate.startTime,
            endTime: candidate.endTime,
            timezone,
          });

          if (conflicts.length > 0) {
            attempted.push({ ...candidate, roomId, reason: conflicts[0].type.toUpperCase() + '_BUSY' });
            continue;
          }

          // Also check against existing schedules that we haven't overwritten
          const existingClass = existingSchedules.find(
            s => s.classId === inst.classId && s.dayOfWeek === candidate.dayOfWeek && s.timeSlot === candidate.timeSlot,
          );
          if (existingClass && !dto.overwriteExisting) {
            attempted.push({ ...candidate, roomId, reason: 'EXISTING_CLASS_SLOT' });
            continue;
          }

          // Place it
          proposedSlots.push({
            id: `draft-${proposedSlots.length}`,
            classId: inst.classId,
            subjectId: inst.subjectId,
            teacherId: inst.teacherId,
            roomId: roomId || undefined,
            dayOfWeek: candidate.dayOfWeek,
            timeSlot: candidate.timeSlot,
            startTime: candidate.startTime,
            endTime: candidate.endTime,
          });

          placedKeys.add(classKey);
          placedKeys.add(teacherKey);
          if (roomId) placedKeys.add(`${roomId}:${candidate.dayOfWeek}:${candidate.timeSlot}`);
          placed = true;
          break;
        }

        if (placed) break;
      }

      if (!placed) {
        failures.push({
          demand: inst,
          attemptedSlots: attempted.slice(0, 10), // cap to avoid huge reports
          finalReason: attempted.length > 0 ? attempted[attempted.length - 1].reason : 'NO_CANDIDATE',
          message: `Joylashtirilmadi: ${attempted.length > 0 ? attempted[attempted.length - 1].reason : 'Bosh slot topilmadi'}`,
        });
      }
    }

    // ── 6. Build report ───────────────────────────────────────────────────────
    const byReason: Record<string, number> = {};
    const byTeacher: Record<string, number> = {};
    const byClass: Record<string, number> = {};
    const bySubject: Record<string, number> = {};

    for (const f of failures) {
      byReason[f.finalReason] = (byReason[f.finalReason] ?? 0) + 1;
      byTeacher[f.demand.teacherId] = (byTeacher[f.demand.teacherId] ?? 0) + 1;
      byClass[f.demand.classId] = (byClass[f.demand.classId] ?? 0) + 1;
      bySubject[f.demand.subjectId] = (bySubject[f.demand.subjectId] ?? 0) + 1;
    }

    return {
      totalDemands: lessonInstances.length,
      placed: proposedSlots.length,
      failed: failures.length,
      proposedSlots,
      failures,
      stats: { byReason, byTeacher, byClass, bySubject },
    };
  }

  // ─── Commit proposed slots ─────────────────────────────────────────────────

  async commitProposed(
    slots: ProposedSlot[],
    currentUser: JwtPayload,
    overwriteExisting?: boolean,
  ): Promise<{ created: number; errors: string[] }> {
    const schoolId = currentUser.schoolId!;
    const errors: string[] = [];
    let created = 0;
    const timezone = await this.getSchoolTimezone(schoolId);

    for (const slot of slots) {
      try {
        const cls = await this.prisma.class.findUnique({
          where: { id: slot.classId },
          select: { branchId: true, schoolId: true },
        });
        if (!cls || cls.schoolId !== schoolId) {
          errors.push(`Slot ${slot.id}: Sinf topilmadi`);
          continue;
        }
        const branchId = cls.branchId;

        if (currentUser.role === UserRole.BRANCH_ADMIN && branchId !== currentUser.branchId) {
          errors.push(`Slot ${slot.id}: Sinf boshqa filialga tegishli`);
          continue;
        }

        const existing = await this.prisma.schedule.findFirst({
          where: {
            schoolId,
            classId: slot.classId,
            dayOfWeek: slot.dayOfWeek as any,
            timeSlot: slot.timeSlot,
          },
        });
        if (existing && !overwriteExisting) {
          errors.push(`Slot ${slot.id}: Bu vaqtda sinf uchun jadval allaqachon mavjud`);
          continue;
        }

        const conflicts = await this.conflictDetector.checkClash({
          schoolId,
          branchId,
          teacherId: slot.teacherId,
          roomId: slot.roomId,
          classId: slot.classId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone,
        });
        if (conflicts.length > 0) {
          errors.push(`Slot ${slot.id}: ${conflicts.map(c => c.message).join('; ')}`);
          continue;
        }

        const startDayMinUtc = toWeeklyUtcMin(slot.dayOfWeek, slot.startTime, timezone);
        const endDayMinUtc   = toWeeklyUtcMin(slot.dayOfWeek, slot.endTime, timezone);

        if (existing && overwriteExisting) {
          await this.prisma.schedule.delete({ where: { id: existing.id } });
        }

        await this.prisma.schedule.create({
          data: {
            schoolId,
            branchId,
            classId: slot.classId,
            subjectId: slot.subjectId,
            teacherId: slot.teacherId,
            roomId: slot.roomId || null,
            dayOfWeek: slot.dayOfWeek as any,
            timeSlot: slot.timeSlot,
            startTime: slot.startTime,
            endTime: slot.endTime,
            startDayMinUtc,
            endDayMinUtc,
          },
        });
        created++;
      } catch (e: any) {
        errors.push(`Slot ${slot.id}: ${e.message}`);
      }
    }

    return { created, errors };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getSchoolTimezone(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { timezone: true },
    });
    return school?.timezone ?? 'Asia/Tashkent';
  }

  private emptyReport(reason: string): GeneratorConflictReport {
    return {
      totalDemands: 0,
      placed: 0,
      failed: 0,
      proposedSlots: [],
      failures: [],
      stats: { byReason: { [reason]: 1 }, byTeacher: {}, byClass: {}, bySubject: {} },
    };
  }
}
