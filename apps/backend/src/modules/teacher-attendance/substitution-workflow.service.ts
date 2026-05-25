import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole, SubstitutionStatus, ScheduleStatus, WeekType } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { AuditService } from '@/common/audit/audit.service';

export interface CandidateTeacher {
  teacherId: string;
  firstName: string;
  lastName: string;
  score: number;
  reasons: string[];
}

export interface AffectedScheduleSlot {
  scheduleId: string;
  date: string;
  dayOfWeek: string;
  timeSlot: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  roomName: string | null;
  branchName: string;
  weekType: string;
  existingSubstitutionId?: string;
  existingSubstitutionStatus?: string;
}

@Injectable()
export class SubstitutionWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ─── RBAC helpers ──────────────────────────────────────────────────────────

  private assertManager(currentUser: JwtPayload) {
    const allowed = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN];
    if (!allowed.includes(currentUser.role as any)) {
      throw new ForbiddenException("Bu amalni bajarish uchun yetarli huquq yo'q");
    }
  }

  private assertCanRead(currentUser: JwtPayload, originalTeacherId?: string, substituteTeacherId?: string) {
    if (currentUser.role === UserRole.STUDENT || currentUser.role === UserRole.PARENT) {
      throw new ForbiddenException('Ruxsat yoq');
    }
    if (currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLASS_TEACHER) {
      if (originalTeacherId && originalTeacherId !== currentUser.sub) {
        // Allow if they're the substitute teacher
        if (substituteTeacherId !== currentUser.sub) {
          throw new ForbiddenException("Faqat o'z ma'lumotlaringizni ko'rish mumkin");
        }
      }
    }
  }

  // ─── 1. Affected schedules ─────────────────────────────────────────────────

  async getAffectedSchedules(leaveRequestId: string, currentUser: JwtPayload) {
    const req = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, ...buildTenantWhere(currentUser) },
    });
    if (!req) throw new NotFoundException("So'rov topilmadi");

    const requester = await this.prisma.user.findUnique({
      where: { id: req.requesterId },
      select: { role: true, firstName: true, lastName: true },
    });
    const isTeacher = ['teacher', 'class_teacher'].includes(requester?.role ?? '');
    if (!isTeacher || !req.affectsSchedule) {
      return {
        leaveRequestId,
        teacherId: req.requesterId,
        teacherName: `${requester?.firstName ?? ''} ${requester?.lastName ?? ''}`.trim(),
        startDate: req.startDate.toISOString().split('T')[0],
        endDate: req.endDate.toISOString().split('T')[0],
        affectedCount: 0,
        affectedSlots: [],
      };
    }

    const start = new Date(req.startDate);
    const end = new Date(req.endDate);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        schoolId: req.schoolId,
        teacherId: req.requesterId,
        status: ScheduleStatus.PUBLISHED,
        ...(currentUser.role === UserRole.BRANCH_ADMIN ? { branchId: currentUser.branchId! } : {}),
      },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        room: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    // Get existing substitutions for this leave request
    const existingSubs = await this.prisma.teacherSubstitution.findMany({
      where: { leaveRequestId, schoolId: req.schoolId },
    });
    const subMap = new Map(existingSubs.map(s => [`${s.scheduleId}:${s.date.toISOString().split('T')[0]}`, s]));

    const affectedSlots: AffectedScheduleSlot[] = [];

    for (const s of schedules) {
      const scheduleDayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(s.dayOfWeek as string);
      if (scheduleDayIndex === -1) continue;

      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getDay() === scheduleDayIndex) {
          const isoWeek = this.getISOWeek(cur);
          const isNumeratorWeek = isoWeek % 2 === 1;

          let counts = false;
          if (s.weekType === WeekType.ALL) counts = true;
          else if (s.weekType === WeekType.NUMERATOR && isNumeratorWeek) counts = true;
          else if (s.weekType === WeekType.DENOMINATOR && !isNumeratorWeek) counts = true;

          if (counts) {
            const dateStr = cur.toISOString().split('T')[0];
            const existingSub = subMap.get(`${s.id}:${dateStr}`);
            affectedSlots.push({
              scheduleId: s.id,
              date: dateStr,
              dayOfWeek: s.dayOfWeek as string,
              timeSlot: s.timeSlot,
              startTime: s.startTime,
              endTime: s.endTime,
              subjectId: s.subject?.id ?? '',
              subjectName: s.subject?.name ?? '',
              classId: s.class?.id ?? '',
              className: s.class?.name ?? '',
              roomName: s.room?.name ?? null,
              branchName: s.branch?.name ?? '',
              weekType: s.weekType as string,
              existingSubstitutionId: existingSub?.id,
              existingSubstitutionStatus: existingSub?.status as string,
            });
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    return {
      leaveRequestId,
      teacherId: req.requesterId,
      teacherName: `${requester?.firstName ?? ''} ${requester?.lastName ?? ''}`.trim(),
      startDate: req.startDate.toISOString().split('T')[0],
      endDate: req.endDate.toISOString().split('T')[0],
      affectedCount: affectedSlots.length,
      affectedSlots: affectedSlots.sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot - b.timeSlot),
    };
  }

  // ─── 2. Candidate ranking ──────────────────────────────────────────────────

  async getCandidates(
    scheduleId: string,
    date: string,
    currentUser: JwtPayload,
  ): Promise<CandidateTeacher[]> {
    this.assertManager(currentUser);

    const schedule = await this.prisma.schedule.findFirst({
      where: { id: scheduleId, ...buildTenantWhere(currentUser) },
      include: {
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    });
    if (!schedule) throw new NotFoundException('Jadval sloti topilmadi');

    const schoolId = currentUser.schoolId!;
    const branchId = schedule.branchId;
    const subjectId = schedule.subjectId;
    const classId = schedule.classId;
    const originalTeacherId = schedule.teacherId;
    const dayOfWeek = schedule.dayOfWeek;
    const timeSlot = schedule.timeSlot;
    const weekType = schedule.weekType as WeekType;

    // Find all active teachers in school/branch
    const teachers = await this.prisma.user.findMany({
      where: {
        schoolId,
        ...(currentUser.role === UserRole.BRANCH_ADMIN ? { branchId } : {}),
        role: { in: [UserRole.TEACHER, UserRole.CLASS_TEACHER] },
        isActive: true,
        id: { not: originalTeacherId },
      },
      select: {
        id: true, firstName: true, lastName: true, branchId: true,
      },
    });

    if (teachers.length === 0) return [];

    // Get conflicting published schedules for all teachers at once
    const conflictingSchedules = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        teacherId: { in: teachers.map(t => t.id) },
        dayOfWeek: dayOfWeek as any,
        timeSlot,
        status: ScheduleStatus.PUBLISHED,
        weekType: weekType === WeekType.ALL
          ? undefined
          : { in: [WeekType.ALL, weekType] },
      },
      select: { teacherId: true },
    });
    const busyTeacherIds = new Set(conflictingSchedules.map(s => s.teacherId));

    // Get conflicting approved/applied substitutions
    const conflictingSubs = await this.prisma.teacherSubstitution.findMany({
      where: {
        schoolId,
        date: new Date(date),
        schedule: { dayOfWeek: dayOfWeek as any, timeSlot },
        status: { in: [SubstitutionStatus.APPROVED, SubstitutionStatus.APPLIED] },
      },
      select: { originalTeacherId: true, substituteTeacherId: true },
    });
    for (const s of conflictingSubs) {
      busyTeacherIds.add(s.originalTeacherId);
      busyTeacherIds.add(s.substituteTeacherId);
    }

    // Get teachers on approved leave for this date
    const leaveRequests = await this.prisma.leaveRequest.findMany({
      where: {
        schoolId,
        requesterId: { in: teachers.map(t => t.id) },
        status: 'approved' as any,
        startDate: { lte: new Date(date) },
        endDate: { gte: new Date(date) },
        affectsSchedule: true,
      },
      select: { requesterId: true },
    });
    const onLeaveTeacherIds = new Set(leaveRequests.map(l => l.requesterId));

    // Get TeachingLoads for subject matching
    const teachingLoads = await this.prisma.teachingLoad.findMany({
      where: {
        schoolId,
        status: 'approved' as any,
        subjectId,
        teacherId: { in: teachers.map(t => t.id) },
      },
      select: { teacherId: true, classId: true },
    });
    const teachersWithSubject = new Set(teachingLoads.map(tl => tl.teacherId));
    const teachersWithSubjectAndClass = new Set(
      teachingLoads.filter(tl => tl.classId === classId).map(tl => tl.teacherId),
    );

    // Get teacher daily load for this date
    const teacherDailySchedules = await this.prisma.schedule.findMany({
      where: {
        schoolId,
        teacherId: { in: teachers.map(t => t.id) },
        status: ScheduleStatus.PUBLISHED,
        dayOfWeek: dayOfWeek as any,
      },
      select: { teacherId: true },
    });
    const teacherDailyLoad = new Map<string, number>();
    for (const s of teacherDailySchedules) {
      teacherDailyLoad.set(s.teacherId, (teacherDailyLoad.get(s.teacherId) ?? 0) + 1);
    }

    // Get weekly substitution count
    const dateObj = new Date(date);
    const weekStart = new Date(dateObj);
    weekStart.setDate(dateObj.getDate() - dateObj.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weeklySubs = await this.prisma.teacherSubstitution.findMany({
      where: {
        schoolId,
        substituteTeacherId: { in: teachers.map(t => t.id) },
        date: { gte: weekStart, lte: weekEnd },
        status: { in: [SubstitutionStatus.APPROVED, SubstitutionStatus.APPLIED] },
      },
      select: { substituteTeacherId: true },
    });
    const weeklySubCount = new Map<string, number>();
    for (const s of weeklySubs) {
      weeklySubCount.set(s.substituteTeacherId, (weeklySubCount.get(s.substituteTeacherId) ?? 0) + 1);
    }

    // Score candidates
    const candidates: CandidateTeacher[] = [];
    for (const teacher of teachers) {
      // Hard filters
      if (busyTeacherIds.has(teacher.id)) continue;
      if (onLeaveTeacherIds.has(teacher.id)) continue;

      const reasons: string[] = [];
      let score = 0;

      // Same subject in same class
      if (teachersWithSubjectAndClass.has(teacher.id)) {
        score += 50;
        reasons.push("Shu fan va sinfda o'qitadi");
      } else if (teachersWithSubject.has(teacher.id)) {
        score += 30;
        reasons.push("Shu fanni o'qitadi");
      }

      // Branch match
      if (teacher.branchId === branchId) {
        score += 20;
        reasons.push("Shu filialda");
      }

      // Daily load
      const dailyLoad = teacherDailyLoad.get(teacher.id) ?? 0;
      if (dailyLoad === 0) {
        score += 25;
        reasons.push("Bu kun bo'sh");
      } else if (dailyLoad <= 3) {
        score += 15;
        reasons.push("Yuklamasi past");
      } else if (dailyLoad <= 5) {
        score += 5;
      } else {
        score -= 20;
        reasons.push("Yuklamasi yuqori");
      }

      // Weekly substitution count
      const subCount = weeklySubCount.get(teacher.id) ?? 0;
      if (subCount >= 3) {
        score -= 15;
        reasons.push("Bu hafta ko'p almashtirilgan");
      } else if (subCount >= 1) {
        score -= 5;
      }

      // Last-minute penalty
      const daysUntil = Math.ceil((dateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 1) {
        score -= 10;
        reasons.push("Tez orada");
      }

      candidates.push({
        teacherId: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        score: Math.max(0, score),
        reasons,
      });
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  // ─── 3. Propose substitutions ──────────────────────────────────────────────

  async proposeSubstitutions(
    dto: {
      leaveRequestId: string;
      selections: Array<{ scheduleId: string; date: string; substituteTeacherId: string; reason?: string }>;
    },
    currentUser: JwtPayload,
  ) {
    this.assertManager(currentUser);

    const { affectedSlots } = await this.getAffectedSchedules(dto.leaveRequestId, currentUser);
    if (affectedSlots.length === 0) {
      throw new BadRequestException("Ta'sirlangan darslar yo'q");
    }

    const slotMap = new Map(affectedSlots.map(s => [`${s.scheduleId}:${s.date}`, s]));
    const schoolId = currentUser.schoolId!;

    const created: any[] = [];
    const skipped: string[] = [];

    for (const sel of dto.selections) {
      const key = `${sel.scheduleId}:${sel.date}`;
      const slot = slotMap.get(key);
      if (!slot) {
        skipped.push(`Noto'g'ri slot: ${key}`);
        continue;
      }

      // Check if already has a non-rejected substitution
      const existing = await this.prisma.teacherSubstitution.findFirst({
        where: {
          leaveRequestId: dto.leaveRequestId,
          scheduleId: sel.scheduleId,
          date: new Date(sel.date),
          status: { not: SubstitutionStatus.REJECTED },
        },
      });
      if (existing) {
        skipped.push(`Allaqachon mavjud: ${key}`);
        continue;
      }

      const scheduleInfo = await this.prisma.schedule.findUnique({
        where: { id: sel.scheduleId },
        select: { teacherId: true, branchId: true },
      });

      const sub = await this.prisma.teacherSubstitution.create({
        data: {
          schoolId,
          branchId: scheduleInfo?.branchId ?? '',
          date: new Date(sel.date),
          scheduleId: sel.scheduleId,
          originalTeacherId: scheduleInfo?.teacherId ?? '',
          substituteTeacherId: sel.substituteTeacherId,
          leaveRequestId: dto.leaveRequestId,
          reason: sel.reason,
          status: SubstitutionStatus.PROPOSED,
        },
        include: {
          originalTeacher: { select: { id: true, firstName: true, lastName: true } },
          substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
          schedule: { select: { dayOfWeek: true, timeSlot: true, startTime: true, endTime: true, subject: { select: { name: true } }, class: { select: { name: true } } } },
        },
      });

      created.push(sub);
      await this.audit('propose', currentUser, sub.id, { leaveRequestId: dto.leaveRequestId, scheduleId: sel.scheduleId, date: sel.date, substituteTeacherId: sel.substituteTeacherId });
    }

    return { created, skipped, count: created.length };
  }

  // ─── 4. Approve substitution ───────────────────────────────────────────────

  async approveSubstitution(id: string, currentUser: JwtPayload) {
    this.assertManager(currentUser);

    const sub = await this.prisma.teacherSubstitution.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!sub) throw new NotFoundException('Almashtirish topilmadi');
    if (sub.status !== SubstitutionStatus.PROPOSED) {
      throw new BadRequestException("Faqat taklif holatdagini tasdiqlash mumkin");
    }

    // Branch Admin scope
    if (currentUser.role === UserRole.BRANCH_ADMIN && sub.branchId !== currentUser.branchId) {
      throw new ForbiddenException('Boshqa filial almashtirishini tasdiqlash mumkin emas');
    }

    const updated = await this.prisma.teacherSubstitution.update({
      where: { id },
      data: {
        status: SubstitutionStatus.APPROVED,
        approvedById: currentUser.sub,
        approvedAt: new Date(),
      },
      include: {
        originalTeacher: { select: { id: true, firstName: true, lastName: true } },
        substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
        schedule: { select: { dayOfWeek: true, timeSlot: true, subject: { select: { name: true } }, class: { select: { name: true } } } },
      },
    });

    await this.audit('approve', currentUser, id, { originalTeacherId: sub.originalTeacherId, substituteTeacherId: sub.substituteTeacherId });
    return updated;
  }

  // ─── 5. Reject substitution ────────────────────────────────────────────────

  async rejectSubstitution(id: string, reason: string | undefined, currentUser: JwtPayload) {
    this.assertManager(currentUser);

    const sub = await this.prisma.teacherSubstitution.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!sub) throw new NotFoundException('Almashtirish topilmadi');
    if (![SubstitutionStatus.PROPOSED, SubstitutionStatus.APPROVED].includes(sub.status as any)) {
      throw new BadRequestException("Faqat taklif yoki tasdiqlangan holatdagini rad etish mumkin");
    }

    if (currentUser.role === UserRole.BRANCH_ADMIN && sub.branchId !== currentUser.branchId) {
      throw new ForbiddenException('Boshqa filial almashtirishini rad etish mumkin emas');
    }

    const updated = await this.prisma.teacherSubstitution.update({
      where: { id },
      data: {
        status: SubstitutionStatus.REJECTED,
        notes: reason ? `${sub.notes ?? ''}\nRad etish sababi: ${reason}`.trim() : sub.notes,
      },
      include: {
        originalTeacher: { select: { id: true, firstName: true, lastName: true } },
        substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.audit('reject', currentUser, id, { reason, originalTeacherId: sub.originalTeacherId, substituteTeacherId: sub.substituteTeacherId });
    return updated;
  }

  // ─── 6. Apply substitution ─────────────────────────────────────────────────

  async applySubstitution(id: string, currentUser: JwtPayload) {
    this.assertManager(currentUser);

    const sub = await this.prisma.teacherSubstitution.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        schedule: { select: { teacherId: true, subjectId: true, branchId: true, schoolId: true } },
        leaveRequest: { select: { type: true } },
      },
    });
    if (!sub) throw new NotFoundException('Almashtirish topilmadi');
    if (sub.status !== SubstitutionStatus.APPROVED) {
      throw new BadRequestException("Faqat tasdiqlangan almashtirishni qo'llash mumkin");
    }

    if (currentUser.role === UserRole.BRANCH_ADMIN && sub.branchId !== currentUser.branchId) {
      throw new ForbiddenException('Boshqa filial almashtirishini qo\'llash mumkin emas');
    }

    // Determine original teacher attendance status based on leave type
    const isExcusedLeave = ['sick', 'paid', 'vacation', 'training', 'business_trip', 'maternity', 'emergency', 'professional'].includes(sub.leaveRequest?.type ?? '');
    const originalStatus = isExcusedLeave ? 'excused' : 'absent';

    // Write attendance records in a transaction
    await this.prisma.$transaction([
      // Update substitution status
      this.prisma.teacherSubstitution.update({
        where: { id },
        data: { status: SubstitutionStatus.APPLIED },
      }),
      // Original teacher attendance
      this.prisma.teacherAttendance.upsert({
        where: {
          teacherId_date_scheduleId: {
            teacherId: sub.originalTeacherId,
            date: sub.date,
            scheduleId: sub.scheduleId,
          },
        },
        create: {
          schoolId: sub.schoolId,
          branchId: sub.branchId,
          teacherId: sub.originalTeacherId,
          date: sub.date,
          status: originalStatus as any,
          scheduleId: sub.scheduleId,
          substitutionId: sub.id,
          leaveRequestId: sub.leaveRequestId,
          source: 'substitution',
          notes: `Almashtirish: ${sub.substituteTeacherId}`,
        },
        update: {
          status: originalStatus as any,
          substitutionId: sub.id,
          leaveRequestId: sub.leaveRequestId,
          source: 'substitution',
        },
      }),
      // Substitute teacher attendance
      this.prisma.teacherAttendance.upsert({
        where: {
          teacherId_date_scheduleId: {
            teacherId: sub.substituteTeacherId,
            date: sub.date,
            scheduleId: sub.scheduleId,
          },
        },
        create: {
          schoolId: sub.schoolId,
          branchId: sub.branchId,
          teacherId: sub.substituteTeacherId,
          date: sub.date,
          status: 'present' as any,
          scheduleId: sub.scheduleId,
          substitutionId: sub.id,
          source: 'substitution',
          notes: `O'rinbosar: ${sub.originalTeacherId} o'rniga`,
        },
        update: {
          status: 'present' as any,
          substitutionId: sub.id,
          source: 'substitution',
        },
      }),
    ]);

    const updated = await this.prisma.teacherSubstitution.findUnique({
      where: { id },
      include: {
        originalTeacher: { select: { id: true, firstName: true, lastName: true } },
        substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
        schedule: { select: { dayOfWeek: true, timeSlot: true, subject: { select: { name: true } }, class: { select: { name: true } } } },
      },
    });

    await this.audit('apply', currentUser, id, { originalTeacherId: sub.originalTeacherId, substituteTeacherId: sub.substituteTeacherId, originalStatus });
    return updated;
  }

  // ─── 7. Cancel substitution ────────────────────────────────────────────────

  async cancelSubstitution(id: string, reason: string | undefined, currentUser: JwtPayload) {
    this.assertManager(currentUser);

    const sub = await this.prisma.teacherSubstitution.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!sub) throw new NotFoundException('Almashtirish topilmadi');
    if (![SubstitutionStatus.PROPOSED, SubstitutionStatus.APPROVED].includes(sub.status as any)) {
      throw new BadRequestException("Faqat taklif yoki tasdiqlangan holatdagini bekor qilish mumkin");
    }

    if (currentUser.role === UserRole.BRANCH_ADMIN && sub.branchId !== currentUser.branchId) {
      throw new ForbiddenException('Boshqa filial almashtirishini bekor qilish mumkin emas');
    }

    await this.prisma.$transaction([
      this.prisma.teacherSubstitution.update({
        where: { id },
        data: {
          status: SubstitutionStatus.CANCELLED,
          notes: reason ? `${sub.notes ?? ''}\nBekor qilish sababi: ${reason}`.trim() : sub.notes,
        },
      }),
      // Delete associated attendance records
      this.prisma.teacherAttendance.deleteMany({
        where: { substitutionId: id },
      }),
    ]);

    await this.audit('cancel', currentUser, id, { reason, originalTeacherId: sub.originalTeacherId, substituteTeacherId: sub.substituteTeacherId });
    return { message: 'Almashtirish bekor qilindi', id };
  }

  // ─── 8. List substitutions ─────────────────────────────────────────────────

  async listSubstitutions(
    currentUser: JwtPayload,
    query?: { status?: string; teacherId?: string; date?: string; branchId?: string; limit?: number; offset?: number },
  ) {
    this.assertCanRead(currentUser);

    const where: any = { ...buildTenantWhere(currentUser) };
    if (query?.status) where.status = query.status;
    if (query?.date) where.date = new Date(query.date);
    if (query?.branchId) where.branchId = query.branchId;

    if (query?.teacherId) {
      where.OR = [
        { originalTeacherId: query.teacherId },
        { substituteTeacherId: query.teacherId },
      ];
    }

    // Teacher can only see their own
    if (currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLASS_TEACHER) {
      where.OR = [
        { originalTeacherId: currentUser.sub },
        { substituteTeacherId: currentUser.sub },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.teacherSubstitution.findMany({
        where,
        orderBy: { date: 'desc' },
        take: query?.limit ?? 50,
        skip: query?.offset ?? 0,
        include: {
          originalTeacher: { select: { id: true, firstName: true, lastName: true } },
          substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
          schedule: { select: { dayOfWeek: true, timeSlot: true, startTime: true, endTime: true, subject: { select: { name: true } }, class: { select: { name: true } } } },
          branch: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
          leaveRequest: { select: { id: true, type: true } },
        },
      }),
      this.prisma.teacherSubstitution.count({ where }),
    ]);

    return { items, total, limit: query?.limit ?? 50, offset: query?.offset ?? 0 };
  }

  // ─── 9. Get substitution detail ────────────────────────────────────────────

  async getSubstitution(id: string, currentUser: JwtPayload) {
    const sub = await this.prisma.teacherSubstitution.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        originalTeacher: { select: { id: true, firstName: true, lastName: true } },
        substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
        schedule: {
          select: {
            dayOfWeek: true, timeSlot: true, startTime: true, endTime: true,
            subject: { select: { id: true, name: true } },
            class: { select: { id: true, name: true } },
            room: { select: { name: true } },
          },
        },
        branch: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        leaveRequest: { select: { id: true, type: true, startDate: true, endDate: true } },
        attendances: { select: { teacherId: true, status: true } },
      },
    });
    if (!sub) throw new NotFoundException('Almashtirish topilmadi');

    // Teacher can only view their own
    if (currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.CLASS_TEACHER) {
      if (sub.originalTeacherId !== currentUser.sub && sub.substituteTeacherId !== currentUser.sub) {
        throw new ForbiddenException("Faqat o'z almashtirishingizni ko'rish mumkin");
      }
    }

    return sub;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async audit(
    action: string,
    currentUser: JwtPayload,
    entityId: string,
    metadata?: Record<string, any>,
  ) {
    try {
      await this.auditService.log({
        userId: currentUser.sub,
        schoolId: currentUser.schoolId ?? undefined,
        branchId: currentUser.branchId ?? undefined,
        action: action as any,
        entity: 'TeacherSubstitution',
        entityId,
        newData: metadata,
      });
    } catch { /* non-critical */ }
  }

  private getISOWeek(date: Date): number {
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
}
