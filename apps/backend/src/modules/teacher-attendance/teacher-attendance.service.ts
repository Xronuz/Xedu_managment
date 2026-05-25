import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';

@Injectable()
export class TeacherAttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private assertCanRead(user: JwtPayload, teacherId?: string) {
    if (user.role === UserRole.STUDENT || user.role === UserRole.PARENT) {
      throw new ForbiddenException('Ruxsat yoq');
    }
    if (user.role === UserRole.TEACHER || user.role === UserRole.CLASS_TEACHER) {
      if (teacherId && teacherId !== user.sub) {
        throw new ForbiddenException("Faqat o'z ma'lumotlaringizni ko'rish mumkin");
      }
    }
  }

  async findByTeacher(teacherId: string, currentUser: JwtPayload, query?: { from?: string; to?: string }) {
    this.assertCanRead(currentUser, teacherId);

    const where: any = { teacherId, ...buildTenantWhere(currentUser) };
    if (query?.from || query?.to) {
      where.date = {};
      if (query.from) where.date.gte = new Date(query.from);
      if (query.to) where.date.lte = new Date(query.to);
    }

    return this.prisma.teacherAttendance.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async markAttendance(
    data: {
      teacherId: string;
      date: string;
      status: string;
      scheduleId?: string;
      notes?: string;
      source?: string;
    },
    currentUser: JwtPayload,
  ) {
    if (currentUser.role === UserRole.STUDENT || currentUser.role === UserRole.PARENT) {
      throw new ForbiddenException('Ruxsat yoq');
    }
    const schoolId = currentUser.schoolId!;
    const branchId = currentUser.branchId!;

    // Verify teacher exists in scope
    const teacher = await this.prisma.user.findFirst({
      where: { id: data.teacherId, schoolId, ...(branchId ? { branchId } : {}) },
    });
    if (!teacher) throw new NotFoundException("O'qituvchi topilmadi");

    const dateObj = new Date(data.date);
    dateObj.setHours(0, 0, 0, 0);

    const existing = await this.prisma.teacherAttendance.findFirst({
      where: {
        teacherId: data.teacherId,
        date: dateObj,
        scheduleId: data.scheduleId ?? null,
      },
    });

    if (existing) {
      return this.prisma.teacherAttendance.update({
        where: { id: existing.id },
        data: {
          status: data.status as any,
          notes: data.notes,
          source: data.source ?? 'manual',
        },
        include: {
          teacher: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }

    return this.prisma.teacherAttendance.create({
      data: {
        schoolId,
        branchId,
        teacherId: data.teacherId,
        date: dateObj,
        status: data.status as any,
        scheduleId: data.scheduleId,
        notes: data.notes,
        source: data.source ?? 'manual',
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  // ── Substitutions ─────────────────────────────────────────────────────────

  async findSubstitutions(currentUser: JwtPayload, query?: { status?: string; teacherId?: string; date?: string }) {
    if (currentUser.role === UserRole.STUDENT || currentUser.role === UserRole.PARENT) {
      throw new ForbiddenException('Ruxsat yoq');
    }

    const where: any = { ...buildTenantWhere(currentUser) };
    if (query?.status) where.status = query.status;
    if (query?.teacherId) {
      where.OR = [
        { originalTeacherId: query.teacherId },
        { substituteTeacherId: query.teacherId },
      ];
    }
    if (query?.date) where.date = new Date(query.date);

    return this.prisma.teacherSubstitution.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        originalTeacher: { select: { id: true, firstName: true, lastName: true } },
        substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
        schedule: { select: { dayOfWeek: true, timeSlot: true, startTime: true, endTime: true } },
        branch: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async findSubstitutionById(id: string, currentUser: JwtPayload) {
    const sub = await this.prisma.teacherSubstitution.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        originalTeacher: { select: { id: true, firstName: true, lastName: true } },
        substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
        schedule: { select: { dayOfWeek: true, timeSlot: true, startTime: true, endTime: true, subject: { select: { name: true } }, class: { select: { name: true } } } },
        branch: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!sub) throw new NotFoundException('Almashtirish topilmadi');
    return sub;
  }

  async createSubstitution(
    data: {
      date: string;
      scheduleId: string;
      originalTeacherId: string;
      substituteTeacherId: string;
      reason?: string;
      notes?: string;
    },
    currentUser: JwtPayload,
  ) {
    const isManager = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN].includes(currentUser.role as any);
    if (!isManager) throw new ForbiddenException('Ruxsat yoq');

    const schoolId = currentUser.schoolId!;
    const branchId = currentUser.branchId;

    // Verify schedule exists
    const schedule = await this.prisma.schedule.findFirst({
      where: { id: data.scheduleId, schoolId, ...(branchId ? { branchId } : {}) },
    });
    if (!schedule) throw new NotFoundException('Jadval sloti topilmadi');

    // Scope check: Branch Admin can only create for own branch
    if (currentUser.role === UserRole.BRANCH_ADMIN && schedule.branchId !== currentUser.branchId) {
      throw new ForbiddenException('Boshqa filial jadvali uchun almashtirish yaratish mumkin emas');
    }

    return this.prisma.teacherSubstitution.create({
      data: {
        schoolId,
        branchId: schedule.branchId,
        date: new Date(data.date),
        scheduleId: data.scheduleId,
        originalTeacherId: data.originalTeacherId,
        substituteTeacherId: data.substituteTeacherId,
        reason: data.reason,
        notes: data.notes,
        status: 'proposed' as any,
      },
      include: {
        originalTeacher: { select: { id: true, firstName: true, lastName: true } },
        substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async reviewSubstitution(
    id: string,
    dto: { action: 'approve' | 'reject'; comment?: string },
    currentUser: JwtPayload,
  ) {
    const isManager = [UserRole.DIRECTOR, UserRole.VICE_PRINCIPAL, UserRole.BRANCH_ADMIN].includes(currentUser.role as any);
    if (!isManager) throw new ForbiddenException('Ruxsat yoq');

    const sub = await this.findSubstitutionById(id, currentUser);
    if (sub.status !== 'proposed') throw new ForbiddenException('Faqat taklif holatdagini tasdiqlash mumkin');

    const newStatus = dto.action === 'approve' ? 'approved' : 'rejected';

    return this.prisma.teacherSubstitution.update({
      where: { id },
      data: {
        status: newStatus as any,
        approvedById: currentUser.sub,
        approvedAt: new Date(),
        notes: dto.comment ? `${sub.notes ?? ''}\n${dto.comment}`.trim() : sub.notes,
      },
      include: {
        originalTeacher: { select: { id: true, firstName: true, lastName: true } },
        substituteTeacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
