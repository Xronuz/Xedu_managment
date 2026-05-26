import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  JwtPayload, UserRole, ScheduleStatus, WeekType, SubstitutionStatus,
} from '@eduplatform/types';
import { getISOWeek } from '@/common/utils/week-type.util';
import { randomUUID } from 'crypto';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface AnalyzeRepairInput {
  scheduleId?: string;
  leaveRequestId?: string;
  roomId?: string;
  date?: string;
  reason?: string;
}

export interface ApplyRepairInput {
  optionId: string;
  type: 'substitute_teacher' | 'room_swap' | 'reschedule_lesson' | 'teacher_swap';
  scheduleId: string;
  date: string;
  substituteTeacherId?: string;
  newRoomId?: string;
  newDayOfWeek?: string;
  newTimeSlot?: number;
  swapTeacherId?: string;
  swapScheduleId?: string;
}

// ─── Output types ────────────────────────────────────────────────────────────

export interface RepairOption {
  id: string;
  type: 'substitute_teacher' | 'room_swap' | 'reschedule_lesson' | 'teacher_swap';
  score: number;
  impact: 'low' | 'medium' | 'high';
  confidence: number;
  explanation: string;
  requiredActions: string[];
  payload: Record<string, any>;
}

export interface DisruptionInfo {
  type: 'leave' | 'absence' | 'room_unavailable' | 'conflict';
  description: string;
  affectedTeacherId?: string;
  affectedRoomId?: string;
  affectedDate?: string;
}

export interface AffectedSchedule {
  scheduleId: string;
  date: string;
  dayOfWeek: string;
  timeSlot: number;
  subjectName: string;
  className: string;
  roomName?: string;
  teacherName: string;
}

export interface AnalyzeRepairResult {
  disruption: DisruptionInfo;
  affectedSchedules: AffectedSchedule[];
  options: RepairOption[];
}

// ─── Service ─────────────────────────────────────────────────────────────────

const MANAGER_ROLES = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN];

@Injectable()
export class ScheduleRepairService {
  constructor(private readonly prisma: PrismaService) {}

  private assertCanManage(currentUser: JwtPayload) {
    if (!MANAGER_ROLES.includes(currentUser.role)) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
  }

  // ── Analyze ────────────────────────────────────────────────────────────────

  async analyze(input: AnalyzeRepairInput, currentUser: JwtPayload): Promise<AnalyzeRepairResult> {
    this.assertCanManage(currentUser);

    const schoolId = currentUser.schoolId!;

    // Determine disruption type & gather affected schedules
    if (input.leaveRequestId) {
      return this.analyzeLeaveDisruption(input.leaveRequestId, schoolId, currentUser);
    }

    if (input.scheduleId && input.date) {
      return this.analyzeSlotDisruption(input.scheduleId, input.date, schoolId, currentUser, input.reason);
    }

    if (input.roomId && input.date) {
      return this.analyzeRoomDisruption(input.roomId, input.date, schoolId, currentUser);
    }

    throw new BadRequestException('Kamida leaveRequestId, scheduleId+date, yoki roomId+date kerak');
  }

  // ── Leave-based disruption ─────────────────────────────────────────────────

