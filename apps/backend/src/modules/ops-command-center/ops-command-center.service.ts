import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { JwtPayload, UserRole, ScheduleStatus, SubstitutionStatus, TeacherAttendanceStatus } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { getISOWeek, getCurrentWeekType } from '@/common/utils/week-type.util';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TodaySummary {
  date: string;
  schoolId: string;
  branchId?: string;
  stats: {
    totalClassesToday: number;
    totalTeachersToday: number;
    periodsConfigured: boolean;
    roomsConfigured: boolean;
  };
  schedule: {
    publishedSlots: number;
    draftSlots: number;
    conflicts: number;
  };
  staff: {
    teachersPresent: number;
    teachersAbsent: number;
    teachersSubstituted: number;
    pendingLeaveRequests: number;
  };
  substitutions: {
    pendingProposals: number;
    activeToday: number;
  };
  payroll: {
    currentMonthStatus: 'draft' | 'generated' | 'approved' | 'paid' | 'missing';
    missingAttendanceCount: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
}

export interface OpsAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'schedule' | 'staff' | 'payroll' | 'setup' | 'finance';
  title: string;
  description: string;
  entityId?: string;
  entityType?: string;
  link?: string;
  createdAt: string;
  /** Who must act on this alert */
  owner: UserRole | 'director' | 'vice_principal' | 'branch_admin' | 'accountant';
  /** CTA label shown to the owner */
  actionCta: string;
  /** Frontend route to resolve */
  route: string;
  /** Resolution state: open | in_progress | resolved */
  resolutionState: 'open' | 'in_progress' | 'resolved';
}

export interface ReadinessItem {
  id: string;
  label: string;
  category: 'setup' | 'schedule' | 'staff' | 'payroll';
  weight: number;
  completed: boolean;
  required: boolean;
  link?: string;
  /** Primary owner — must complete this item */
  primaryOwner: UserRole;
  /** Secondary owner — can complete if primary is unavailable */
  secondaryOwner?: UserRole;
  /** Who can see this item in their dashboard */
  visibilityScope: UserRole[];
}

export interface ReadinessScore {
  score: number;
  status: 'not_started' | 'in_progress' | 'ready' | 'operational';
  checklist: ReadinessItem[];
}

export interface RoleReadinessView {
  myActions: ReadinessItem[];
  delegatedActions: ReadinessItem[];
  informationalBlockers: ReadinessItem[];
  score: number;
  status: ReadinessScore['status'];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const READINESS_CACHE_TTL_SECONDS = 300; // 5 minutes

const READINESS_CHECKLIST: Omit<ReadinessItem, 'completed'>[] = [
  {
    id: 'schoolProfile',
    label: 'Maktab profili to\'liq',
    category: 'setup',
    weight: 10,
    required: true,
    link: '/dashboard/settings',
    primaryOwner: UserRole.DIRECTOR,
    secondaryOwner: UserRole.VICE_PRINCIPAL,
    visibilityScope: [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN],
  },
  {
    id: 'branches',
    label: 'Kamida 1 ta filial',
    category: 'setup',
    weight: 10,
    required: true,
    link: '/dashboard/branches',
    primaryOwner: UserRole.DIRECTOR,
    secondaryOwner: UserRole.VICE_PRINCIPAL,
    visibilityScope: [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN],
  },
  {
    id: 'periods',
    label: 'Dars soatlari sozlangan',
    category: 'setup',
    weight: 15,
    required: true,
    link: '/dashboard/periods',
    primaryOwner: UserRole.BRANCH_ADMIN,
    secondaryOwner: UserRole.VICE_PRINCIPAL,
    visibilityScope: [UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.DIRECTOR],
  },
  {
    id: 'rooms',
    label: 'Kamida 1 ta xona',
    category: 'setup',
    weight: 10,
    required: true,
    link: '/dashboard/rooms',
    primaryOwner: UserRole.BRANCH_ADMIN,
    secondaryOwner: UserRole.VICE_PRINCIPAL,
    visibilityScope: [UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.DIRECTOR],
  },
  {
    id: 'classes',
    label: 'Kamida 1 ta sinf',
    category: 'setup',
    weight: 15,
    required: true,
    link: '/dashboard/classes',
    primaryOwner: UserRole.BRANCH_ADMIN,
    secondaryOwner: UserRole.VICE_PRINCIPAL,
    visibilityScope: [UserRole.BRANCH_ADMIN, UserRole.VICE_PRINCIPAL, UserRole.DIRECTOR],
  },
  {
    id: 'subjects',
    label: 'Kamida 1 ta fan',
    category: 'setup',
    weight: 15,
    required: true,
    link: '/dashboard/subjects',
    primaryOwner: UserRole.VICE_PRINCIPAL,
    secondaryOwner: UserRole.BRANCH_ADMIN,
    visibilityScope: [UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.DIRECTOR],
  },
  {
    id: 'teachingLoads',
    label: 'Dars yuklari biriktirilgan',
    category: 'setup',
    weight: 15,
    required: true,
    link: '/dashboard/teaching-loads',
    primaryOwner: UserRole.VICE_PRINCIPAL,
    secondaryOwner: UserRole.BRANCH_ADMIN,
    visibilityScope: [UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.DIRECTOR],
  },
  {
    id: 'publishedTimetable',
    label: 'Jadval nashr etilgan',
    category: 'schedule',
    weight: 10,
    required: false,
    link: '/dashboard/schedule',
    primaryOwner: UserRole.VICE_PRINCIPAL,
    secondaryOwner: UserRole.BRANCH_ADMIN,
    visibilityScope: [UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN, UserRole.DIRECTOR, UserRole.TEACHER, UserRole.CLASS_TEACHER],
  },
];

const DAY_OF_WEEK_MAP: Record<number, string> = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class OpsCommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── RBAC Helpers ──────────────────────────────────────────────────────────

