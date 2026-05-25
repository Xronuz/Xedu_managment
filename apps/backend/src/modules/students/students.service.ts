import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { UsersService } from '@/modules/users/users.service';
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

    // Enroll in class if provided
    if (dto.classId) {
      await this.prisma.classStudent.create({
        data: { classId: dto.classId, studentId: user.id },
      }).catch(() => {
        // Silent fail — student is created, class enrollment is best-effort
      });
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

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        avatarUrl: true, isActive: true, role: true, branchId: true, schoolId: true,
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
}
