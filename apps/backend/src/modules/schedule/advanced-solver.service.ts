import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConflictDetectorService, toWeeklyUtcMin } from '@/common/utils/conflict-detector';
import { JwtPayload, DayOfWeek, UserRole, WeekType, ScheduleStatus, SolverRunStatus } from '@eduplatform/types';

// ─── Reuse existing generator types ──────────────────────────────────────────

export interface LessonDemand {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  hoursPerWeek: number;
  instanceIndex: number;
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
  weekType: WeekType;
}

export interface PlacementFailure {
  demand: LessonDemand;
  attemptedSlots: Array<{ dayOfWeek: DayOfWeek; timeSlot: number; roomId?: string; reason: string }>;
  finalReason: string;
  message: string;
}

export interface SolverResult {
  strategyUsed: string;
  runtimeMs: number;
  totalDemands: number;
  placed: number;
  failed: number;
  score: number;
  proposedSlots: ProposedSlot[];
  failures: PlacementFailure[];
  diagnostics: {
    greedyPlaced: number;
    greedyFailed: number;
    backtrackRecovered: number;
    backtrackAttempts: number;
    timeoutHit: boolean;
  };
}

interface CandidateSlot {
  dayOfWeek: DayOfWeek;
  timeSlot: number;
  startTime: string;
  endTime: string;
}

// ─── In-memory conflict index ────────────────────────────────────────────────

/**
 * Fast O(1) in-memory conflict tracking.
 * Maps resource + day + slot → boolean.
 */
class ConflictIndex {
  private teacherSlots = new Map<string, boolean>();
  private classSlots = new Map<string, boolean>();
  private roomSlots = new Map<string, boolean>();

  private key(resourceId: string, dayOfWeek: DayOfWeek, timeSlot: number): string {
    return `${resourceId}:${dayOfWeek}:${timeSlot}`;
  }

  isTeacherBusy(teacherId: string, dayOfWeek: DayOfWeek, timeSlot: number): boolean {
    return this.teacherSlots.get(this.key(teacherId, dayOfWeek, timeSlot)) ?? false;
  }

  isClassBusy(classId: string, dayOfWeek: DayOfWeek, timeSlot: number): boolean {
    return this.classSlots.get(this.key(classId, dayOfWeek, timeSlot)) ?? false;
  }

  isRoomBusy(roomId: string, dayOfWeek: DayOfWeek, timeSlot: number): boolean {
    return this.roomSlots.get(this.key(roomId, dayOfWeek, timeSlot)) ?? false;
  }

  place(teacherId: string, classId: string, roomId: string | undefined, dayOfWeek: DayOfWeek, timeSlot: number) {
    this.teacherSlots.set(this.key(teacherId, dayOfWeek, timeSlot), true);
    this.classSlots.set(this.key(classId, dayOfWeek, timeSlot), true);
    if (roomId) {
      this.roomSlots.set(this.key(roomId, dayOfWeek, timeSlot), true);
    }
  }

  unplace(teacherId: string, classId: string, roomId: string | undefined, dayOfWeek: DayOfWeek, timeSlot: number) {
    this.teacherSlots.delete(this.key(teacherId, dayOfWeek, timeSlot));
    this.classSlots.delete(this.key(classId, dayOfWeek, timeSlot));
    if (roomId) {
      this.roomSlots.delete(this.key(roomId, dayOfWeek, timeSlot));
    }
  }

  clear() {
    this.teacherSlots.clear();
    this.classSlots.clear();
    this.roomSlots.clear();
  }
}

// ─── Solver engine ───────────────────────────────────────────────────────────

interface SolverContext {
  demands: LessonDemand[];
  candidates: CandidateSlot[];
  roomIds: (string | undefined)[];
  index: ConflictIndex;
  placed: ProposedSlot[];
  failed: PlacementFailure[];
  existingSchedules: Array<{
    classId: string; teacherId: string; roomId: string | null;
    dayOfWeek: string; timeSlot: number;
  }>;
  overwriteExisting: boolean;
  timeoutAt: number;
}