  private assertCanView(user: JwtPayload): void {
    const forbidden = [UserRole.STUDENT, UserRole.PARENT];
    if (forbidden.includes(user.role as UserRole)) {
      throw new ForbiddenException('Bu amalni bajarish uchun yetarli huquq yo\'q');
    }
  }

  private buildWhere(user: JwtPayload, explicitBranchId?: string) {
    const tenant = buildTenantWhere(user);
    const where: any = { schoolId: tenant.schoolId };

    if (user.role === UserRole.BRANCH_ADMIN && user.branchId) {
      where.branchId = user.branchId;
    } else if (explicitBranchId) {
      where.branchId = explicitBranchId;
    } else if (tenant.branchId) {
      where.branchId = tenant.branchId;
    }

    return where;
  }

  // ─── Today Summary ─────────────────────────────────────────────────────────

  async getTodaySummary(user: JwtPayload, branchId?: string): Promise<TodaySummary> {
    this.assertCanView(user);
    const schoolId = user.schoolId!;
    const where = this.buildWhere(user, branchId);

    const today = new Date();
    const dayOfWeek = DAY_OF_WEEK_MAP[today.getDay()] ?? 'monday';
    const currentWeek = getISOWeek(today);
    const weekType = getCurrentWeekType();
    const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1); // e.g. 202605

    // Parallel aggregation queries
    const [
      periodsCount,
      roomsCount,
      classesCount,
      publishedSlots,
      draftSlots,
      teachersPresent,
      teachersAbsent,
      teachersSubstituted,
      pendingLeaves,
      pendingProposals,
      activeSubstitutions,
      payrollRecord,
      missingAttendance,
    ] = await Promise.all([
      this.prisma.period.count({ where: { schoolId, ...(branchId ? { branchId } : {}) } }),
      this.prisma.room.count({ where: { schoolId, ...(branchId ? { branchId } : {}) } }),
      this.prisma.class.count({ where }),
      this.prisma.schedule.count({
        where: { ...where, dayOfWeek: dayOfWeek as any, status: ScheduleStatus.PUBLISHED },
      }),
      this.prisma.schedule.count({
        where: { ...where, dayOfWeek: dayOfWeek as any, status: ScheduleStatus.DRAFT },
      }),
      this.prisma.teacherAttendance.count({
        where: { ...where, date: { gte: new Date(today.toISOString().split('T')[0]), lt: new Date(today.getTime() + 86400000) }, status: TeacherAttendanceStatus.PRESENT },
      }),
      this.prisma.teacherAttendance.count({
        where: { ...where, date: { gte: new Date(today.toISOString().split('T')[0]), lt: new Date(today.getTime() + 86400000) }, status: TeacherAttendanceStatus.ABSENT },
      }),
      this.prisma.teacherAttendance.count({
        where: { ...where, date: { gte: new Date(today.toISOString().split('T')[0]), lt: new Date(today.getTime() + 86400000) }, status: TeacherAttendanceStatus.SUBSTITUTED },
      }),
      this.prisma.leaveRequest.count({
        where: { schoolId, status: 'pending', ...(branchId ? { branchId } : {}) },
      }),
      this.prisma.teacherSubstitution.count({
        where: { schoolId, status: SubstitutionStatus.PROPOSED, ...(branchId ? { branchId } : {}) },
      }),
      this.prisma.teacherSubstitution.count({
        where: {
          schoolId,
          status: { in: [SubstitutionStatus.APPROVED, SubstitutionStatus.APPLIED] },
          ...(branchId ? { branchId } : {}),
        },
      }),
      this.prisma.monthlyPayroll.findFirst({
        where: { schoolId, month: currentMonth },
        orderBy: { createdAt: 'desc' },
        select: { status: true },
      }),
      this.getMissingAttendanceCount(where, today),
    ]);