  private async analyzeLeaveDisruption(
    leaveRequestId: string,
    schoolId: string,
    currentUser: JwtPayload,
  ): Promise<AnalyzeRepairResult> {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, schoolId },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!leave) throw new NotFoundException('Ta\'til so\'rovi topilmadi');
    if (!leave.affectsSchedule) {
      return {
        disruption: { type: 'leave', description: 'Bu ta\'til jadvalga ta\'sir qilmaydi' },
        affectedSchedules: [],
        options: [],
      };
    }

    // Branch scope
    if (currentUser.role === UserRole.BRANCH_ADMIN && leave.branchId !== currentUser.branchId) {
      throw new ForbiddenException('Faqat o\'z filialingiz uchun ko\'rish mumkin');
    }

    const teacherId = leave.requesterId;
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);

    // Published schedules for this teacher
    const schedules = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        teacherId,
        status: ScheduleStatus.PUBLISHED,
        ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        room: { select: { name: true } },
        teacher: { select: { firstName: true, lastName: true } },
        teacherSubstitutions: {
          where: { status: { not: SubstitutionStatus.REJECTED } },
          select: { date: true, status: true, substituteTeacherId: true },
        },
      },
    });

    const affectedSchedules: AffectedSchedule[] = [];
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const isoWeek = getISOWeek(d);
      const isNumeratorWeek = isoWeek % 2 === 1;
      const dayOfWeek = dayNames[d.getDay()];
      const dateStr = d.toISOString().split('T')[0];

      for (const s of schedules) {
        if (s.dayOfWeek !== dayOfWeek) continue;
        if (s.weekType === WeekType.NUMERATOR && !isNumeratorWeek) continue;
        if (s.weekType === WeekType.DENOMINATOR && isNumeratorWeek) continue;

        // Skip if already has non-rejected substitution
        const existingSub = s.teacherSubstitutions.find(
          (sub: any) => sub.date.toISOString().split('T')[0] === dateStr,
        );
        if (existingSub) continue;

        affectedSchedules.push({
          scheduleId: s.id,
          date: dateStr,
          dayOfWeek: s.dayOfWeek,
          timeSlot: s.timeSlot,
          subjectName: s.subject?.name ?? '',
          className: s.class?.name ?? '',
          roomName: s.room?.name ?? undefined,
          teacherName: `${s.teacher.firstName} ${s.teacher.lastName}`,
        });
      }
    }

    const options: RepairOption[] = [];

    // Generate substitute-teacher options for each affected slot
    for (const slot of affectedSchedules) {
      const candidates = await this.findSubstituteCandidates(slot.scheduleId, slot.date, schoolId, currentUser.branchId);
      for (const cand of candidates.slice(0, 5)) {
        options.push({
          id: randomUUID(),
          type: 'substitute_teacher',
          score: cand.score,
          impact: cand.score >= 70 ? 'low' : cand.score >= 40 ? 'medium' : 'high',
          confidence: cand.score / 100,
          explanation: `O'qituvchi ${cand.teacherName} (${cand.reasons.join(', ')})`,
          requiredActions: ['Almashtirishni tasdiqlash', 'Davomat yozuvlarini yaratish'],
          payload: {
            scheduleId: slot.scheduleId,
            date: slot.date,
            substituteTeacherId: cand.teacherId,
            originalTeacherId: teacherId,
            leaveRequestId,
          },
        });
      }
    }

    // Sort by score desc
    options.sort((a, b) => b.score - a.score);

    return {
      disruption: {
        type: 'leave',
        description: `${leave.requester.firstName} ${leave.requester.lastName} ${start.toISOString().split('T')[0]} – ${end.toISOString().split('T')[0]} oralig'ida ta'tilda`,
        affectedTeacherId: teacherId,
      },
      affectedSchedules,
      options,
    };
  }

  // ── Single-slot disruption (conflict / absence) ────────────────────────────

  private async analyzeSlotDisruption(
    scheduleId: string,
    dateStr: string,
    schoolId: string,
    currentUser: JwtPayload,
    reason?: string,
  ): Promise<AnalyzeRepairResult> {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id: scheduleId,
        schoolId,
        ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        room: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!schedule) throw new NotFoundException('Dars sloti topilmadi');

    const affectedSchedules: AffectedSchedule[] = [{
      scheduleId: schedule.id,
      date: dateStr,
      dayOfWeek: schedule.dayOfWeek,
      timeSlot: schedule.timeSlot,
      subjectName: schedule.subject?.name ?? '',
      className: schedule.class?.name ?? '',
      roomName: schedule.room?.name ?? undefined,
      teacherName: `${schedule.teacher.firstName} ${schedule.teacher.lastName}`,
    }];

    const options: RepairOption[] = [];

    // Substitute candidates
    const candidates = await this.findSubstituteCandidates(scheduleId, dateStr, schoolId, currentUser.branchId);
    for (const cand of candidates.slice(0, 5)) {
      options.push({
        id: randomUUID(),
        type: 'substitute_teacher',
        score: cand.score,
        impact: cand.score >= 70 ? 'low' : cand.score >= 40 ? 'medium' : 'high',
        confidence: cand.score / 100,
        explanation: `O'qituvchi ${cand.teacherName} (${cand.reasons.join(', ')})`,
        requiredActions: ['Almashtirishni tasdiqlash', 'Davomat yozuvlarini yaratish'],
        payload: {
          scheduleId,
          date: dateStr,
          substituteTeacherId: cand.teacherId,
          originalTeacherId: schedule.teacher.id,
        },
      });
    }

    // Room swap options (if room is assigned)
    if (schedule.room?.id) {
      const roomOptions = await this.findRoomSwapOptions(schedule, dateStr, schoolId);
      options.push(...roomOptions);
    }

    // Reschedule options
    const rescheduleOptions = await this.findRescheduleOptions(schedule, dateStr, schoolId);
    options.push(...rescheduleOptions);

    // Teacher swap options
    const swapOptions = await this.findTeacherSwapOptions(schedule, dateStr, schoolId, currentUser.branchId);
    options.push(...swapOptions);

    options.sort((a, b) => b.score - a.score);

    return {
      disruption: {
        type: 'conflict',
        description: reason ?? `Dars slotida muammo aniqlandi`,
        affectedTeacherId: schedule.teacher.id,
        affectedDate: dateStr,
      },
      affectedSchedules,
      options,
    };
  }

  // ── Room unavailable disruption ────────────────────────────────────────────

  private async analyzeRoomDisruption(
    roomId: string,
    dateStr: string,
    schoolId: string,
    currentUser: JwtPayload,
  ): Promise<AnalyzeRepairResult> {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, schoolId },
    });
    if (!room) throw new NotFoundException('Xona topilmadi');

    const schedules = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        roomId,
        status: ScheduleStatus.PUBLISHED,
        ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        room: { select: { name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const date = new Date(dateStr);
    const targetDay = dayNames[date.getDay()];
    const isoWeek = getISOWeek(date);
    const isNumeratorWeek = isoWeek % 2 === 1;

    const affectedSchedules: AffectedSchedule[] = [];
    for (const s of schedules) {
      if (s.dayOfWeek !== targetDay) continue;
      if (s.weekType === WeekType.NUMERATOR && !isNumeratorWeek) continue;
      if (s.weekType === WeekType.DENOMINATOR && isNumeratorWeek) continue;

      affectedSchedules.push({
        scheduleId: s.id,
        date: dateStr,
        dayOfWeek: s.dayOfWeek,
        timeSlot: s.timeSlot,
        subjectName: s.subject?.name ?? '',
        className: s.class?.name ?? '',
        roomName: s.room?.name ?? undefined,
        teacherName: `${s.teacher.firstName} ${s.teacher.lastName}`,
      });

      // Room swap options for this slot
      const swapOptions = await this.findRoomSwapOptions(s, dateStr, schoolId);
      // Increase score slightly because room unavailability is a clear driver
      for (const opt of swapOptions) {
        opt.score = Math.min(100, opt.score + 10);
        opt.explanation = `Xona band: ${opt.explanation}`;
      }
    }

    return {
      disruption: {
        type: 'room_unavailable',
        description: `${room.name} xonasi ${dateStr} sanasida band`,
        affectedRoomId: roomId,
        affectedDate: dateStr,
      },
      affectedSchedules,
      options: [], // room swaps are generated per-slot above
    };
  }

  // ── Candidate scoring (adapted from SubstitutionWorkflowService) ───────────

  private async findSubstituteCandidates(
    scheduleId: string,
    dateStr: string,
    schoolId: string,
    branchId?: string | null,
  ) {
    const schedule = await this.prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!schedule) return [];

    const date = new Date(dateStr);
    const dayOfWeek = schedule.dayOfWeek;
    const timeSlot = schedule.timeSlot;

    // All active teachers
    const teachers = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: ['teacher', 'class_teacher'] },
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      select: { id: true, firstName: true, lastName: true, branchId: true },
    });

    const teacherIds = teachers.map(t => t.id);

    // Conflicting published schedules for these teachers at same day/slot
    const conflictingSchedules = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        teacherId: { in: teacherIds },
        status: ScheduleStatus.PUBLISHED,
        dayOfWeek,
        timeSlot,
        id: { not: scheduleId },
      },
      select: { teacherId: true, weekType: true },
    });

    const isoWeek = getISOWeek(date);
    const isNumeratorWeek = isoWeek % 2 === 1;

    const busyTeacherIds = new Set<string>();
    for (const cs of conflictingSchedules) {
      if (cs.weekType === WeekType.ALL) busyTeacherIds.add(cs.teacherId);
      else if (cs.weekType === WeekType.NUMERATOR && isNumeratorWeek) busyTeacherIds.add(cs.teacherId);
      else if (cs.weekType === WeekType.DENOMINATOR && !isNumeratorWeek) busyTeacherIds.add(cs.teacherId);
    }

    // Conflicting approved/applied substitutions
    const conflictingSubs = await this.prisma.teacherSubstitution.findMany({
      where: {
        substituteTeacherId: { in: teacherIds },
        date,
        status: { in: [SubstitutionStatus.APPROVED, SubstitutionStatus.APPLIED] },
      },
      select: { substituteTeacherId: true },
    });
    for (const sub of conflictingSubs) busyTeacherIds.add(sub.substituteTeacherId);

    // Teachers on approved leave
    const onLeave = await this.prisma.leaveRequest.findMany({
      where: {
        requesterId: { in: teacherIds },
        status: 'approved',
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: { requesterId: true },
    });
    for (const lr of onLeave) busyTeacherIds.add(lr.requesterId);

    // Teaching loads for subject matching
    const teachingLoads = await this.prisma.teachingLoad.findMany({
      where: {
        teacherId: { in: teacherIds },
        subjectId: schedule.subjectId,
      },
      select: { teacherId: true, classId: true },
    });
    const teachesSubject = new Set(teachingLoads.map(tl => tl.teacherId));
    const teachesSubjectAndClass = new Set(
      teachingLoads.filter(tl => tl.classId === schedule.classId).map(tl => tl.teacherId),
    );

    // Daily load for each teacher
    const dailySchedules = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        teacherId: { in: teacherIds },
        status: ScheduleStatus.PUBLISHED,
        dayOfWeek,
      },
      select: { teacherId: true, weekType: true },
    });
    const dailyLoadMap = new Map<string, number>();
    for (const ds of dailySchedules) {
      if (ds.weekType === WeekType.ALL) {
        dailyLoadMap.set(ds.teacherId, (dailyLoadMap.get(ds.teacherId) ?? 0) + 1);
      } else if (ds.weekType === WeekType.NUMERATOR && isNumeratorWeek) {
        dailyLoadMap.set(ds.teacherId, (dailyLoadMap.get(ds.teacherId) ?? 0) + 1);
      } else if (ds.weekType === WeekType.DENOMINATOR && !isNumeratorWeek) {
        dailyLoadMap.set(ds.teacherId, (dailyLoadMap.get(ds.teacherId) ?? 0) + 1);
      }
    }

    // Weekly substitution count
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weeklySubs = await this.prisma.teacherSubstitution.findMany({
      where: {
        substituteTeacherId: { in: teacherIds },
        date: { gte: weekStart, lte: weekEnd },
        status: { in: [SubstitutionStatus.APPROVED, SubstitutionStatus.APPLIED] },
      },
      select: { substituteTeacherId: true },
    });
    const weeklySubMap = new Map<string, number>();
    for (const ws of weeklySubs) {
      weeklySubMap.set(ws.substituteTeacherId, (weeklySubMap.get(ws.substituteTeacherId) ?? 0) + 1);
    }

    const candidates: Array<{
      teacherId: string;
      teacherName: string;
      score: number;
      reasons: string[];
    }> = [];

    for (const teacher of teachers) {
      if (teacher.id === schedule.teacher.id) continue;
      if (busyTeacherIds.has(teacher.id)) continue;

      let score = 0;
      const reasons: string[] = [];

      if (teachesSubjectAndClass.has(teacher.id)) {
        score += 50;
        reasons.push('Shu fan va sinf');
      } else if (teachesSubject.has(teacher.id)) {
        score += 30;
        reasons.push('Shu fan');
      }

      if (teacher.branchId === schedule.branchId) {
        score += 20;
        reasons.push('Shu filial');
      }

      const dailyLoad = dailyLoadMap.get(teacher.id) ?? 0;
      if (dailyLoad === 0) {
        score += 25;
        reasons.push('Bugun bo\'sh');
      } else if (dailyLoad <= 3) {
        score += 15;
        reasons.push('Yuklamasi past');
      } else if (dailyLoad <= 5) {
        score += 5;
      } else {
        score -= 20;
        reasons.push('Juda band');
      }

      const weeklySubCount = weeklySubMap.get(teacher.id) ?? 0;
      if (weeklySubCount >= 3) {
        score -= 15;
        reasons.push('Haftada 3+ almashtirish');
      } else if (weeklySubCount >= 1) {
        score -= 5;
      }

      const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 1) {
        score -= 10;
        reasons.push('Tez orada');
      }

      score = Math.max(0, Math.min(100, score));
      if (score > 0) {
        candidates.push({
          teacherId: teacher.id,
          teacherName: `${teacher.firstName} ${teacher.lastName}`,
          score,
          reasons,
        });
      }
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  // ── Room swap options ──────────────────────────────────────────────────────

  private async findRoomSwapOptions(
    schedule: any,
    dateStr: string,
    schoolId: string,
  ): Promise<RepairOption[]> {
    const date = new Date(dateStr);
    const isoWeek = getISOWeek(date);
    const isNumeratorWeek = isoWeek % 2 === 1;

    // Find rooms that are free at this slot
    const allRooms = await this.prisma.room.findMany({
      where: { schoolId, branchId: schedule.branchId, isActive: true },
      select: { id: true, name: true, capacity: true },
    });

    const occupiedRoomIds = new Set<string>();
    const occupied = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        branchId: schedule.branchId,
        status: ScheduleStatus.PUBLISHED,
        dayOfWeek: schedule.dayOfWeek,
        timeSlot: schedule.timeSlot,
        roomId: { not: null },
      },
      select: { roomId: true, weekType: true },
    });
    for (const o of occupied) {
      if (o.weekType === WeekType.ALL) occupiedRoomIds.add(o.roomId!);
      else if (o.weekType === WeekType.NUMERATOR && isNumeratorWeek) occupiedRoomIds.add(o.roomId!);
      else if (o.weekType === WeekType.DENOMINATOR && !isNumeratorWeek) occupiedRoomIds.add(o.roomId!);
    }

    const options: RepairOption[] = [];
    for (const room of allRooms) {
      if (occupiedRoomIds.has(room.id)) continue;
      if (room.id === schedule.roomId) continue;

      const score = room.capacity >= 20 ? 70 : 50;
      options.push({
        id: randomUUID(),
        type: 'room_swap',
        score,
        impact: 'low',
        confidence: 0.8,
        explanation: `${room.name} xonasi bu vaqtda bo'sh (sig'imi ${room.capacity})`,
        requiredActions: ['Xona almashtirishni tasdiqlash', 'Jadvalni yangilash (tahlil rejimida)'],
        payload: {
          scheduleId: schedule.id,
          date: dateStr,
          newRoomId: room.id,
          originalRoomId: schedule.roomId,
        },
      });
    }

    return options.sort((a, b) => b.score - a.score).slice(0, 3);
  }

  // ── Reschedule options ─────────────────────────────────────────────────────

  private async findRescheduleOptions(
    schedule: any,
    dateStr: string,
    schoolId: string,
  ): Promise<RepairOption[]> {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const options: RepairOption[] = [];

    // Simple: find another day where teacher, class, and room are all free at same timeSlot
    for (const day of dayNames) {
      if (day === schedule.dayOfWeek) continue;

      // Check teacher conflict
      const teacherConflict = await this.prisma.schedule.findFirst({
        where: {
          schoolId,
          teacherId: schedule.teacherId,
          status: ScheduleStatus.PUBLISHED,
          dayOfWeek: day as any,
          timeSlot: schedule.timeSlot,
        },
      });
      if (teacherConflict) continue;

      // Check class conflict
      const classConflict = await this.prisma.schedule.findFirst({
        where: {
          schoolId,
          classId: schedule.classId,
          status: ScheduleStatus.PUBLISHED,
          dayOfWeek: day as any,
          timeSlot: schedule.timeSlot,
        },
      });
      if (classConflict) continue;

      // Check room conflict if room assigned
      let roomConflict: any = null;
      if (schedule.roomId) {
        roomConflict = await this.prisma.schedule.findFirst({
          where: {
            schoolId,
            roomId: schedule.roomId,
            status: ScheduleStatus.PUBLISHED,
            dayOfWeek: day as any,
            timeSlot: schedule.timeSlot,
          },
        });
      }
      if (roomConflict) continue;

      options.push({
        id: randomUUID(),
        type: 'reschedule_lesson',
        score: 60,
        impact: 'medium',
        confidence: 0.7,
        explanation: `${day} kuniga ${schedule.timeSlot}-slotga ko'chirish (o'qituvchi, sinf va xona bo'sh)`,
        requiredActions: ['Ko\'chirishni tasdiqlash', 'O\'quvchilarga xabar berish'],
        payload: {
          scheduleId: schedule.id,
          date: dateStr,
          newDayOfWeek: day,
          newTimeSlot: schedule.timeSlot,
        },
      });

      if (options.length >= 3) break;
    }

    return options;
  }

  // ── Teacher swap options ───────────────────────────────────────────────────

  private async findTeacherSwapOptions(
    schedule: any,
    dateStr: string,
    schoolId: string,
    branchId?: string | null,
  ): Promise<RepairOption[]> {
    const date = new Date(dateStr);
    const isoWeek = getISOWeek(date);
    const isNumeratorWeek = isoWeek % 2 === 1;

    // Find another published schedule at same day/slot where the other teacher could teach this subject
    const sameSlotSchedules = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        status: ScheduleStatus.PUBLISHED,
        dayOfWeek: schedule.dayOfWeek,
        timeSlot: schedule.timeSlot,
        id: { not: schedule.id },
        ...(branchId ? { branchId } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const options: RepairOption[] = [];

    for (const other of sameSlotSchedules) {
      // Check weekType match
      let weekTypeMatch = false;
      if (schedule.weekType === WeekType.ALL || other.weekType === WeekType.ALL) weekTypeMatch = true;
      else if (schedule.weekType === other.weekType) weekTypeMatch = true;
      if (!weekTypeMatch) continue;

      // Can other teacher teach our subject?
      const canTeachOurSubject = await this.prisma.teachingLoad.findFirst({
        where: { teacherId: other.teacherId, subjectId: schedule.subjectId },
      });
      // Can our teacher teach other's subject?
      const canTeachTheirSubject = await this.prisma.teachingLoad.findFirst({
        where: { teacherId: schedule.teacherId, subjectId: other.subjectId },
      });

      if (!canTeachOurSubject || !canTeachTheirSubject) continue;

      // Check neither is on leave
      const ourTeacherOnLeave = await this.prisma.leaveRequest.findFirst({
        where: {
          requesterId: schedule.teacherId,
          status: 'approved',
          startDate: { lte: date },
          endDate: { gte: date },
        },
      });
      const otherTeacherOnLeave = await this.prisma.leaveRequest.findFirst({
        where: {
          requesterId: other.teacherId,
          status: 'approved',
          startDate: { lte: date },
          endDate: { gte: date },
        },
      });
      if (ourTeacherOnLeave || otherTeacherOnLeave) continue;

      options.push({
        id: randomUUID(),
        type: 'teacher_swap',
        score: 65,
        impact: 'medium',
        confidence: 0.6,
        explanation: `${other.teacher.firstName} ${other.teacher.lastName} bilan almashish (${other.subject?.name}, ${other.class?.name})`,
        requiredActions: ['Ikkala o\'qituvchining roziligini olish', 'Jadvalni yangilash (tahlil rejimida)'],
        payload: {
          scheduleId: schedule.id,
          date: dateStr,
          swapScheduleId: other.id,
          swapTeacherId: other.teacherId,
        },
      });

      if (options.length >= 3) break;
    }

    return options;
  }

  // ── Apply ──────────────────────────────────────────────────────────────────

  async apply(input: ApplyRepairInput, currentUser: JwtPayload) {
    this.assertCanManage(currentUser);

    const schoolId = currentUser.schoolId!;

    // Verify schedule exists and is accessible
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id: input.scheduleId,
        schoolId,
        ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      },
    });
    if (!schedule) throw new NotFoundException('Dars sloti topilmadi');

    if (input.type === 'substitute_teacher') {
      if (!input.substituteTeacherId) {
        throw new BadRequestException('Almashtiruvchi o\'qituvchi ID kerak');
      }

      // Create proposed substitution directly
      const existing = await this.prisma.teacherSubstitution.findFirst({
        where: {
          scheduleId: input.scheduleId,
          date: new Date(input.date),
          status: { not: SubstitutionStatus.REJECTED },
        },
      });
      if (existing) {
        throw new BadRequestException('Bu slot uchun allaqachon almashtirish mavjud');
      }

      const sub = await this.prisma.teacherSubstitution.create({
        data: {
          schoolId,
          branchId: schedule.branchId,
          scheduleId: input.scheduleId,
          originalTeacherId: schedule.teacherId,
          substituteTeacherId: input.substituteTeacherId,
          date: new Date(input.date),
          status: SubstitutionStatus.APPROVED,
          reason: 'Jadval ta\'mirlash (ScheduleRepair)',
          approvedById: currentUser.sub,
          approvedAt: new Date(),
        },
      });

      return {
        applied: true,
        type: input.type,
        substitutionId: sub.id,
        message: 'Almashtirish tasdiqlandi va qo\'llandi',
      };
    }

    // Other repair types are analyze-only for Phase 5B.4
    throw new BadRequestException(
      `Bu turdagi ta'mirlash (${input.type}) hozircha faqat tahlil rejimida mavjud. Almashtirish o'qituvchi variantini tanlang.`
    );
  }
}
