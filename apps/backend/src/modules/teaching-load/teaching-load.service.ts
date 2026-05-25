import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import {
  JwtPayload,
  UserRole,
  TeachingLoadStatus,
  GroupType,
  Semester,
} from '@eduplatform/types';
import { CreateTeachingLoadDto, UpdateTeachingLoadDto } from './dto/create-teaching-load.dto';

export interface TeacherWorkloadItem {
  teacherId: string;
  teacherName: string;
  plannedWeeklyHours: number;
  contractualWeeklyHours: number;
  utilizationPercent: number;
  status: 'underloaded' | 'balanced' | 'overloaded';
  classCount: number;
  subjectCount: number;
  branchCount: number;
  splitClassCount: number;
  coefficientWeightedHours: number;
  loads: Array<{
    id: string;
    subjectName: string;
    className: string;
    hoursPerWeek: number;
    coefficient: number;
    groupType: string;
    isSplitClass: boolean;
    branchName: string;
  }>;
}

export interface WorkloadAlert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  teacherId?: string;
  teacherName?: string;
  message: string;
}

export interface WorkloadSummary {
  totalTeachers: number;
  totalPlannedHours: number;
  balancedCount: number;
  underloadedCount: number;
  overloadedCount: number;
  missingContractCount: number;
  noLoadCount: number;
  alerts: WorkloadAlert[];
}

