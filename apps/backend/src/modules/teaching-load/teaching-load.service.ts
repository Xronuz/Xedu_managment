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