@Injectable()
export class AdvancedSolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conflictDetector: ConflictDetectorService,
  ) {}

  // ─── Public API ────────────────────────────────────────────────────────────

  async run(
    dto: {
      branchId?: string;
      daysOfWeek?: DayOfWeek[];
      classIds?: string[];
      subjectIds?: string[];
      strategy?: 'greedy' | 'hybrid';
      overwriteExisting?: boolean;
      weekType?: WeekType;
      timeoutMs?: number;
      maxDepth?: number;
    },
    currentUser: JwtPayload,
  ): Promise<SolverResult> {
    const startedAt = Date.now();
    const strategyUsed = dto.strategy ?? 'hybrid';
    const timeoutMs = dto.timeoutMs ?? 10000;
    const maxDepth = dto.maxDepth ?? 2;
    const timeoutAt = startedAt + Math.min(timeoutMs, 30000); // hard cap 30s

    const schoolId = currentUser.schoolId!;
    const daysOfWeek = dto.daysOfWeek ?? [
      DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY,
    ];

    // ── RBAC: Role checks ───────────────────────────────────────────────────
    if (
      currentUser.role === UserRole.TEACHER ||
      currentUser.role === UserRole.STUDENT ||
      currentUser.role === UserRole.PARENT
    ) {
      throw new ForbiddenException("Bu amalni bajarish uchun yetarli huquq yo'q");
    }

    // ── RBAC: Branch scope ──────────────────────────────────────────────────
    let targetBranchId: string | undefined = dto.branchId;
    if (currentUser.role === UserRole.BRANCH_ADMIN) {
      if (targetBranchId && targetBranchId !== currentUser.branchId) {
        throw new ForbiddenException("Filial admin faqat o'z filiali uchun jadval yaratishi mumkin");
      }
      targetBranchId = currentUser.branchId ?? undefined;
    }
    if (!targetBranchId) {
      throw new NotFoundException('Filial IDsi kerak');
    }

    const timezone = await this.getSchoolTimezone(schoolId);
    const weekType = dto.weekType ?? WeekType.ALL;

    // ── 1. Load data (single DB round-trip) ─────────────────────────────────
    const weekTypeFilter = weekType === WeekType.ALL
      ? undefined
      : { in: [WeekType.ALL, weekType] };

    const [subjects, periods, rooms, existingSchedules] = await Promise.all([
      this.prisma.subject.findMany({
        where: {
          schoolId,
          branchId: targetBranchId,
          ...(dto.classIds?.length ? { classId: { in: dto.classIds } } : {}),
          ...(dto.subjectIds?.length ? { id: { in: dto.subjectIds } } : {}),
        },
        select: { id: true, classId: true, teacherId: true, name: true, hoursPerWeek: true },
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
          status: { in: [ScheduleStatus.PUBLISHED, ScheduleStatus.VALIDATED] },
          ...(weekTypeFilter ? { weekType: weekTypeFilter } : {}),
        },
        select: {
          classId: true, teacherId: true, roomId: true,
          dayOfWeek: true, timeSlot: true, startTime: true, endTime: true,
        },
      }),
    ]);

    if (periods.length === 0) {
      await this.persistRun({
        schoolId,
        branchId: targetBranchId,
        weekType,
        strategy: strategyUsed,
        status: SolverRunStatus.CANCELLED,
        demandsCount: 0,
        placedCount: 0,
        failureCount: 0,
        score: 0,
        metadata: { reason: 'Dars soatlari sozlanmagan', timeoutMs },
        createdById: currentUser.sub,
      });
      return this.emptyResult('Dars soatlari sozlanmagan', startedAt, strategyUsed);
    }
    if (subjects.length === 0) {
      await this.persistRun({
        schoolId,
        branchId: targetBranchId,
        weekType,
        strategy: strategyUsed,
        status: SolverRunStatus.CANCELLED,
        demandsCount: 0,
        placedCount: 0,
        failureCount: 0,
        score: 0,
        metadata: { reason: 'Fanlar topilmadi', timeoutMs },
        createdById: currentUser.sub,
      });
      return this.emptyResult('Fanlar topilmadi', startedAt, strategyUsed);
    }

    // ── 2. Build demands ────────────────────────────────────────────────────
    const demands: LessonDemand[] = [];
    for (const s of subjects) {
      const hours = s.hoursPerWeek ?? 2;
      for (let i = 0; i < hours; i++) {
        demands.push({
          id: `${s.classId}-${s.id}`,
          classId: s.classId,
          subjectId: s.id,
          teacherId: s.teacherId,
          hoursPerWeek: hours,
          instanceIndex: i,
        });
      }
    }

    // ── 3. Build candidate grid ─────────────────────────────────────────────
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

    // Room candidates: undefined first, then actual rooms
    const roomCandidates: (string | undefined)[] = [undefined, ...rooms.map(r => r.id)];

    // ── 4. Seed in-memory index with existing schedules ─────────────────────
    const index = new ConflictIndex();
    for (const s of existingSchedules) {
      index.place(s.teacherId, s.classId, s.roomId ?? undefined, s.dayOfWeek as DayOfWeek, s.timeSlot);
    }

    // ── 5. Sort demands by difficulty (deterministic) ───────────────────────
    const teacherSlotCount = new Map<string, number>();
    const classSlotCount = new Map<string, number>();
    for (const d of demands) {
      teacherSlotCount.set(d.teacherId, (teacherSlotCount.get(d.teacherId) ?? 0) + 1);
      classSlotCount.set(d.classId, (classSlotCount.get(d.classId) ?? 0) + 1);
    }

    const sortedDemands = [...demands].sort((a, b) => {
      if (b.hoursPerWeek !== a.hoursPerWeek) return b.hoursPerWeek - a.hoursPerWeek;
      const tDiff = (teacherSlotCount.get(b.teacherId) ?? 0) - (teacherSlotCount.get(a.teacherId) ?? 0);
      if (tDiff !== 0) return tDiff;
      const cDiff = (classSlotCount.get(b.classId) ?? 0) - (classSlotCount.get(a.classId) ?? 0);
      if (cDiff !== 0) return cDiff;
      return a.id.localeCompare(b.id);
    });

    // ── 6. Greedy placement (Stage A) ───────────────────────────────────────
    const placed: ProposedSlot[] = [];
    const failed: PlacementFailure[] = [];

    for (const demand of sortedDemands) {
      if (Date.now() > timeoutAt) break;

      const result = this.tryPlaceDemand(demand, candidates, roomCandidates, index, existingSchedules, dto.overwriteExisting ?? false, weekType);
      if (result.slot) {
        placed.push(result.slot);
        index.place(result.slot.teacherId, result.slot.classId, result.slot.roomId, result.slot.dayOfWeek, result.slot.timeSlot);
      } else {
        failed.push(result.failure);
      }
    }

    const greedyPlaced = placed.length;
    const greedyFailed = failed.length;

    // ── 7. Backtracking repair (Stage B) ────────────────────────────────────
    let backtrackRecovered = 0;
    let backtrackAttempts = 0;
    let timeoutHit = Date.now() > timeoutAt;

    if (strategyUsed === 'hybrid' && failed.length > 0 && !timeoutHit) {
      const stillFailed: PlacementFailure[] = [];

      for (const failure of failed) {
        if (Date.now() > timeoutAt) {
          timeoutHit = true;
          stillFailed.push(failure);
          continue;
        }

        backtrackAttempts++;
        const recovered = this.tryBacktrackRepair(
          failure.demand,
          placed,
          candidates,
          roomCandidates,
          index,
          existingSchedules,
          dto.overwriteExisting ?? false,
          maxDepth,
          timeoutAt,
          weekType,
        );

        if (recovered) {
          backtrackRecovered++;
        } else {
          stillFailed.push(failure);
        }
      }

      failed.length = 0;
      failed.push(...stillFailed);
    }

    // ── 8. Score ────────────────────────────────────────────────────────────
    const score = this.calculateScore(placed, demands, existingSchedules);

    // ── 9. Persist SolverRun ────────────────────────────────────────────────
    const runtimeMs = Date.now() - startedAt;
    await this.persistRun({
      schoolId,
      branchId: targetBranchId,
      weekType,
      strategy: strategyUsed,
      status: timeoutHit ? SolverRunStatus.CANCELLED : SolverRunStatus.COMPLETED,
      demandsCount: demands.length,
      placedCount: placed.length,
      failureCount: failed.length,
      score,
      metadata: {
        greedyPlaced,
        greedyFailed,
        backtrackRecovered,
        backtrackAttempts,
        timeoutHit,
        runtimeMs,
        maxDepth,
        timeoutMs,
        daysOfWeek,
      },
      createdById: currentUser.sub,
    });

    return {
      strategyUsed,
      runtimeMs,
      totalDemands: demands.length,
      placed: placed.length,
      failed: failed.length,
      score,
      proposedSlots: placed,
      failures: failed,
      diagnostics: {
        greedyPlaced,
        greedyFailed,
        backtrackRecovered,
        backtrackAttempts,
        timeoutHit,
      },
    };
  }

  // ─── List solver runs ──────────────────────────────────────────────────────

  async listRuns(
    currentUser: JwtPayload,
    options?: { branchId?: string; limit?: number; offset?: number },
  ) {
    const schoolId = currentUser.schoolId!;
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const where: any = { schoolId };
    if (currentUser.role === UserRole.BRANCH_ADMIN && currentUser.branchId) {
      where.branchId = currentUser.branchId;
    } else if (options?.branchId) {
      where.branchId = options.branchId;
    }

    const [runs, total] = await Promise.all([
      this.prisma.solverRun.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.solverRun.count({ where }),
    ]);

    return { runs, total, limit, offset };
  }

  // ─── Internal: Greedy placement for single demand ──────────────────────────

  private tryPlaceDemand(
    demand: LessonDemand,
    candidates: CandidateSlot[],
    roomCandidates: (string | undefined)[],
    index: ConflictIndex,
    existingSchedules: Array<{ classId: string; teacherId: string; roomId: string | null; dayOfWeek: string; timeSlot: number }>,
    overwriteExisting: boolean,
    weekType: WeekType,
  ): { slot: ProposedSlot | null; failure: PlacementFailure } {
    const attempted: PlacementFailure['attemptedSlots'] = [];

    for (const candidate of candidates) {
      // In-memory class conflict (from this run)
      if (index.isClassBusy(demand.classId, candidate.dayOfWeek, candidate.timeSlot)) {
        attempted.push({ ...candidate, reason: 'SINF_BUSY' });
        continue;
      }

      // In-memory teacher conflict (from this run)
      if (index.isTeacherBusy(demand.teacherId, candidate.dayOfWeek, candidate.timeSlot)) {
        attempted.push({ ...candidate, reason: 'TEACHER_BUSY' });
        continue;
      }

      for (const roomId of roomCandidates) {
        if (roomId && index.isRoomBusy(roomId, candidate.dayOfWeek, candidate.timeSlot)) {
          attempted.push({ ...candidate, roomId, reason: 'ROOM_BUSY' });
          continue;
        }

        // Existing schedule conflict check
        if (!overwriteExisting) {
          const existingClass = existingSchedules.find(
            s => s.classId === demand.classId && s.dayOfWeek === candidate.dayOfWeek && s.timeSlot === candidate.timeSlot,
          );
          if (existingClass) {
            attempted.push({ ...candidate, roomId, reason: 'EXISTING_CLASS_SLOT' });
            continue;
          }
        }

        // Success
        const slot: ProposedSlot = {
          id: `draft-${demand.classId}-${demand.subjectId}-${demand.instanceIndex}`,
          classId: demand.classId,
          subjectId: demand.subjectId,
          teacherId: demand.teacherId,
          roomId: roomId || undefined,
          dayOfWeek: candidate.dayOfWeek,
          timeSlot: candidate.timeSlot,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          weekType,
        };

        return { slot, failure: null as any };
      }
    }

    const failure: PlacementFailure = {
      demand,
      attemptedSlots: attempted.slice(0, 10),
      finalReason: attempted.length > 0 ? attempted[attempted.length - 1].reason : 'NO_CANDIDATE',
      message: `Joylashtirilmadi: ${attempted.length > 0 ? attempted[attempted.length - 1].reason : 'Bosh slot topilmadi'}`,
    };

    return { slot: null, failure };
  }

  // ─── Internal: Backtracking repair ─────────────────────────────────────────

  private tryBacktrackRepair(
    demand: LessonDemand,
    placed: ProposedSlot[],
    candidates: CandidateSlot[],
    roomCandidates: (string | undefined)[],
    index: ConflictIndex,
    existingSchedules: Array<{ classId: string; teacherId: string; roomId: string | null; dayOfWeek: string; timeSlot: number }>,
    overwriteExisting: boolean,
    maxDepth: number,
    timeoutAt: number,
    weekType: WeekType,
  ): boolean {
    if (maxDepth <= 0 || Date.now() > timeoutAt) return false;

    // Find viable candidate slots for this demand
    const viableCandidates: CandidateSlot[] = [];
    for (const candidate of candidates) {
      // Check if class is free
      if (index.isClassBusy(demand.classId, candidate.dayOfWeek, candidate.timeSlot)) {
        // Class is busy — maybe by an existing schedule, can't move that
        const blocker = placed.find(p => p.classId === demand.classId && p.dayOfWeek === candidate.dayOfWeek && p.timeSlot === candidate.timeSlot);
        if (!blocker) continue; // blocked by existing schedule, can't move
      }

      // Check teacher
      if (index.isTeacherBusy(demand.teacherId, candidate.dayOfWeek, candidate.timeSlot)) {
        const blocker = placed.find(p => p.teacherId === demand.teacherId && p.dayOfWeek === candidate.dayOfWeek && p.timeSlot === candidate.timeSlot);
        if (!blocker) continue;
      }

      viableCandidates.push(candidate);
    }

    // For each viable candidate, try to resolve conflicts by moving blockers
    for (const candidate of viableCandidates) {
      if (Date.now() > timeoutAt) return false;

      // Identify blockers in this candidate slot
      const blockers: ProposedSlot[] = [];

      const classBlocker = placed.find(p => p.classId === demand.classId && p.dayOfWeek === candidate.dayOfWeek && p.timeSlot === candidate.timeSlot);
      if (classBlocker) blockers.push(classBlocker);

      const teacherBlocker = placed.find(p => p.teacherId === demand.teacherId && p.dayOfWeek === candidate.dayOfWeek && p.timeSlot === candidate.timeSlot);
      if (teacherBlocker && teacherBlocker !== classBlocker) blockers.push(teacherBlocker);

      const roomBlockers = placed.filter(p =>
        p.roomId && candidate.dayOfWeek === p.dayOfWeek && candidate.timeSlot === p.timeSlot &&
        !blockers.includes(p),
      );
      // Only consider room blockers if we plan to use a room
      // Simplification: skip room backtracking for MVP, handle class/teacher only

      if (blockers.length === 0) {
        // No blockers — place directly
        const slot: ProposedSlot = {
          id: `draft-${demand.classId}-${demand.subjectId}-${demand.instanceIndex}`,
          classId: demand.classId,
          subjectId: demand.subjectId,
          teacherId: demand.teacherId,
          roomId: undefined, // simplest: no room for backtracked placements
          dayOfWeek: candidate.dayOfWeek,
          timeSlot: candidate.timeSlot,
          startTime: candidate.startTime,
          endTime: candidate.endTime,
          weekType,
        };
        placed.push(slot);
        index.place(slot.teacherId, slot.classId, slot.roomId, slot.dayOfWeek, slot.timeSlot);
        return true;
      }

      // Try moving each blocker
      for (const blocker of blockers) {
        // Unplace blocker
        const blockerIdx = placed.indexOf(blocker);
        if (blockerIdx === -1) continue;
        placed.splice(blockerIdx, 1);
        index.unplace(blocker.teacherId, blocker.classId, blocker.roomId, blocker.dayOfWeek, blocker.timeSlot);

        // Try to re-place blocker elsewhere
        const blockerDemand: LessonDemand = {
          id: `${blocker.classId}-${blocker.subjectId}`,
          classId: blocker.classId,
          subjectId: blocker.subjectId,
          teacherId: blocker.teacherId,
          hoursPerWeek: 1,
          instanceIndex: 0,
        };

        const rePlaceResult = this.tryPlaceDemand(
          blockerDemand,
          candidates,
          roomCandidates,
          index,
          existingSchedules,
          overwriteExisting,
          weekType,
        );

        if (rePlaceResult.slot) {
          // Blocker moved successfully — now place the original demand
          placed.push(rePlaceResult.slot);
          index.place(rePlaceResult.slot.teacherId, rePlaceResult.slot.classId, rePlaceResult.slot.roomId, rePlaceResult.slot.dayOfWeek, rePlaceResult.slot.timeSlot);

          const slot: ProposedSlot = {
            id: `draft-${demand.classId}-${demand.subjectId}-${demand.instanceIndex}`,
            classId: demand.classId,
            subjectId: demand.subjectId,
            teacherId: demand.teacherId,
            roomId: undefined,
            dayOfWeek: candidate.dayOfWeek,
            timeSlot: candidate.timeSlot,
            startTime: candidate.startTime,
            endTime: candidate.endTime,
            weekType,
          };
          placed.push(slot);
          index.place(slot.teacherId, slot.classId, slot.roomId, slot.dayOfWeek, slot.timeSlot);
          return true;
        }

        // Failed to re-place blocker — restore it
        placed.push(blocker);
        index.place(blocker.teacherId, blocker.classId, blocker.roomId, blocker.dayOfWeek, blocker.timeSlot);
      }
    }

    return false;
  }

  // ─── Internal: Scoring ─────────────────────────────────────────────────────

  private calculateScore(
    placed: ProposedSlot[],
    demands: LessonDemand[],
    existingSchedules: Array<{ classId: string; teacherId: string; roomId: string | null; dayOfWeek: string; timeSlot: number }>,
  ): number {
    if (demands.length === 0) return 0;

    // Base: placement rate
    let score = (placed.length / demands.length) * 100;

    // Teacher daily load penalty: > 4 lessons per day = penalty
    const teacherDailyLoad = new Map<string, number>();
    for (const p of placed) {
      const key = `${p.teacherId}:${p.dayOfWeek}`;
      teacherDailyLoad.set(key, (teacherDailyLoad.get(key) ?? 0) + 1);
    }
    for (const [_, count] of teacherDailyLoad) {
      if (count > 4) {
        score -= (count - 4) * 5;
      }
    }

    // Subject spreading penalty: same subject on same day for same class
    const subjectDailyCount = new Map<string, number>();
    for (const p of placed) {
      const key = `${p.classId}:${p.subjectId}:${p.dayOfWeek}`;
      subjectDailyCount.set(key, (subjectDailyCount.get(key) ?? 0) + 1);
    }
    for (const [_, count] of subjectDailyCount) {
      if (count > 1) {
        score -= (count - 1) * 3;
      }
    }

    return Math.max(0, Math.round(score));
  }

  // ─── Internal: Persist run ─────────────────────────────────────────────────

  private async persistRun(data: {
    schoolId: string;
    branchId: string;
    weekType: WeekType;
    strategy: string;
    status: SolverRunStatus;
    demandsCount: number;
    placedCount: number;
    failureCount: number;
    score: number;
    metadata: Record<string, any>;
    createdById: string;
  }) {
    try {
      await this.prisma.solverRun.create({
        data: {
          ...data,
          score: data.score,
          metadata: data.metadata,
          completedAt: data.status === SolverRunStatus.COMPLETED ? new Date() : undefined,
        },
      });
    } catch (e) {
      // Non-critical: log but don't fail the solver result
      // In production, this would go to a logger
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getSchoolTimezone(schoolId: string): Promise<string> {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { timezone: true },
    });
    return school?.timezone ?? 'Asia/Tashkent';
  }

  private emptyResult(reason: string, startedAt: number, strategyUsed: string): SolverResult {
    const runtimeMs = Date.now() - startedAt;
    return {
      strategyUsed,
      runtimeMs,
      totalDemands: 0,
      placed: 0,
      failed: 0,
      score: 0,
      proposedSlots: [],
      failures: [],
      diagnostics: {
        greedyPlaced: 0,
        greedyFailed: 0,
        backtrackRecovered: 0,
        backtrackAttempts: 0,
        timeoutHit: false,
      },
    };
  }
}