@Injectable()
export class TeachingLoadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ── RBAC helper ───────────────────────────────────────────────────────────

  private assertCanManage(currentUser: JwtPayload, branchId: string) {
    const { role, branchId: userBranchId } = currentUser;

    if (role === UserRole.TEACHER || role === UserRole.STUDENT || role === UserRole.PARENT) {
      throw new ForbiddenException('Bu amalni bajarish uchun yetarli huquq yo\'q');
    }

    if (role === UserRole.BRANCH_ADMIN && branchId !== userBranchId) {
      throw new ForbiddenException('Filial admin faqat o\'z filialidagi yuklamalarni boshqarishi mumkin');
    }
  }

  private assertCanRead(currentUser: JwtPayload, teacherId?: string) {
    const { role, sub } = currentUser;

    if (role === UserRole.STUDENT || role === UserRole.PARENT) {
      throw new ForbiddenException('Bu ma\'lumotni ko\'rish uchun yetarli huquq yo\'q');
    }

    if (role === UserRole.TEACHER && teacherId && teacherId !== sub) {
      throw new ForbiddenException('Faqat o\'z yuklamangizni ko\'rishingiz mumkin');
    }
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async findAll(currentUser: JwtPayload, query: {
    teacherId?: string;
    classId?: string;
    subjectId?: string;
    status?: TeachingLoadStatus;
    groupType?: GroupType;
    semester?: Semester;
  }) {
    this.assertCanRead(currentUser, query.teacherId);

    const where: any = {
      ...buildTenantWhere(currentUser),
      ...(query.teacherId ? { teacherId: query.teacherId } : {}),
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.groupType ? { groupType: query.groupType } : {}),
      ...(query.semester ? { semester: query.semester } : {}),
    };

    return this.prisma.teachingLoad.findMany({
      where,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, gradeLevel: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ teacher: { lastName: 'asc' } }, { subject: { name: 'asc' } }],
    });
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const load = await this.prisma.teachingLoad.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true, gradeLevel: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    if (!load) throw new NotFoundException('O\'quv yuklamasi topilmadi');
    this.assertCanRead(currentUser, load.teacherId);

    return load;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: CreateTeachingLoadDto, currentUser: JwtPayload) {
    const schoolId = currentUser.schoolId!;

    // Validate that teacher, subject, class all belong to this school
    const [teacher, subject, cls] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: dto.teacherId, schoolId, role: { in: [UserRole.TEACHER, UserRole.CLASS_TEACHER] } },
        select: { id: true, branchId: true },
      }),
      this.prisma.subject.findFirst({
        where: { id: dto.subjectId, schoolId },
        select: { id: true, branchId: true, classId: true, teacherId: true },
      }),
      this.prisma.class.findFirst({
        where: { id: dto.classId, schoolId },
        select: { id: true, branchId: true },
      }),
    ]);

    if (!teacher) throw new NotFoundException('O\'qituvchi topilmadi');
    if (!subject) throw new NotFoundException('Fan topilmadi');
    if (!cls) throw new NotFoundException('Sinf topilmadi');

    this.assertCanManage(currentUser, subject.branchId);

    // Prevent duplicate active load for same teacher+subject+class+semester
    const semester = dto.semester ?? Semester.FULL_YEAR;
    const existing = await this.prisma.teachingLoad.findFirst({
      where: {
        teacherId: dto.teacherId,
        subjectId: dto.subjectId,
        classId: dto.classId,
        semester,
        status: { in: [TeachingLoadStatus.DRAFT, TeachingLoadStatus.APPROVED] },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Bu o\'qituvchi uchun ushbu fan va sinf bo\'yicha faol yuklama allaqachon mavjud'
      );
    }

    const result = await this.prisma.teachingLoad.create({
      data: {
        schoolId,
        branchId: subject.branchId,
        teacherId: dto.teacherId,
        subjectId: dto.subjectId,
        classId: dto.classId,
        hoursPerWeek: dto.hoursPerWeek,
        hoursPerYear: dto.hoursPerYear,
        semester,
        groupType: dto.groupType ?? GroupType.CLASS,
        isSplitClass: dto.isSplitClass ?? false,
        coefficient: dto.coefficient ?? 1.0,
        notes: dto.notes,
        status: TeachingLoadStatus.DRAFT,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    });

    await this.audit('create', currentUser, result.id, undefined, { hoursPerWeek: result.hoursPerWeek });
    return result;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateTeachingLoadDto, currentUser: JwtPayload) {
    const load = await this.prisma.teachingLoad.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!load) throw new NotFoundException('O\'quv yuklamasi topilmadi');

    this.assertCanManage(currentUser, load.branchId);

    // Archived loads cannot be modified
    if (load.status === TeachingLoadStatus.ARCHIVED) {
      throw new ConflictException('Arxivlangan yuklamani tahrirlash mumkin emas');
    }

    // Status transition validation
    if (dto.status) {
      const validTransitions: Record<TeachingLoadStatus, TeachingLoadStatus[]> = {
        [TeachingLoadStatus.DRAFT]: [TeachingLoadStatus.APPROVED, TeachingLoadStatus.ARCHIVED],
        [TeachingLoadStatus.APPROVED]: [TeachingLoadStatus.ARCHIVED],
        [TeachingLoadStatus.ARCHIVED]: [],
      };
      if (!validTransitions[load.status].includes(dto.status)) {
        throw new ConflictException(`Status o'tish noto'g'ri: ${load.status} → ${dto.status}`);
      }
    }

    const oldData = { ...load };
    const result = await this.prisma.teachingLoad.update({
      where: { id },
      data: { ...dto, updatedAt: new Date() },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
      },
    });

    // Sync Subject.hoursPerWeek when approved or hours changed
    const shouldSync =
      (dto.status === TeachingLoadStatus.APPROVED && load.status !== TeachingLoadStatus.APPROVED) ||
      (dto.hoursPerWeek !== undefined && load.status === TeachingLoadStatus.APPROVED);

    if (shouldSync) {
      await this.syncSubjectHours(result);
    }

    await this.audit('update', currentUser, id, oldData, result);
    return result;
  }

  // ── Remove / Archive ──────────────────────────────────────────────────────

  async remove(id: string, currentUser: JwtPayload) {
    const load = await this.prisma.teachingLoad.findFirst({
      where: { id, ...buildTenantWhere(currentUser) },
    });
    if (!load) throw new NotFoundException('O\'quv yuklamasi topilmadi');

    this.assertCanManage(currentUser, load.branchId);

    // Soft-archive instead of hard delete for audit trail
    const result = await this.prisma.teachingLoad.update({
      where: { id },
      data: { status: TeachingLoadStatus.ARCHIVED },
    });

    await this.audit('delete', currentUser, id, { status: load.status }, { status: TeachingLoadStatus.ARCHIVED });
    return { message: 'O\'quv yuklamasi arxivlandi', id: result.id };
  }

  // ── Subject.hoursPerWeek sync ─────────────────────────────────────────────

  private async syncSubjectHours(load: any) {
    // Find the corresponding Subject for this teacher+class
    const subjects = await this.prisma.subject.findMany({
      where: {
        teacherId: load.teacherId,
        classId: load.classId,
        id: load.subjectId,
      },
    });

    if (subjects.length === 0) {
      // No matching subject — this is acceptable for non-standard loads (clubs, electives)
      return { synced: false, warning: 'Mos Subject topilmadi' };
    }

    if (subjects.length > 1) {
      // Ambiguous: multiple subjects match. Don't sync silently.
      return { synced: false, warning: 'Bir nechta mos Subject mavjud, avtomatik yangilanmadi' };
    }

    const subject = subjects[0];
    await this.prisma.subject.update({
      where: { id: subject.id },
      data: { hoursPerWeek: load.hoursPerWeek },
    });

    return { synced: true, subjectId: subject.id };
  }

  // ── Workload Aggregation ──────────────────────────────────────────────────

  async getWorkloadSummary(currentUser: JwtPayload): Promise<WorkloadSummary> {
    this.assertCanRead(currentUser);
    const workloads = await this.getTeacherWorkloads(currentUser);

    let totalPlannedHours = 0;
    let balancedCount = 0;
    let underloadedCount = 0;
    let overloadedCount = 0;
    let missingContractCount = 0;
    let noLoadCount = 0;
    const alerts: WorkloadAlert[] = [];

    for (const w of workloads) {
      totalPlannedHours += w.plannedWeeklyHours;

      if (w.contractualWeeklyHours <= 0) {
        missingContractCount++;
        alerts.push({
          type: 'missingContractHours',
          severity: 'warning',
          teacherId: w.teacherId,
          teacherName: w.teacherName,
          message: `${w.teacherName} uchun StaffSalary konfiguratsiyasi yo'q`,
        });
        continue;
      }

      if (w.plannedWeeklyHours === 0) {
        noLoadCount++;
        alerts.push({
          type: 'noApprovedTeachingLoad',
          severity: 'info',
          teacherId: w.teacherId,
          teacherName: w.teacherName,
          message: `${w.teacherName} uchun tasdiqlangan o'quv yuklamasi yo'q`,
        });
        continue;
      }

      if (w.status === 'balanced') balancedCount++;
      else if (w.status === 'underloaded') {
        underloadedCount++;
        alerts.push({
          type: 'underloaded',
          severity: 'info',
          teacherId: w.teacherId,
          teacherName: w.teacherName,
          message: `${w.teacherName} yuklamasi yetarli emas (${w.utilizationPercent.toFixed(0)}%)`,
        });
      } else if (w.status === 'overloaded') {
        overloadedCount++;
        alerts.push({
          type: 'overloaded',
          severity: 'critical',
          teacherId: w.teacherId,
          teacherName: w.teacherName,
          message: `${w.teacherName} haddan oshgan yuklama (${w.utilizationPercent.toFixed(0)}%)`,
        });
      }
    }

    return {
      totalTeachers: workloads.length,
      totalPlannedHours,
      balancedCount,
      underloadedCount,
      overloadedCount,
      missingContractCount,
      noLoadCount,
      alerts,
    };
  }

  async getTeacherWorkloads(currentUser: JwtPayload, teacherId?: string): Promise<TeacherWorkloadItem[]> {
    if (teacherId) this.assertCanRead(currentUser, teacherId);
    else this.assertCanRead(currentUser);

    const schoolId = currentUser.schoolId!;
    const branchFilter = currentUser.role === UserRole.BRANCH_ADMIN && currentUser.branchId
      ? { branchId: currentUser.branchId }
      : undefined;

    // Fetch all active teachers in scope
    const teachers = await this.prisma.user.findMany({
      where: {
        schoolId,
        ...(branchFilter ?? {}),
        role: { in: [UserRole.TEACHER, UserRole.CLASS_TEACHER] },
        isActive: true,
        ...(teacherId ? { id: teacherId } : {}),
      },
      select: {
        id: true, firstName: true, lastName: true, branchId: true,
      },
    });

    const teacherIds = teachers.map(t => t.id);

    // Fetch approved teaching loads for these teachers
    const loads = await this.prisma.teachingLoad.findMany({
      where: {
        schoolId,
        ...(branchFilter ?? {}),
        teacherId: { in: teacherIds },
        status: TeachingLoadStatus.APPROVED,
      },
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        branch: { select: { name: true } },
      },
    });

    // Fetch StaffSalary configs
    const salaries = await this.prisma.staffSalary.findMany({
      where: { userId: { in: teacherIds } },
      select: { userId: true, weeklyLessonHours: true },
    });
    const salaryMap = new Map(salaries.map(s => [s.userId, s.weeklyLessonHours ?? 18]));

    // Group loads by teacher
    const loadsByTeacher = new Map<string, typeof loads>();
    for (const load of loads) {
      const arr = loadsByTeacher.get(load.teacherId) ?? [];
      arr.push(load);
      loadsByTeacher.set(load.teacherId, arr);
    }

    const results: TeacherWorkloadItem[] = [];

    for (const teacher of teachers) {
      const teacherLoads = loadsByTeacher.get(teacher.id) ?? [];
      const contractualHours = salaryMap.get(teacher.id) ?? 0;
      const plannedHours = teacherLoads.reduce((s, l) => s + l.hoursPerWeek, 0);
      const coefficientWeighted = teacherLoads.reduce((s, l) => s + l.hoursPerWeek * (l.coefficient ?? 1), 0);

      const classIds = new Set(teacherLoads.map(l => l.classId));
      const subjectIds = new Set(teacherLoads.map(l => l.subjectId));
      const branchIds = new Set(teacherLoads.map(l => l.branchId));
      const splitCount = teacherLoads.filter(l => l.isSplitClass).length;

      let status: 'underloaded' | 'balanced' | 'overloaded' = 'balanced';
      if (contractualHours > 0) {
        const ratio = plannedHours / contractualHours;
        if (ratio < 0.8) status = 'underloaded';
        else if (ratio > 1.1) status = 'overloaded';
      }

      results.push({
        teacherId: teacher.id,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        plannedWeeklyHours: plannedHours,
        contractualWeeklyHours: contractualHours,
        utilizationPercent: contractualHours > 0 ? Math.round((plannedHours / contractualHours) * 100) : 0,
        status,
        classCount: classIds.size,
        subjectCount: subjectIds.size,
        branchCount: branchIds.size,
        splitClassCount: splitCount,
        coefficientWeightedHours: Math.round(coefficientWeighted * 10) / 10,
        loads: teacherLoads.map(l => ({
          id: l.id,
          subjectName: l.subject.name,
          className: l.class.name,
          hoursPerWeek: l.hoursPerWeek,
          coefficient: l.coefficient,
          groupType: l.groupType ?? 'class',
          isSplitClass: l.isSplitClass,
          branchName: l.branch.name,
        })),
      });
    }

    // Sort by utilization descending
    return results.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
  }

  async getTeacherWorkloadDetail(teacherId: string, currentUser: JwtPayload): Promise<TeacherWorkloadItem> {
    this.assertCanRead(currentUser, teacherId);
    const items = await this.getTeacherWorkloads(currentUser, teacherId);
    const item = items.find(i => i.teacherId === teacherId);
    if (!item) throw new NotFoundException('O\'qituvchi yuklamasi topilmadi');
    return item;
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
      entity: 'teaching_load',
      entityId,
      oldData,
      newData,
    });
  }
}