    // Count conflicts in draft schedules (simple heuristic: same class/teacher/room at same time)
    const conflicts = await this.countDraftConflicts(where, dayOfWeek);

    const alerts = await this.getAlerts(user, branchId);

    return {
      date: today.toISOString().split('T')[0],
      schoolId,
      branchId: branchId || (user.role === UserRole.BRANCH_ADMIN ? user.branchId ?? undefined : undefined),
      stats: {
        totalClassesToday: classesCount,
        totalTeachersToday: teachersPresent + teachersAbsent + teachersSubstituted,
        periodsConfigured: periodsCount > 0,
        roomsConfigured: roomsCount > 0,
      },
      schedule: {
        publishedSlots,
        draftSlots,
        conflicts,
      },
      staff: {
        teachersPresent,
        teachersAbsent,
        teachersSubstituted,
        pendingLeaveRequests: pendingLeaves,
      },
      substitutions: {
        pendingProposals,
        activeToday: activeSubstitutions,
      },
      payroll: {
        currentMonthStatus: payrollRecord?.status ?? 'missing',
        missingAttendanceCount: missingAttendance,
      },
      alerts: {
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        info: alerts.filter(a => a.severity === 'info').length,
      },
    };
  }

  // ─── Alerts ────────────────────────────────────────────────────────────────

  async getAlerts(user: JwtPayload, branchId?: string): Promise<OpsAlert[]> {
    this.assertCanView(user);
    const schoolId = user.schoolId!;
    const where = this.buildWhere(user, branchId);
    const alerts: OpsAlert[] = [];

    // Setup checks
    const [periodsCount, roomsCount, classesCount, subjectsCount, teachingLoadsCount, publishedSchedules] = await Promise.all([
      this.prisma.period.count({ where: { schoolId, ...(branchId ? { branchId } : {}) } }),
      this.prisma.room.count({ where: { schoolId, ...(branchId ? { branchId } : {}) } }),
      this.prisma.class.count({ where }),
      this.prisma.subject.count({ where }),
      this.prisma.teachingLoad.count({ where }),
      this.prisma.schedule.count({ where: { ...where, status: ScheduleStatus.PUBLISHED } }),
    ]);

    if (periodsCount === 0) {
      alerts.push({
        id: 'setup:periods',
        severity: 'critical',
        category: 'setup',
        title: 'Dars soatlari sozlanmagan',
        description: 'Dars jadvali yaratish uchun kamida 1 ta dars soati sozlashingiz kerak.',
        link: '/dashboard/periods',
        createdAt: new Date().toISOString(),
        owner: 'branch_admin',
        actionCta: 'Dars soatlarini sozlash',
        route: '/dashboard/periods',
        resolutionState: 'open',
      });
    }

    if (roomsCount === 0) {
      alerts.push({
        id: 'setup:rooms',
        severity: 'warning',
        category: 'setup',
        title: 'Xonalar ro\'yxati bo\'sh',
        description: 'Dars o\'tkazish uchun xonalarni qo\'shing.',
        link: '/dashboard/rooms',
        createdAt: new Date().toISOString(),
        owner: 'branch_admin',
        actionCta: 'Xona qo\'shish',
        route: '/dashboard/rooms',
        resolutionState: 'open',
      });
    }

    if (classesCount === 0) {
      alerts.push({
        id: 'setup:classes',
        severity: 'critical',
        category: 'setup',
        title: 'Sinflar yaratilmagan',
        description: 'O\'quv jarayonini boshlash uchun sinflar yaratishingiz kerak.',
        link: '/dashboard/classes',
        createdAt: new Date().toISOString(),
        owner: 'branch_admin',
        actionCta: 'Sinf yaratish',
        route: '/dashboard/classes',
        resolutionState: 'open',
      });
    }

    if (subjectsCount === 0) {
      alerts.push({
        id: 'setup:subjects',
        severity: 'critical',
        category: 'setup',
        title: 'Fanlar kiritilmagan',
        description: 'O\'quv dasturini belgilash uchun fanlarni qo\'shing.',
        link: '/dashboard/subjects',
        createdAt: new Date().toISOString(),
        owner: 'vice_principal',
        actionCta: 'Fan qo\'shish',
        route: '/dashboard/subjects',
        resolutionState: 'open',
      });
    }

    if (subjectsCount > 0 && teachingLoadsCount === 0) {
      alerts.push({
        id: 'setup:teachingLoads',
        severity: 'warning',
        category: 'setup',
        title: 'Dars yuklari biriktirilmagan',
        description: 'Fanlarga o\'qituvchilarni biriktirish kerak.',
        link: '/dashboard/teaching-loads',
        createdAt: new Date().toISOString(),
        owner: 'vice_principal',
        actionCta: 'Dars yuklarini biriktirish',
        route: '/dashboard/teaching-loads',
        resolutionState: 'open',
      });
    }

    if (publishedSchedules === 0 && (await this.prisma.schedule.count({ where })) > 0) {
      alerts.push({
        id: 'schedule:unpublished',
        severity: 'warning',
        category: 'schedule',
        title: 'Jadval nashr etilmagan',
        description: 'Jadval qoralama holatida. O\'qituvchilar ko\'rishi uchun nashr eting.',
        link: '/dashboard/schedule',
        createdAt: new Date().toISOString(),
        owner: 'vice_principal',
        actionCta: 'Jadvalni nashr etish',
        route: '/dashboard/schedule',
        resolutionState: 'open',
      });
    }

    // Staff alerts
    const today = new Date();
    const todayStart = new Date(today.toISOString().split('T')[0]);
    const todayEnd = new Date(todayStart.getTime() + 86400000);

    const [absentWithoutSub, pendingLeaves] = await Promise.all([
      this.prisma.teacherAttendance.count({
        where: {
          ...where,
          date: { gte: todayStart, lt: todayEnd },
          status: TeacherAttendanceStatus.ABSENT,
        },
      }),
      this.prisma.leaveRequest.count({
        where: { schoolId, status: 'pending', ...(branchId ? { branchId } : {}) },
      }),
    ]);

    if (absentWithoutSub > 0) {
      alerts.push({
        id: 'staff:absentWithoutSub',
        severity: 'critical',
        category: 'staff',
        title: `O\'rinbosarsiz o\'qituvchi yo\'qolishi (${absentWithoutSub})`,
        description: 'Bugun o\'rinbosar biriktirilmagan o\'qituvchilar mavjud.',
        link: '/dashboard/teacher-substitutions',
        createdAt: new Date().toISOString(),
        owner: 'branch_admin',
        actionCta: 'O\'rinbosar belgilash',
        route: '/dashboard/teacher-substitutions',
        resolutionState: 'open',
      });
    }

    if (pendingLeaves > 3) {
      alerts.push({
        id: 'staff:pendingLeaves',
        severity: 'warning',
        category: 'staff',
        title: `${pendingLeaves} ta tasdiqlanmagan ta'til so'rovi`,
        description: 'Ko\'p sondagi ta\'til so\'rovlarini ko\'rib chiqing.',
        link: '/dashboard/leave-requests',
        createdAt: new Date().toISOString(),
        owner: 'vice_principal',
        actionCta: 'So\'rovlarni ko\'rib chiqish',
        route: '/dashboard/leave-requests',
        resolutionState: 'open',
      });
    }

    // Payroll alerts
    const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1); // e.g. 202605
    const payrollRecord = await this.prisma.monthlyPayroll.findFirst({
      where: { schoolId, month: currentMonth },
      orderBy: { createdAt: 'desc' },
    });

    if (!payrollRecord) {
      alerts.push({
        id: 'payroll:missing',
        severity: 'warning',
        category: 'payroll',
        title: 'Joriy oy ish haqi hisoblanmagan',
        description: `Oyni yopish uchun ${currentMonth} ish haqini hisoblang.`,
        link: '/dashboard/payroll',
        createdAt: new Date().toISOString(),
        owner: 'accountant',
        actionCta: 'Ish haqini hisoblash',
        route: '/dashboard/payroll',
        resolutionState: 'open',
      });
    }

    const missingAttendance = await this.getMissingAttendanceCount(where, today);
    if (missingAttendance > 5) {
      alerts.push({
        id: 'payroll:missingAttendance',
        severity: 'warning',
        category: 'payroll',
        title: `${missingAttendance} ta davomat yozuvi yetishmayapti`,
        description: 'Ish haqi hisoblash uchun davomat yozuvlarini to\'ldiring.',
        link: '/dashboard/teacher-attendance',
        createdAt: new Date().toISOString(),
        owner: 'accountant',
        actionCta: 'Davomatni to\'ldirish',
        route: '/dashboard/teacher-attendance',
        resolutionState: 'open',
      });
    }

    // Filter alerts by role visibility
    const roleVisibleAlerts = alerts.filter(a => {
      if (user.role === UserRole.DIRECTOR) return true; // Director sees everything
      if (user.role === UserRole.VICE_PRINCIPAL) {
        return a.owner === 'vice_principal' || a.owner === 'branch_admin' || a.category === 'schedule' || a.category === 'staff';
      }
      if (user.role === UserRole.BRANCH_ADMIN) {
        return a.owner === 'branch_admin' || a.category === 'setup';
      }
      if (user.role === UserRole.ACCOUNTANT) {
        return a.owner === 'accountant' || a.category === 'payroll';
      }
      return false;
    });

    return roleVisibleAlerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ─── Readiness Score ───────────────────────────────────────────────────────

  async getReadinessScore(user: JwtPayload, schoolId: string): Promise<ReadinessScore> {
    this.assertCanView(user);
    if (user.role === UserRole.BRANCH_ADMIN && user.schoolId !== schoolId) {
      throw new ForbiddenException('Faqat o\'z maktabingiz uchun ko\'rishingiz mumkin');
    }

    const cacheKey = `ops:readiness:${schoolId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as ReadinessScore;
    }

    const score = await this.calculateReadiness(schoolId);
    await this.redis.setEx(cacheKey, READINESS_CACHE_TTL_SECONDS, JSON.stringify(score));
    return score;
  }

  async recalculateReadiness(user: JwtPayload, schoolId: string): Promise<ReadinessScore> {
    this.assertCanView(user);
    if (user.role === UserRole.BRANCH_ADMIN && user.schoolId !== schoolId) {
      throw new ForbiddenException('Faqat o\'z maktabingiz uchun ko\'rishingiz mumkin');
    }

    const cacheKey = `ops:readiness:${schoolId}`;
    await this.redis.del(cacheKey);

    const score = await this.calculateReadiness(schoolId);
    await this.redis.setEx(cacheKey, READINESS_CACHE_TTL_SECONDS, JSON.stringify(score));

    // Persist to School record
    await this.prisma.school.update({
      where: { id: schoolId },
      data: { readinessScore: score.score },
    });

    return score;
  }

  async getRoleReadiness(user: JwtPayload, schoolId: string): Promise<RoleReadinessView> {
    this.assertCanView(user);
    if (user.schoolId !== schoolId) {
      throw new ForbiddenException('Faqat o\'z maktabingiz uchun ko\'rishingiz mumkin');
    }

    const readiness = await this.getReadinessScore(user, schoolId);
    const userRole = user.role as UserRole;

    const myActions = readiness.checklist.filter(
      item => item.primaryOwner === userRole && !item.completed,
    );

    const delegatedActions = readiness.checklist.filter(
      item => item.secondaryOwner === userRole && !item.completed && item.primaryOwner !== userRole,
    );

    const informationalBlockers = readiness.checklist.filter(
      item =>
        item.visibilityScope.includes(userRole) &&
        !item.completed &&
        item.primaryOwner !== userRole &&
        item.secondaryOwner !== userRole,
    );

    return {
      myActions,
      delegatedActions,
      informationalBlockers,
      score: readiness.score,
      status: readiness.status,
    };
  }

  private async calculateReadiness(schoolId: string): Promise<ReadinessScore> {
    const today = new Date();
    const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1); // e.g. 202605

    const [
      school,
      branchesCount,
      periodsCount,
      roomsCount,
      classesCount,
      subjectsCount,
      teachingLoadsCount,
      publishedSchedules,
    ] = await Promise.all([
      this.prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, address: true, phone: true } }),
      this.prisma.branch.count({ where: { schoolId } }),
      this.prisma.period.count({ where: { schoolId } }),
      this.prisma.room.count({ where: { schoolId } }),
      this.prisma.class.count({ where: { schoolId } }),
      this.prisma.subject.count({ where: { schoolId } }),
      this.prisma.teachingLoad.count({ where: { schoolId } }),
      this.prisma.schedule.count({ where: { schoolId, status: ScheduleStatus.PUBLISHED } }),
    ]);

    const checks: Record<string, boolean> = {
      schoolProfile: !!(school?.name && school?.address && school?.phone),
      branches: branchesCount > 0,
      periods: periodsCount > 0,
      rooms: roomsCount > 0,
      classes: classesCount > 0,
      subjects: subjectsCount > 0,
      teachingLoads: teachingLoadsCount > 0,
      publishedTimetable: publishedSchedules > 0,
    };

    let score = 0;
    const checklist: ReadinessItem[] = READINESS_CHECKLIST.map(item => {
      const completed = checks[item.id] ?? false;
      if (completed) score += item.weight;
      return {
        ...item,
        completed,
      };
    });

    const allRequiredDone = checklist.filter(i => i.required).every(i => i.completed);

    let status: ReadinessScore['status'];
    if (score === 0) status = 'not_started';
    else if (score === 100) status = 'operational';
    else if (allRequiredDone) status = 'ready';
    else status = 'in_progress';

    return { score, status, checklist };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async getMissingAttendanceCount(where: any, date: Date): Promise<number> {
    // Find teachers who have published schedule slots today but no attendance record
    const dayOfWeek = DAY_OF_WEEK_MAP[date.getDay()] ?? 'monday';
    const dateStr = date.toISOString().split('T')[0];

    const scheduledTeachers = await this.prisma.schedule.findMany({
      where: { ...where, dayOfWeek: dayOfWeek as any, status: ScheduleStatus.PUBLISHED },
      select: { teacherId: true },
      distinct: ['teacherId'],
    });

    if (scheduledTeachers.length === 0) return 0;

    const teacherIds = scheduledTeachers.map(s => s.teacherId);

    const attendedTeachers = await this.prisma.teacherAttendance.findMany({
      where: {
        ...where,
        teacherId: { in: teacherIds },
        date: { gte: new Date(dateStr), lt: new Date(date.getTime() + 86400000) },
      },
      select: { teacherId: true },
    });

    const attendedSet = new Set(attendedTeachers.map(a => a.teacherId));
    return teacherIds.filter(id => !attendedSet.has(id)).length;
  }

  private async countDraftConflicts(where: any, dayOfWeek: string): Promise<number> {
    // Simple heuristic: count draft schedules that share same class+time or teacher+time
    const draftSchedules = await this.prisma.schedule.findMany({
      where: { ...where, dayOfWeek: dayOfWeek as any, status: ScheduleStatus.DRAFT },
      select: { classId: true, teacherId: true, roomId: true, timeSlot: true },
    });

    let conflicts = 0;
    const seen = new Set<string>();

    for (const s of draftSchedules) {
      const classKey = `${s.classId}:${s.timeSlot}`;
      const teacherKey = `${s.teacherId}:${s.timeSlot}`;
      const roomKey = s.roomId ? `${s.roomId}:${s.timeSlot}` : null;

      if (seen.has(classKey)) conflicts++;
      if (seen.has(teacherKey)) conflicts++;
      if (roomKey && seen.has(roomKey)) conflicts++;

      seen.add(classKey);
      seen.add(teacherKey);
      if (roomKey) seen.add(roomKey);
    }

    return conflicts;
  }
}
