import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  JwtPayload, UserRole, ScheduleStatus, WeekType, SubstitutionStatus,
} from '@eduplatform/types';
import { getISOWeek } from '@/common/utils/week-type.util';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

// ─── Query DTOs ──────────────────────────────────────────────────────────────

export interface AnalyticsQuery {
  weekType?: WeekType;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// ─── Output types ────────────────────────────────────────────────────────────

export interface TeacherUtilization {
  teacherId: string;
  teacherName: string;
  scheduledSlots: number;
  contractualHours: number;
  utilizationPct: number;
  status: 'underloaded' | 'balanced' | 'overloaded';
  subjects: string[];
}

export interface RoomUtilization {
  roomId: string;
  roomName: string;
  capacity: number;
  occupiedSlots: number;
  totalSlots: number;
  utilizationPct: number;
}

export interface ScheduleDensity {
  dayOfWeek: string;
  timeSlot: number;
  scheduleCount: number;
  classCount: number;
  teacherCount: number;
}

export interface AbsenceSubstitutionAnalytics {
  totalAttendanceRecords: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  lateCount: number;
  substitutedCount: number;
  absenceRatePct: number;
  substitutionFillRatePct: number;
  proposedCount: number;
  approvedCount: number;
  appliedCount: number;
  weeklyTrend: Array<{
    weekStart: string;
    absences: number;
    substitutions: number;
  }>;
}

export interface SolverQualityMetrics {
  totalRuns: number;
  successRatePct: number;
  avgPlacementPct: number;
  avgDurationMs: number | null;
  bestScore: number | null;
  recentRuns: Array<{
    id: string;
    strategy: string;
    status: string;
    placedCount: number;
    demandsCount: number;
    score: number | null;
    createdAt: string;
  }>;
}

export interface PayrollVariance {
  teacherId: string;
  teacherName: string;
  scheduledHours: number;
  completedHours: number;
  varianceHours: number;
  variancePct: number;
  source: string | null;
  payrollStatus: string;
}

export interface TimetableOverview {
  teacherCount: number;
  avgTeacherUtilizationPct: number;
  roomCount: number;
  avgRoomUtilizationPct: number;
  totalPublishedSlots: number;
  totalClasses: number;
  absenceRatePct: number;
  substitutionFillRatePct: number;
  solverSuccessRatePct: number;
  payrollVarianceAvgPct: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

const TEACHER_ROLES = ['teacher', 'class_teacher'];

@Injectable()
export class TimetableAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private assertCanView(currentUser: JwtPayload) {
    const allowed = [
      UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN,
      UserRole.TEACHER, UserRole.CLASS_TEACHER, UserRole.ACCOUNTANT,
    ];
    if (!allowed.includes(currentUser.role)) {
      throw new ForbiddenException('Ruxsat yo\'q');
    }
  }

  private buildScheduleWhere(currentUser: JwtPayload, query: AnalyticsQuery) {
    const where: any = {
      schoolId: currentUser.schoolId!,
      status: ScheduleStatus.PUBLISHED,
      ...(currentUser.branchId ? { branchId: currentUser.branchId } : {}),
      ...(query.branchId && currentUser.role !== UserRole.BRANCH_ADMIN
        ? { branchId: query.branchId }
        : {}),
      ...(query.weekType ? { weekType: query.weekType } : {}),
    };
    return where;
  }

  // ── 1. Teacher Utilization ─────────────────────────────────────────────────

