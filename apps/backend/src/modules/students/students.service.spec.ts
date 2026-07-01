import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { UsersService } from '@/modules/users/users.service';
import { ClassesService } from '@/modules/classes/classes.service';
import { UserRole } from '@eduplatform/types';

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  class: {
    findFirst: jest.fn(),
  },
  classStudent: {
    create: jest.fn(),
  },
};

const mockAudit = {
  log: jest.fn(() => Promise.resolve()),
};

const mockUsersService = {
  create: jest.fn(),
  findAll: jest.fn(),
  linkParentStudent: jest.fn(),
};

const mockClassesService = {
  invalidateCache: jest.fn(() => Promise.resolve()),
};

describe('StudentsService', () => {
  let service: StudentsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ClassesService, useValue: mockClassesService },
      ],
    }).compile();

    service = module.get<StudentsService>(StudentsService);
  });

  const branchAdmin = {
    sub: 'ba-1',
    email: 'ba@school.uz',
    role: UserRole.BRANCH_ADMIN,
    schoolId: 'school-1',
    branchId: 'branch-alpha',
    isSuperAdmin: false,
  };

  const director = {
    sub: 'dir-1',
    email: 'dir@school.uz',
    role: UserRole.DIRECTOR,
    schoolId: 'school-1',
    branchId: 'branch-alpha',
    isSuperAdmin: false,
  };

  const baseStudentDto = {
    firstName: 'Ali',
    lastName: 'Valiyev',
    email: 'ali@school.uz',
    password: 'Password123!',
  };

  describe('create', () => {
    it('allows BRANCH_ADMIN to create student in own branch', async () => {
      mockUsersService.create.mockResolvedValueOnce({
        id: 'student-1',
        email: baseStudentDto.email,
        role: UserRole.STUDENT,
        branchId: 'branch-alpha',
      });

      const result = await service.create(baseStudentDto, branchAdmin);

      expect(result.role).toBe(UserRole.STUDENT);
      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.STUDENT, branchId: 'branch-alpha' }),
        branchAdmin,
      );
    });

    it('rejects BRANCH_ADMIN creating student in another branch', async () => {
      await expect(
        service.create({ ...baseStudentDto, branchId: 'branch-other' }, branchAdmin),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUsersService.create).not.toHaveBeenCalled();
    });

    it('forces branchId to own branch for BRANCH_ADMIN even if omitted', async () => {
      mockUsersService.create.mockResolvedValueOnce({
        id: 'student-2',
        email: baseStudentDto.email,
        role: UserRole.STUDENT,
        branchId: 'branch-alpha',
      });

      await service.create(baseStudentDto, branchAdmin);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ branchId: 'branch-alpha' }),
        branchAdmin,
      );
    });

    it('allows DIRECTOR to create student in any branch', async () => {
      mockUsersService.create.mockResolvedValueOnce({
        id: 'student-3',
        email: baseStudentDto.email,
        role: UserRole.STUDENT,
        branchId: 'branch-beta',
      });

      const result = await service.create({ ...baseStudentDto, branchId: 'branch-beta' }, director);

      expect(result.role).toBe(UserRole.STUDENT);
    });

    it('enrolls student in class when classId provided', async () => {
      mockUsersService.create.mockResolvedValueOnce({
        id: 'student-4',
        email: baseStudentDto.email,
        role: UserRole.STUDENT,
      });
      mockPrisma.class.findFirst.mockResolvedValueOnce({ id: 'class-1' });
      mockPrisma.classStudent.create.mockResolvedValueOnce({});

      await service.create({ ...baseStudentDto, classId: 'class-1' }, branchAdmin);

      expect(mockPrisma.classStudent.create).toHaveBeenCalledWith({
        data: { classId: 'class-1', studentId: 'student-4' },
      });
    });
  });

  describe('findOne', () => {
    it('allows BRANCH_ADMIN to view student in own branch', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'student-1',
        role: UserRole.STUDENT,
        branchId: 'branch-alpha',
        studentClasses: [],
        childParents: [],
      });

      const result = await service.findOne('student-1', branchAdmin);
      expect(result.id).toBe('student-1');
    });

    it('rejects BRANCH_ADMIN viewing student in another branch', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'student-1',
        role: UserRole.STUDENT,
        branchId: 'branch-other',
        studentClasses: [],
        childParents: [],
      });

      await expect(service.findOne('student-1', branchAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFound when student does not exist', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(service.findOne('unknown', branchAdmin)).rejects.toThrow(NotFoundException);
    });
  });

  describe('linkParent', () => {
    it('allows BRANCH_ADMIN to link existing parent to student in own branch', async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce({ id: 'student-1', role: UserRole.STUDENT, branchId: 'branch-alpha', studentClasses: [], childParents: [] }) // student
        .mockResolvedValueOnce({ id: 'parent-1', role: UserRole.PARENT, branchId: 'branch-alpha' }); // parent

      mockUsersService.linkParentStudent.mockResolvedValueOnce({ id: 'link-1' });

      const result = await service.linkParent('student-1', { parentId: 'parent-1' }, branchAdmin);
      expect(result).toEqual({ id: 'link-1' });
    });

    it('rejects BRANCH_ADMIN linking parent to student from another branch', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'student-1',
        role: UserRole.STUDENT,
        branchId: 'branch-other',
        studentClasses: [],
        childParents: [],
      });

      await expect(
        service.linkParent('student-1', { parentId: 'parent-1' }, branchAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates new parent and links when no parentId provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'student-1',
        role: UserRole.STUDENT,
        branchId: 'branch-alpha',
        studentClasses: [],
        childParents: [],
      });

      mockUsersService.create.mockResolvedValueOnce({ id: 'new-parent-1', role: UserRole.PARENT });
      mockUsersService.linkParentStudent.mockResolvedValueOnce({ id: 'link-2' });

      const result = await service.linkParent('student-1', {
        firstName: 'Vali',
        lastName: 'Aliyev',
        email: 'vali@school.uz',
        password: 'Password123!',
      }, branchAdmin);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: UserRole.PARENT, branchId: 'branch-alpha' }),
        branchAdmin,
      );
      expect(result).toEqual({ id: 'link-2' });
    });

    it('rejects create-and-link when required fields missing', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'student-1',
        role: UserRole.STUDENT,
        branchId: 'branch-alpha',
        studentClasses: [],
        childParents: [],
      });

      await expect(
        service.linkParent('student-1', { firstName: 'Vali' }, branchAdmin),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
