import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { AuthService } from '@/modules/auth/auth.service';
import { UserRole } from '@eduplatform/types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  branch: {
    findFirst: jest.fn(),
  },
};

const mockAudit = {
  log: jest.fn(() => Promise.resolve()),
};

const mockAuth = {
  logoutAll: jest.fn(() => Promise.resolve()),
};

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  // ── Role creation matrix (BUG 2 regression) ──────────────────────────────

  describe('ROLE_CREATION_MATRIX — Super Admin restrictions', () => {
    const superAdmin = {
      sub: 'super-admin-1',
      email: 'super@admin.uz',
      role: UserRole.SUPER_ADMIN,
      schoolId: 'school-1',
      branchId: 'branch-1',
      isSuperAdmin: true,
    };

    const baseDto = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@user.uz',
      password: 'Password123!',
      schoolId: 'school-1',
      branchId: 'branch-1',
    };

    it('allows SUPER_ADMIN to create DIRECTOR', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null); // no duplicate email
      mockPrisma.branch.findFirst.mockResolvedValueOnce({ id: 'branch-1' });
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-1', email: baseDto.email, role: UserRole.DIRECTOR });

      const result = await service.create({ ...baseDto, role: UserRole.DIRECTOR }, superAdmin);

      expect(result.role).toBe(UserRole.DIRECTOR);
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('rejects SUPER_ADMIN creating TEACHER', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.TEACHER }, superAdmin),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects SUPER_ADMIN creating VICE_PRINCIPAL', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.VICE_PRINCIPAL }, superAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects SUPER_ADMIN creating ACCOUNTANT', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.ACCOUNTANT }, superAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects SUPER_ADMIN creating CLASS_TEACHER', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.CLASS_TEACHER }, superAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects SUPER_ADMIN creating LIBRARIAN', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.LIBRARIAN }, superAdmin),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ROLE_CREATION_MATRIX — Director still can create staff', () => {
    const director = {
      sub: 'director-1',
      email: 'dir@school.uz',
      role: UserRole.DIRECTOR,
      schoolId: 'school-1',
      branchId: 'branch-1',
      isSuperAdmin: false,
    };

    const baseDto = {
      firstName: 'Test',
      lastName: 'User',
      email: 'staff@school.uz',
      password: 'Password123!',
      branchId: 'branch-1',
    };

    it('allows DIRECTOR to create TEACHER', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-2', email: baseDto.email, role: UserRole.TEACHER });

      const result = await service.create({ ...baseDto, role: UserRole.TEACHER }, director);

      expect(result.role).toBe(UserRole.TEACHER);
    });

    it('allows DIRECTOR to create VICE_PRINCIPAL', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-3', email: baseDto.email, role: UserRole.VICE_PRINCIPAL });

      const result = await service.create({ ...baseDto, role: UserRole.VICE_PRINCIPAL }, director);

      expect(result.role).toBe(UserRole.VICE_PRINCIPAL);
    });
  });

  describe('BRANCH_ADMIN hard restrictions — RBAC security', () => {
    const branchAdmin = {
      sub: 'branch-admin-1',
      email: 'ba@school.uz',
      role: UserRole.BRANCH_ADMIN,
      schoolId: 'school-1',
      branchId: 'branch-alpha',
      isSuperAdmin: false,
    };

    const baseDto = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@school.uz',
      password: 'Password123!',
      branchId: 'branch-alpha',
    };

    it('rejects BRANCH_ADMIN creating BRANCH_ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.BRANCH_ADMIN }, branchAdmin),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects BRANCH_ADMIN creating DIRECTOR', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.DIRECTOR }, branchAdmin),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects BRANCH_ADMIN creating VICE_PRINCIPAL', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.VICE_PRINCIPAL }, branchAdmin),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects BRANCH_ADMIN creating SUPER_ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.SUPER_ADMIN }, branchAdmin),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects BRANCH_ADMIN creating user in another branch', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.create({ ...baseDto, role: UserRole.TEACHER, branchId: 'branch-other' }, branchAdmin),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('allows BRANCH_ADMIN creating TEACHER in own branch', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-4', email: baseDto.email, role: UserRole.TEACHER });

      const result = await service.create({ ...baseDto, role: UserRole.TEACHER }, branchAdmin);

      expect(result.role).toBe(UserRole.TEACHER);
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ branchId: 'branch-alpha' }) }),
      );
    });

    it('allows BRANCH_ADMIN creating ACCOUNTANT in own branch', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-5', email: baseDto.email, role: UserRole.ACCOUNTANT });

      const result = await service.create({ ...baseDto, role: UserRole.ACCOUNTANT }, branchAdmin);

      expect(result.role).toBe(UserRole.ACCOUNTANT);
    });

    it('allows BRANCH_ADMIN creating LIBRARIAN in own branch', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-6', email: baseDto.email, role: UserRole.LIBRARIAN });

      const result = await service.create({ ...baseDto, role: UserRole.LIBRARIAN }, branchAdmin);

      expect(result.role).toBe(UserRole.LIBRARIAN);
    });

    it('allows BRANCH_ADMIN creating STUDENT in own branch', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-7', email: baseDto.email, role: UserRole.STUDENT });

      const result = await service.create({ ...baseDto, role: UserRole.STUDENT }, branchAdmin);

      expect(result.role).toBe(UserRole.STUDENT);
    });

    it('allows BRANCH_ADMIN creating PARENT in own branch', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-8', email: baseDto.email, role: UserRole.PARENT });

      const result = await service.create({ ...baseDto, role: UserRole.PARENT }, branchAdmin);

      expect(result.role).toBe(UserRole.PARENT);
    });

    it('forces branchId to own branch even if payload omits it', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValueOnce({ id: 'new-user-9', email: baseDto.email, role: UserRole.TEACHER });

      const result = await service.create(
        { firstName: 'A', lastName: 'B', email: 'a@b.uz', password: 'Password123!', role: UserRole.TEACHER },
        branchAdmin,
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ branchId: 'branch-alpha' }) }),
      );
    });
  });
});
