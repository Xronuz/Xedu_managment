import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Optional } from '@nestjs/common';
import { IsString, IsDateString, IsOptional, IsIn, MinLength, MaxLength, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { AuditService } from '@/common/audit/audit.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

export class CreateLeaveRequestDto {
  @ApiProperty({ example: 'Kasal bo‘lgani uchun ta‘til so‘ralmoqda', minLength: 5, maxLength: 500 })
  @IsString() @MinLength(5) @MaxLength(500)
  reason: string;

  @ApiProperty({ example: '2026-05-01', description: 'Boshlanish sanasi (YYYY-MM-DD)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-05-03', description: 'Tugash sanasi (YYYY-MM-DD)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    enum: ['sick', 'personal', 'family', 'other', 'professional', 'unpaid', 'paid', 'vacation', 'training', 'business_trip', 'maternity', 'emergency'],
    example: 'sick',
    description: 'Ta‘til turi',
  })
  @IsOptional()
  @IsString()
  @IsIn(['sick', 'personal', 'family', 'other', 'professional', 'unpaid', 'paid', 'vacation', 'training', 'business_trip', 'maternity', 'emergency'])
  type?: string;

  @ApiPropertyOptional({ example: true, description: 'Jadvalga ta‘sir qiladimi' })
  @IsOptional()
  @IsBoolean()
  affectsSchedule?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Maoshga ta‘sir qiladimi' })
  @IsOptional()
  @IsBoolean()
  affectsPayroll?: boolean;
}

export class ReviewLeaveDto {
  @ApiProperty({ enum: ['approve', 'reject'], example: 'approve' })
  @IsString()
  action: 'approve' | 'reject';

  @ApiPropertyOptional({ example: 'Ruxsat berildi', maxLength: 300 })
  @IsOptional() @IsString() @MaxLength(300)
  comment?: string;
}

// Roles that must approve a leave request (in order)
const APPROVER_ROLES = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.CLASS_TEACHER];