  async getTeacherUtilization(currentUser: JwtPayload, query: AnalyticsQuery): Promise<TeacherUtilization[]> {
    this.assertCanView(currentUser);

    const schoolId = currentUser.schoolId!;
    const branchId = currentUser.branchId ?? query.branchId;

    // Active teachers
    const teachers = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: TEACHER_ROLES as any },
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      select: { id: true, firstName: true, lastName: true, branchId: true },
    });

    if (teachers.length === 0) return [];

    const teacherIds = teachers.map(t => t.id);

    // Published schedules for these teachers
    const schedules = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        teacherId: { in: teacherIds },
        status: ScheduleStatus.PUBLISHED,
        ...(branchId ? { branchId } : {}),
        ...(query.weekType ? { weekType: query.weekType } : {}),
      },
      select: {
        teacherId: true,
        weekType: true,
        subject: { select: { name: true } },
      },
    });

    // Staff salaries for contractual hours
    const salaries = await this.prisma.staffSalary.findMany({
      where: { userId: { in: teacherIds }, isActive: true },
      select: { userId: true, weeklyLessonHours: true },
    });
    const salaryMap = new Map(salaries.map(s => [s.userId, s.weeklyLessonHours ?? 18]));

    // Count slots per teacher respecting weekType
    const slotMap = new Map<string, { count: number; subjects: Set<string> }>();
    for (const s of schedules) {
      const entry = slotMap.get(s.teacherId) ?? { count: 0, subjects: new Set<string>() };
      // Each published schedule slot counts as 1 per week
      if (s.weekType === WeekType.ALL) {
        entry.count += 1;
      } else {
        entry.count += 0.5; // numerator/denominator = every other week
      }
      if (s.subject?.name) entry.subjects.add(s.subject.name);
      slotMap.set(s.teacherId, entry);
    }

    return teachers.map(t => {
      const entry = slotMap.get(t.id) ?? { count: 0, subjects: new Set<string>() };
      const scheduledSlots = entry.count;
      const contractualHours = salaryMap.get(t.id) ?? 18;
      const utilizationPct = contractualHours > 0
        ? Math.round((scheduledSlots / contractualHours) * 100)
        : 0;

      let status: 'underloaded' | 'balanced' | 'overloaded' = 'balanced';
      if (utilizationPct < 80) status = 'underloaded';
      else if (utilizationPct > 110) status = 'overloaded';

      return {
        teacherId: t.id,
        teacherName: `${t.firstName} ${t.lastName}`,
        scheduledSlots,
        contractualHours,
        utilizationPct,
        status,
        subjects: Array.from(entry.subjects),
      };
    });
  }

  // ── 2. Room Utilization ────────────────────────────────────────────────────

  async getRoomUtilization(currentUser: JwtPayload, query: AnalyticsQuery): Promise<RoomUtilization[]> {
    this.assertCanView(currentUser);

    const schoolId = currentUser.schoolId!;
    const branchId = currentUser.branchId ?? query.branchId;

    const rooms = await this.prisma.room.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      select: { id: true, name: true, capacity: true },
    });

    if (rooms.length === 0) return [];

    const roomIds = rooms.map(r => r.id);

    // Count published schedules per room
    const schedules = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        roomId: { in: roomIds },
        status: ScheduleStatus.PUBLISHED,
        ...(branchId ? { branchId } : {}),
        ...(query.weekType ? { weekType: query.weekType } : {}),
      },
      select: { roomId: true, weekType: true },
    });

    // Total available slots = periods per branch * 5 school days
    const periods = await this.prisma.period.findMany({
      where: {
        schoolId,
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      select: { branchId: true },
    });
    const periodCount = periods.length || 7; // fallback
    const totalSlotsPerWeek = periodCount * 5; // mon-fri

    const occupiedMap = new Map<string, number>();
    for (const s of schedules) {
      if (!s.roomId) continue;
      const current = occupiedMap.get(s.roomId) ?? 0;
      if (s.weekType === WeekType.ALL) {
        occupiedMap.set(s.roomId, current + 1);
      } else {
        occupiedMap.set(s.roomId, current + 0.5);
      }
    }

    return rooms.map(r => {
      const occupiedSlots = occupiedMap.get(r.id) ?? 0;
      const utilizationPct = totalSlotsPerWeek > 0
        ? Math.round((occupiedSlots / totalSlotsPerWeek) * 100)
        : 0;
      return {
        roomId: r.id,
        roomName: r.name,
        capacity: r.capacity,
        occupiedSlots,
        totalSlots: totalSlotsPerWeek,
        utilizationPct,
      };
    });
  }

  // ── 3. Schedule Density ────────────────────────────────────────────────────

  async getScheduleDensity(currentUser: JwtPayload, query: AnalyticsQuery): Promise<ScheduleDensity[]> {
    this.assertCanView(currentUser);

    const where = this.buildScheduleWhere(currentUser, query);

    const schedules = await this.prisma.schedule.findMany({
      where,
      select: {
        dayOfWeek: true,
        timeSlot: true,
        classId: true,
        teacherId: true,
      },
    });

    const densityMap = new Map<string, ScheduleDensity & { classes: Set<string>; teachers: Set<string> }>();

    for (const s of schedules) {
      const key = `${s.dayOfWeek}:${s.timeSlot}`;
      const existing = densityMap.get(key);
      if (existing) {
        existing.scheduleCount += 1;
        existing.classes.add(s.classId);
        existing.teachers.add(s.teacherId);
      } else {
        densityMap.set(key, {
          dayOfWeek: s.dayOfWeek,
          timeSlot: s.timeSlot,
          scheduleCount: 1,
          classCount: 1,
          teacherCount: 1,
          classes: new Set([s.classId]),
          teachers: new Set([s.teacherId]),
        });
      }
    }

    return Array.from(densityMap.values())
      .map(({ classes, teachers, ...rest }) => ({
        ...rest,
        classCount: classes.size,
        teacherCount: teachers.size,
      }))
      .sort((a, b) => {
        const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.timeSlot - b.timeSlot;
      });
  }

  // ── 4. Absence & Substitution Analytics ────────────────────────────────────

  async getAbsenceSubstitution(currentUser: JwtPayload, query: AnalyticsQuery): Promise<AbsenceSubstitutionAnalytics> {
    this.assertCanView(currentUser);

    const schoolId = currentUser.schoolId!;
    const branchId = currentUser.branchId ?? query.branchId;

    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = query.dateTo ? new Date(query.dateTo) : new Date();

    const attendanceWhere: any = {
      schoolId,
      date: { gte: dateFrom, lte: dateTo },
      ...(branchId ? { branchId } : {}),
    };

    const [totalAttendance, presentCount, absentCount, excusedCount, lateCount, substitutedCount] = await Promise.all([
      this.prisma.teacherAttendance.count({ where: attendanceWhere }),
      this.prisma.teacherAttendance.count({ where: { ...attendanceWhere, status: 'present' } }),
      this.prisma.teacherAttendance.count({ where: { ...attendanceWhere, status: 'absent' } }),
      this.prisma.teacherAttendance.count({ where: { ...attendanceWhere, status: 'excused' } }),
      this.prisma.teacherAttendance.count({ where: { ...attendanceWhere, status: 'late' } }),
      this.prisma.teacherAttendance.count({ where: { ...attendanceWhere, status: 'substituted' } }),
    ]);

    const subWhere: any = {
      schoolId,
      date: { gte: dateFrom, lte: dateTo },
      ...(branchId ? { branchId } : {}),
    };

    const [proposedCount, approvedCount, appliedCount] = await Promise.all([
      this.prisma.teacherSubstitution.count({ where: { ...subWhere, status: SubstitutionStatus.PROPOSED } }),
      this.prisma.teacherSubstitution.count({ where: { ...subWhere, status: SubstitutionStatus.APPROVED } }),
      this.prisma.teacherSubstitution.count({ where: { ...subWhere, status: SubstitutionStatus.APPLIED } }),
    ]);

    const totalNeeded = proposedCount + approvedCount + appliedCount;
    const filled = appliedCount;

    // Weekly trend
    const attendances = await this.prisma.teacherAttendance.findMany({
      where: attendanceWhere,
      select: { date: true, status: true },
      orderBy: { date: 'asc' },
    });

    const subs = await this.prisma.teacherSubstitution.findMany({
      where: subWhere,
      select: { date: true, status: true },
      orderBy: { date: 'asc' },
    });

    const weekMap = new Map<string, { absences: number; substitutions: number }>();
    for (const a of attendances) {
      if (a.status === 'absent' || a.status === 'excused') {
        const weekStart = this.getWeekStart(a.date);
        const key = weekStart.toISOString().split('T')[0];
        const entry = weekMap.get(key) ?? { absences: 0, substitutions: 0 };
        entry.absences += 1;
        weekMap.set(key, entry);
      }
    }
    for (const s of subs) {
      const weekStart = this.getWeekStart(s.date);
      const key = weekStart.toISOString().split('T')[0];
      const entry = weekMap.get(key) ?? { absences: 0, substitutions: 0 };
      entry.substitutions += 1;
      weekMap.set(key, entry);
    }

    const weeklyTrend = Array.from(weekMap.entries())
      .map(([weekStart, data]) => ({ weekStart, ...data }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

    return {
      totalAttendanceRecords: totalAttendance,
      presentCount,
      absentCount,
      excusedCount,
      lateCount,
      substitutedCount,
      absenceRatePct: totalAttendance > 0
        ? Math.round(((absentCount + excusedCount) / totalAttendance) * 100)
        : 0,
      substitutionFillRatePct: totalNeeded > 0
        ? Math.round((filled / totalNeeded) * 100)
        : 0,
      proposedCount,
      approvedCount,
      appliedCount,
      weeklyTrend,
    };
  }

  // ── 5. Solver Quality ──────────────────────────────────────────────────────

  async getSolverQuality(currentUser: JwtPayload, query: AnalyticsQuery): Promise<SolverQualityMetrics> {
    this.assertCanView(currentUser);

    const schoolId = currentUser.schoolId!;

    const runs = await this.prisma.solverRun.findMany({
      where: {
        schoolId,
        ...(query.branchId && currentUser.role !== UserRole.BRANCH_ADMIN
          ? { branchId: query.branchId }
          : currentUser.branchId
            ? { branchId: currentUser.branchId }
            : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, strategy: true, status: true,
        placedCount: true, demandsCount: true, score: true,
        createdAt: true, completedAt: true,
      },
    });

    const totalRuns = runs.length;
    if (totalRuns === 0) {
      return {
        totalRuns: 0, successRatePct: 0, avgPlacementPct: 0,
        avgDurationMs: null, bestScore: null, recentRuns: [],
      };
    }

    const successfulRuns = runs.filter(r => r.status === 'completed');
    const successRatePct = Math.round((successfulRuns.length / totalRuns) * 100);

    const avgPlacementPct = Math.round(
      runs.reduce((sum, r) => sum + (r.demandsCount > 0 ? (r.placedCount / r.demandsCount) * 100 : 0), 0) / totalRuns
    );

    const durations = runs
      .filter(r => r.completedAt)
      .map(r => new Date(r.completedAt!).getTime() - new Date(r.createdAt).getTime());
    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

    const scores = runs.map(r => r.score).filter((s): s is number => s !== null);
    const bestScore = scores.length > 0 ? Math.max(...scores) : null;

    return {
      totalRuns,
      successRatePct,
      avgPlacementPct,
      avgDurationMs,
      bestScore,
      recentRuns: runs.slice(0, 10).map(r => ({
        id: r.id,
        strategy: r.strategy,
        status: r.status,
        placedCount: r.placedCount,
        demandsCount: r.demandsCount,
        score: r.score,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  // ── 6. Payroll Variance ────────────────────────────────────────────────────

  async getPayrollVariance(currentUser: JwtPayload, query: AnalyticsQuery): Promise<PayrollVariance[]> {
    this.assertCanView(currentUser);

    const schoolId = currentUser.schoolId!;
    const branchId = currentUser.branchId ?? query.branchId;

    // Get current month draft payroll items
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const payroll = await this.prisma.monthlyPayroll.findFirst({
      where: {
        schoolId,
        month,
        year,
      },
      include: {
        items: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            staffSalary: { select: { branchId: true } },
          },
        },
      },
    });

    if (!payroll) return [];

    return payroll.items
      .filter(item => !branchId || item.staffSalary?.branchId === branchId)
      .map(item => {
        const varianceHours = item.completedHours - item.scheduledHours;
        const variancePct = item.scheduledHours > 0
          ? Math.round((varianceHours / item.scheduledHours) * 100)
          : 0;
        return {
          teacherId: item.userId,
          teacherName: `${item.user.firstName} ${item.user.lastName}`,
          scheduledHours: item.scheduledHours,
          completedHours: item.completedHours,
          varianceHours,
          variancePct,
          source: item.completedHoursSource,
          payrollStatus: payroll.status,
        };
      })
      .sort((a, b) => Math.abs(b.variancePct) - Math.abs(a.variancePct));
  }

  // ── 7. Overview ────────────────────────────────────────────────────────────

  async getOverview(currentUser: JwtPayload, query: AnalyticsQuery): Promise<TimetableOverview> {
    this.assertCanView(currentUser);

    const [teacherUtil, roomUtil, density, absenceSub, solverQuality, payrollVar] = await Promise.all([
      this.getTeacherUtilization(currentUser, query),
      this.getRoomUtilization(currentUser, query),
      this.getScheduleDensity(currentUser, query),
      this.getAbsenceSubstitution(currentUser, query),
      this.getSolverQuality(currentUser, query),
      this.getPayrollVariance(currentUser, query),
    ]);

    const avgTeacherUtil = teacherUtil.length > 0
      ? Math.round(teacherUtil.reduce((s, t) => s + t.utilizationPct, 0) / teacherUtil.length)
      : 0;

    const avgRoomUtil = roomUtil.length > 0
      ? Math.round(roomUtil.reduce((s, r) => s + r.utilizationPct, 0) / roomUtil.length)
      : 0;

    const payrollVarianceAvg = payrollVar.length > 0
      ? Math.round(payrollVar.reduce((s, p) => s + Math.abs(p.variancePct), 0) / payrollVar.length)
      : 0;

    return {
      teacherCount: teacherUtil.length,
      avgTeacherUtilizationPct: avgTeacherUtil,
      roomCount: roomUtil.length,
      avgRoomUtilizationPct: avgRoomUtil,
      totalPublishedSlots: density.reduce((s, d) => s + d.scheduleCount, 0),
      totalClasses: new Set(density.flatMap(d => [])).size, // approximate from schedules
      absenceRatePct: absenceSub.absenceRatePct,
      substitutionFillRatePct: absenceSub.substitutionFillRatePct,
      solverSuccessRatePct: solverQuality.successRatePct,
      payrollVarianceAvgPct: payrollVarianceAvg,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }
}
