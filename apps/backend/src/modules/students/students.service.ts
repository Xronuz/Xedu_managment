import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { UsersService } from '@/modules/users/users.service';
import { ClassesService } from '@/modules/classes/classes.service';
import { JwtPayload, UserRole } from '@eduplatform/types';
import { buildTenantWhere } from '@/common/utils/tenant-scope.util';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { LinkParentDto } from './dto/link-parent.dto';

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly usersService: UsersService,
    private readonly classesService: ClassesService,
  ) {}

  private assertBranchScope(studentBranchId: string | null, actor: JwtPayload): void {
    if (actor.role === UserRole.BRANCH_ADMIN && studentBranchId !== actor.branchId) {
      throw new ForbiddenException("Filial admin faqat o'z filialidagi o'quvchilar bilan ishlay oladi");
    }
  }

  async create(dto: CreateStudentDto, currentUser: JwtPayload) {
    // Force branch scope for Branch Admin
    let branchId = dto.branchId ?? currentUser.branchId ?? undefined;
    if (currentUser.role === UserRole.BRANCH_ADMIN) {
      if (dto.branchId && dto.branchId !== currentUser.branchId) {
        throw new ForbiddenException("Filial admin boshqa filialga o'quvchi qo'sha olmaydi");
      }
      branchId = currentUser.branchId!;
    }

    // Create user via UsersService (enforces ROLE_CREATION_MATRIX + email uniqueness)
    const user = await this.usersService.create(
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: dto.password,
        phone: dto.phone,
        role: UserRole.STUDENT,
        branchId,
      },
      currentUser,
    );

    // Enroll in class if provided — xato yashirilmaydi
    if (dto.classId) {
      const cls = await this.prisma.class.findFirst({
        where: { id: dto.classId, schoolId: currentUser.schoolId! },
        select: { id: true },
      });
      if (!cls) {
        throw new BadRequestException(`Sinf topilmadi yoki boshqa maktabga tegishli: ${dto.classId}`);
      }
      await this.prisma.classStudent.create({
        data: { classId: cls.id, studentId: user.id },
      });
      // Classes list cache'ni invalidate qil — /classes sahifasi darhol yangilanadi
      await this.classesService.invalidateCache(currentUser.schoolId!);
    }

    return user;
  }

  async findAll(currentUser: JwtPayload, page = 1, limit = 20, search?: string) {
    // Tenant scoping (school + branch) is handled automatically by UsersService.findAll
    // via buildTenantWhere(currentUser). Branch Admin sees only their branch.
    return this.usersService.findAll(currentUser, page, limit, search, UserRole.STUDENT);
  }

  async findOne(id: string, currentUser: JwtPayload) {
    const student = await this.prisma.user.findFirst({
      where: {
        id,
        role: UserRole.STUDENT,
        ...(currentUser.isSuperAdmin ? {} : buildTenantWhere(currentUser)),
      },
      include: {
        school: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        studentClasses: {
          include: { class: { select: { id: true, name: true, gradeLevel: true } } },
        },
        childParents: {
          include: {
            parent: {
              select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!student) throw new NotFoundException("O'quvchi topilmadi");
    this.assertBranchScope(student.branchId, currentUser);

    return student;
  }

  async update(id: string, dto: UpdateStudentDto, currentUser: JwtPayload) {
    const student = await this.findOne(id, currentUser);
    this.assertBranchScope(student.branchId, currentUser);

    // Prevent mass assignment of sensitive fields by only allowing safe ones
    const updateData: Record<string, any> = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
    // Student profile fields
    if (dto.dateOfBirth !== undefined) updateData.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
    if (dto.gender !== undefined) updateData.gender = dto.gender;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.studentIdNumber !== undefined) updateData.studentIdNumber = dto.studentIdNumber;
    if (dto.enrollmentDate !== undefined) updateData.enrollmentDate = dto.enrollmentDate ? new Date(dto.enrollmentDate) : null;
    if (dto.emergencyContactName !== undefined) updateData.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.bloodType !== undefined) updateData.bloodType = dto.bloodType;
    if (dto.medicalNotes !== undefined) updateData.medicalNotes = dto.medicalNotes;
    if (dto.teacherNotes !== undefined) updateData.teacherNotes = dto.teacherNotes;

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        avatarUrl: true, isActive: true, role: true, branchId: true, schoolId: true,
        dateOfBirth: true, gender: true, address: true, studentIdNumber: true,
        enrollmentDate: true, emergencyContactName: true, emergencyContactPhone: true,
        bloodType: true, medicalNotes: true, teacherNotes: true,
      },
    });

    await this.auditService.log({
      userId: currentUser.sub,
      schoolId: currentUser.schoolId ?? undefined,
      action: 'update',
      entity: 'Student',
      entityId: id,
      newData: updateData,
    });

    return updated;
  }

  async linkParent(studentId: string, dto: LinkParentDto, currentUser: JwtPayload) {
    // 1. Verify student exists and is in actor's scope
    const student = await this.findOne(studentId, currentUser);
    this.assertBranchScope(student.branchId, currentUser);

    // 2. Existing parent mode
    if (dto.parentId) {
      const parent = await this.prisma.user.findFirst({
        where: { id: dto.parentId, schoolId: currentUser.schoolId!, role: UserRole.PARENT },
      });
      if (!parent) throw new NotFoundException('Ota-ona topilmadi');
      this.assertBranchScope(parent.branchId, currentUser);

      return this.usersService.linkParentStudent(parent.id, studentId, currentUser);
    }

    // 3. Create-and-link mode
    if (!dto.firstName || !dto.lastName || !dto.email || !dto.password) {
      throw new BadRequestException("Yangi ota-ona yaratish uchun firstName, lastName, email va password talab qilinadi");
    }

    const parent = await this.usersService.create(
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        password: dto.password,
        phone: dto.phone,
        role: UserRole.PARENT,
        branchId: student.branchId ?? undefined,
      },
      currentUser,
    );

    return this.usersService.linkParentStudent(parent.id, studentId, currentUser);
  }

  /**
   * Aggregated student profile for the teacher/class-teacher view:
   * identity + academic (GPA, recent grades) + attendance summary +
   * discipline + homework + gamification + clubs. Self-contained queries —
   * access is gated by findOne() (tenant + branch scope).
   */
  async getProfile(id: string, currentUser: JwtPayload) {
    const student = await this.findOne(id, currentUser);
    const tenant = buildTenantWhere(currentUser);

    const [grades, attendance, discipline, homeworkSubs, coinTx, clubs, portfolio] = await Promise.all([
      // Academic — grades with subject
      this.prisma.grade.findMany({
        where: { studentId: id, ...tenant, deletedAt: null },
        include: { subject: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        take: 40,
      }),
      // Attendance — full history for rate calc (recent slice returned)
      this.prisma.attendance.findMany({
        where: { studentId: id, ...tenant },
        include: { schedule: { include: { subject: { select: { id: true, name: true } } } } },
        orderBy: { date: 'desc' },
        take: 200,
      }),
      // Discipline incidents
      this.prisma.disciplineIncident.findMany({
        where: { studentId: id, ...tenant },
        include: { reportedBy: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { date: 'desc' },
        take: 30,
      }),
      // Homework submissions
      this.prisma.homeworkSubmission.findMany({
        where: { studentId: id },
        orderBy: { submittedAt: 'desc' },
        take: 50,
      }),
      // Gamification — coin transactions (school-scoped)
      this.prisma.coinTransaction.findMany({
        where: { userId: id, schoolId: currentUser.schoolId ?? undefined },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      // Clubs
      this.prisma.clubMember.findMany({
        where: { studentId: id },
        include: { club: { select: { id: true, name: true } } },
        orderBy: { joinedAt: 'desc' },
      }),
      // Portfolio achievements
      this.prisma.studentAchievement.findMany({
        where: { studentId: id, ...tenant },
        include: {
          verifiedBy: { select: { id: true, firstName: true, lastName: true } },
          subject: { select: { id: true, name: true } },
        },
        orderBy: [{ achievedAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    // GPA (percentage scale 0–100, then /20 → 5-point for display by frontend)
    const gpaPct =
      grades.length > 0
        ? grades.reduce((s, g) => s + (g.maxScore > 0 ? (g.score / g.maxScore) * 100 : 0), 0) / grades.length
        : 0;

    // Attendance summary
    const attCounts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const a of attendance) {
      if (a.status in attCounts) attCounts[a.status as keyof typeof attCounts]++;
    }
    const attTotal = attendance.length;
    const presentRate = attTotal > 0
      ? Math.round(((attCounts.present + attCounts.late) / attTotal) * 100)
      : 0;

    // Homework summary
    const gradedSubs = homeworkSubs.filter((h) => h.score != null);
    const hwAvg = gradedSubs.length > 0
      ? Math.round((gradedSubs.reduce((s, h) => s + (h.score ?? 0), 0) / gradedSubs.length) * 10) / 10
      : null;

    return {
      student,
      academic: {
        gpa: Math.round((gpaPct / 20) * 100) / 100, // 5-point scale
        gpaPct: Math.round(gpaPct * 10) / 10,
        gradeCount: grades.length,
        recentGrades: grades.slice(0, 10),
      },
      attendance: {
        ...attCounts,
        total: attTotal,
        presentRate,
        recent: attendance.slice(0, 15),
      },
      discipline: {
        total: discipline.length,
        unresolved: discipline.filter((d) => !d.resolved).length,
        incidents: discipline,
      },
      homework: {
        submitted: homeworkSubs.length,
        graded: gradedSubs.length,
        avgScore: hwAvg,
      },
      gamification: {
        coins: (student as any).coins ?? 0,
        recentTransactions: coinTx,
      },
      clubs: clubs.map((c) => ({ id: c.club.id, name: c.club.name, joinedAt: c.joinedAt })),
      portfolio: {
        total: portfolio.length,
        verified: portfolio.filter((p) => p.verified).length,
        byCategory: portfolio.reduce((acc, p) => {
          acc[p.category] = (acc[p.category] ?? 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        items: portfolio,
      },
    };
  }
}