@Injectable()
export class LeaveRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditService: AuditService,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  async create(dto: CreateLeaveRequestDto, currentUser: JwtPayload) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new BadRequestException("Tugash sanasi boshlanish sanasidan oldin bo'lishi mumkin emas");

    const schoolId = currentUser.schoolId!;

    // Find all approvers in this school (director, vice_principal)
    const approvers = await this.prisma.user.findMany({
      where: {
        schoolId,
        role: { in: [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL] as any },
        isActive: true,
        id: { not: currentUser.sub },
      },
      select: { id: true, role: true },
    });

    if (approvers.length === 0) {
      throw new BadRequestException("Maktabda tasdiqlash uchun mas'ul shaxs topilmadi");
    }

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        schoolId,
        branchId: currentUser.branchId!,
        requesterId: currentUser.sub,
        reason: dto.reason,
        startDate: start,
        endDate: end,
        type: dto.type as any,
        affectsSchedule: dto.affectsSchedule ?? true,
        affectsPayroll: dto.affectsPayroll ?? true,
        createdById: currentUser.sub,
        approvals: {
          create: approvers.map((a) => ({
            approverId: a.id,
          })),
        },
      },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });

    // Notify approvers — DB insert + real-time Socket.IO push
    try {
      const notifTitle = "Yangi ta'til so'rovi";
      const notifBody = `${leaveRequest.requester.firstName} ${leaveRequest.requester.lastName} ta'til so'rov yubordi: ${dto.startDate} – ${dto.endDate}`;

      await this.prisma.notification.createMany({
        data: approvers.map((a) => ({
          schoolId,
          branchId: currentUser.branchId!,
          recipientId: a.id,
          title: notifTitle,
          body: notifBody,
          type: 'in_app',
        })),
      });

      // Real-time push: each approver gets an instant badge update
      approvers.forEach((a) => {
        this.eventsGateway?.emitToUser(a.id, 'notification:new', {
          title: notifTitle,
          body: notifBody,
          type: 'in_app',
        });
      });
    } catch { /* ignore */ }

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'create',
      entity: 'LeaveRequest',
      entityId: leaveRequest.id,
      newData: { startDate: dto.startDate, endDate: dto.endDate, reason: dto.reason },
    });

    // Real-time school-wide broadcast so all dashboards refresh pending counts
    this.eventsGateway?.emitToSchool(schoolId, 'leave-request:created', {
      id: leaveRequest.id,
      requesterId: leaveRequest.requesterId,
      requesterName: `${leaveRequest.requester.firstName} ${leaveRequest.requester.lastName}`,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: leaveRequest.status,
      timestamp: new Date().toISOString(),
    });

    return leaveRequest;
  }

  async findAll(currentUser: JwtPayload, query?: { status?: string }) {
    const isApprover = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN].includes(currentUser.role as any);

    const where: any = { ...buildTenantWhere(currentUser) };
    if (query?.status) where.status = query.status;

    // Non-approver sees only their own requests
    if (!isApprover) {
      where.requesterId = currentUser.sub;
    }

    return this.prisma.leaveRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const req = await this.prisma.leaveRequest.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true, role: true } },
        approvals: {
          include: {
            approver: { select: { id: true, firstName: true, lastName: true, role: true } },
          },
        },
      },
    });
    if (!req) throw new NotFoundException("So'rov topilmadi");

    const isApprover = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL].includes(currentUser.role as any);
    if (!isApprover && req.requesterId !== currentUser.sub) {
      throw new ForbiddenException("Bu so'rovni ko'rish huquqi yo'q");
    }
    return req;
  }

  async review(id: string, dto: ReviewLeaveDto, currentUser: JwtPayload) {
    const req = await this.findOne(id, currentUser);

    if (req.status === 'cancelled') throw new BadRequestException("Bekor qilingan so'rovni ko'rib bo'lmaydi");

    // Find this approver's approval record
    const myApproval = req.approvals.find((a: any) => a.approverId === currentUser.sub);
    if (!myApproval) throw new ForbiddenException("Siz bu so'rovni tasdiqlash/rad etish huquqiga ega emassiz");
    if (myApproval.status !== 'pending') throw new BadRequestException('Siz allaqachon qaror bildingiz');

    const newStatus = dto.action === 'approve' ? 'approved' : 'rejected';

    // Update this approval
    await this.prisma.leaveApproval.update({
      where: { id: myApproval.id },
      data: { status: newStatus as any, comment: dto.comment, decidedAt: new Date() },
    });

    // Recalculate overall status
    const updatedApprovals = await this.prisma.leaveApproval.findMany({
      where: { leaveRequestId: id },
    });

    let overallStatus: string = req.status as string;

    if (dto.action === 'reject') {
      // Any rejection → rejected
      overallStatus = 'rejected';
    } else {
      // All approved → approved
      const allApproved = updatedApprovals.every((a) => a.status === 'approved');
      if (allApproved) overallStatus = 'approved';
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: overallStatus as any },
      include: {
        requester: { select: { id: true, firstName: true, lastName: true } },
        approvals: {
          include: { approver: { select: { id: true, firstName: true, lastName: true, role: true } } },
        },
      },
    });

    // H-1: Ta'til tasdiqlanganda davomat 'excused' yozuvi avtomatik yaratiladi
    if (overallStatus === 'approved') {
      try {
        const requester = await this.prisma.user.findUnique({
          where: { id: req.requesterId },
          select: { role: true },
        });

        if (requester?.role === 'student') {
          // O'quvchining sinfini olamiz
          const studentClass = await this.prisma.classStudent.findFirst({
            where: { studentId: req.requesterId },
            select: { classId: true },
          });
          const classId = studentClass?.classId;
          if (!classId) throw new Error('Student has no active class');

          const start = new Date(req.startDate);
          const end   = new Date(req.endDate);
          const cur   = new Date(start);

          while (cur <= end) {
            const dayStart = new Date(cur); dayStart.setHours(0, 0, 0, 0);
            const dayEnd   = new Date(cur); dayEnd.setHours(23, 59, 59, 999);

            const existing = await this.prisma.attendance.findFirst({
              where: { studentId: req.requesterId, date: { gte: dayStart, lte: dayEnd } },
            });

            if (existing) {
              await this.prisma.attendance.update({
                where: { id: existing.id },
                data: { status: 'excused' as any },
              });
            } else {
              await this.prisma.attendance.create({
                data: {
                  schoolId: currentUser.schoolId!,
                  branchId: currentUser.branchId!,
                  studentId: req.requesterId,
                  classId,
                  date: dayStart,
                  status: 'excused' as any,
                  note: `Ta'til so'rovi #${id} tasdiqlandi`,
                  createdById: currentUser.sub,
                },
              });
            }
            cur.setDate(cur.getDate() + 1);
          }
        }
      } catch { /* Davomat yozilmasa ham asosiy jarayon to'xtamaydi */ }
    }

    // Notify requester if final decision made
    if (overallStatus === 'approved' || overallStatus === 'rejected') {
      const notifTitle = overallStatus === 'approved' ? "✅ Ta'til so'rovi tasdiqlandi" : "❌ Ta'til so'rovi rad etildi";
      const notifBody = dto.comment ?? (overallStatus === 'approved' ? "So'rovingiz barcha tomondan tasdiqlandi" : "So'rovingiz rad etildi");
      try {
        await this.prisma.notification.create({
          data: {
            schoolId: currentUser.schoolId!,
            branchId: currentUser.branchId!,
            recipientId: req.requesterId,
            title: notifTitle,
            body: notifBody,
          },
        });
      } catch { /* ignore */ }

      // Real-time personal WebSocket notification to requester
      this.eventsGateway?.emitPersonalNotification(req.requesterId, {
        type: 'leave_request_decision',
        title: notifTitle,
        body: notifBody,
        status: overallStatus,
        leaveRequestId: id,
        decidedBy: {
          id: currentUser.sub,
          firstName: updated.approvals.find((a: any) => a.approverId === currentUser.sub)?.approver?.firstName,
          lastName: updated.approvals.find((a: any) => a.approverId === currentUser.sub)?.approver?.lastName,
        },
        decidedAt: new Date().toISOString(),
      });
    }

    this.auditService?.log({
      userId: currentUser.sub ?? undefined,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'LeaveRequest',
      entityId: id,
      oldData: { status: req.status },
      newData: { status: overallStatus, action: dto.action, comment: dto.comment },
    });

    // Real-time school-wide broadcast so approver dashboards refresh
    this.eventsGateway?.emitToSchool(currentUser.schoolId!, 'leave-request:updated', {
      id,
      status: overallStatus,
      requesterId: req.requesterId,
      decidedBy: currentUser.sub,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async cancel(id: string, currentUser: JwtPayload) {
    const req = await this.findOne(id, currentUser);
    if (req.requesterId !== currentUser.sub) throw new ForbiddenException("Faqat o'z so'rovingizni bekor qila olasiz");
    if (req.status !== 'pending') throw new BadRequestException("Faqat kutilayotgan so'rovni bekor qilish mumkin");

    return this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'cancelled' as any },
    });
  }

  // ── Phase 5A.4: Affected schedule detection ────────────────────────────────

  /**
   * Berilgan ta'til so'rovi davomida o'qituvchining qaysi published
   * dars slotlari ta'sirlanishini aniqlaydi.
   * weekType (all/numerator/denominator) inobatga olinadi.
   */
  async findAffectedSchedules(leaveRequestId: string, currentUser: JwtPayload) {
    const req = await this.prisma.leaveRequest.findFirst({
      where: { id: leaveRequestId, ...buildTenantWhere(currentUser) },
    });
    if (!req) throw new NotFoundException("So'rov topilmadi");

    // Faqat o'qituvchi ta'tillari uchun
    const requester = await this.prisma.user.findUnique({
      where: { id: req.requesterId },
      select: { role: true, firstName: true, lastName: true },
    });
    const isTeacher = ['teacher', 'class_teacher'].includes(requester?.role ?? '');
    if (!isTeacher || !req.affectsSchedule) {
      return { leaveRequestId, teacherId: req.requesterId, teacherName: requester?.firstName + ' ' + requester?.lastName, affectedSlots: [] };
    }

    const start = new Date(req.startDate);
    const end = new Date(req.endDate);

    // Get all published schedules for this teacher
    const schedules = await this.prisma.schedule.findMany({
      where: {
        schoolId: req.schoolId,
        teacherId: req.requesterId,
        status: 'published' as any,
        ...(currentUser.role === UserRole.BRANCH_ADMIN ? { branchId: currentUser.branchId! } : {}),
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        room: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    const affectedSlots: Array<{
      scheduleId: string;
      date: string;
      dayOfWeek: string;
      timeSlot: number;
      startTime: string;
      endTime: string;
      subjectName: string;
      className: string;
      roomName: string | null;
      branchName: string;
      weekType: string;
    }> = [];

    for (const s of schedules) {
      const scheduleDayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(s.dayOfWeek as string);
      if (scheduleDayIndex === -1) continue;

      const cur = new Date(start);
      while (cur <= end) {
        if (cur.getDay() === scheduleDayIndex) {
          const isoWeek = this.getISOWeek(cur);
          const isNumeratorWeek = isoWeek % 2 === 1;

          let counts = false;
          if (s.weekType === 'all') counts = true;
          else if (s.weekType === 'numerator' && isNumeratorWeek) counts = true;
          else if (s.weekType === 'denominator' && !isNumeratorWeek) counts = true;

          if (counts) {
            affectedSlots.push({
              scheduleId: s.id,
              date: cur.toISOString().split('T')[0],
              dayOfWeek: s.dayOfWeek as string,
              timeSlot: s.timeSlot,
              startTime: s.startTime,
              endTime: s.endTime,
              subjectName: s.subject?.name ?? '',
              className: s.class?.name ?? '',
              roomName: s.room?.name ?? null,
              branchName: s.branch?.name ?? '',
              weekType: s.weekType as string,
            });
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    }

    return {
      leaveRequestId,
      teacherId: req.requesterId,
      teacherName: `${requester?.firstName} ${requester?.lastName}`,
      startDate: req.startDate.toISOString().split('T')[0],
      endDate: req.endDate.toISOString().split('T')[0],
      affectedCount: affectedSlots.length,
      affectedSlots: affectedSlots.sort((a, b) => a.date.localeCompare(b.date) || a.timeSlot - b.timeSlot),
    };
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
