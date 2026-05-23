import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClassesService } from './classes.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { UserRole, JwtPayload } from '@eduplatform/types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  class: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  classStudent: {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
  },
  attendance: { updateMany: jest.fn() },
  grade: { updateMany: jest.fn() },
  schedule: { updateMany: jest.fn() },
  exam: { updateMany: jest.fn() },
  homework: { updateMany: jest.fn() },
  user: { findFirst: jest.fn() },
  $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(mockPrisma) : Promise.resolve(cb))),
};

const mockRedis = {
  getJson: jest.fn(),
  setJson: jest.fn(),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn(),
};

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('ClassesService', () => {
  let service: ClassesService;

  const directorUser: JwtPayload = {
    sub: 'user-dir',
    email: 'dir@test.uz',
    role: UserRole.DIRECTOR,
    schoolId: 'school-1',
    branchId: 'branch-dir',
    isSuperAdmin: false,
  };

  const vpUser: JwtPayload = {
    sub: 'user-vp',
    email: 'vp@test.uz',
    role: UserRole.VICE_PRINCIPAL,
    schoolId: 'school-1',
    branchId: 'branch-1',
    assignedBranchIds: ['branch-1'],
    isSuperAdmin: false,
  };

  const branchAdminUser: JwtPayload = {
    sub: 'user-ba',
    email: 'ba@test.uz',
    role: UserRole.BRANCH_ADMIN,
    schoolId: 'school-1',
    branchId: 'branch-2',
    assignedBranchIds: ['branch-2'],
    isSuperAdmin: false,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  // ── BranchId validation (BUG: duplicate branch in dropdown) ────────────────

  describe('create() branchId validation', () => {
    it('allows director to create class without explicit branchId (defaults to their branchId)', async () => {
      mockPrisma.class.create.mockResolvedValue({ id: 'class-1', name: '5-A', branchId: 'branch-dir' });

      const result = await service.create(
        { name: '5-A', gradeLevel: 5, academicYear: '2025-2026' },
        directorUser,
      );

      expect(result.branchId).toBe('branch-dir');
    });

    it('allows director to create class in any branch', async () => {
      mockPrisma.class.create.mockResolvedValue({ id: 'class-1', name: '5-A', branchId: 'branch-3' });

      const result = await service.create(
        { name: '5-A', gradeLevel: 5, academicYear: '2025-2026', branchId: 'branch-3' },
        directorUser,
      );

      expect(result.branchId).toBe('branch-3');
    });

    it('allows vice_principal to create class in their own branch', async () => {
      mockPrisma.class.create.mockResolvedValue({ id: 'class-1', name: '5-A', branchId: 'branch-1' });

      const result = await service.create(
        { name: '5-A', gradeLevel: 5, academicYear: '2025-2026', branchId: 'branch-1' },
        vpUser,
      );

      expect(mockPrisma.class.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ branchId: 'branch-1' }),
        }),
      );
      expect(result.branchId).toBe('branch-1');
    });

    it('defaults branchId to currentUser.branchId for vice_principal when not provided', async () => {
      mockPrisma.class.create.mockResolvedValue({ id: 'class-1', name: '5-A', branchId: 'branch-1' });

      const result = await service.create(
        { name: '5-A', gradeLevel: 5, academicYear: '2025-2026' },
        vpUser,
      );

      expect(mockPrisma.class.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ branchId: 'branch-1' }),
        }),
      );
      expect(result.branchId).toBe('branch-1');
    });

    it('rejects vice_principal creating class in a disallowed branch', async () => {
      await expect(
        service.create(
          { name: '5-A', gradeLevel: 5, academicYear: '2025-2026', branchId: 'branch-2' },
          vpUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects branch_admin creating class in a disallowed branch', async () => {
      await expect(
        service.create(
          { name: '5-A', gradeLevel: 5, academicYear: '2025-2026', branchId: 'branch-1' },
          branchAdminUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove() branchId validation', () => {
    it('allows vice_principal to remove a class in their own branch', async () => {
      mockPrisma.class.findFirst.mockResolvedValue({ id: 'class-1', name: '5-A', branchId: 'branch-1' });
      mockPrisma.classStudent.count.mockResolvedValue(0);
      mockPrisma.class.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.remove('class-1', vpUser);

      expect(result.message).toBe('Sinf o‘chirildi');
    });

    it('rejects vice_principal removing a class from another branch', async () => {
      mockPrisma.class.findFirst.mockResolvedValue({ id: 'class-2', name: '6-A', branchId: 'branch-2' });

      await expect(service.remove('class-2', vpUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update() branchId validation', () => {
    it('rejects vice_principal changing class to a disallowed branch', async () => {
      mockPrisma.class.findFirst.mockResolvedValue({ id: 'class-1', name: '5-A', branchId: 'branch-1' });
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'class-1', branchId: 'branch-1' });

      await expect(
        service.update(
          'class-1',
          { branchId: 'branch-2' },
          vpUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects vice_principal updating a class from another branch even without changing branchId', async () => {
      // VP is assigned to branch-1, but the class belongs to branch-2
      mockPrisma.class.findFirst.mockResolvedValue({ id: 'class-2', name: '6-A', branchId: 'branch-2' });

      await expect(
        service.update(
          'class-2',
          { name: '6-B' },
          vpUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows vice_principal updating class within their allowed branch', async () => {
      mockPrisma.class.findFirst.mockResolvedValue({ id: 'class-1', name: '5-A' });
      mockPrisma.class.findUnique.mockResolvedValue({ id: 'class-1', branchId: 'branch-1' });
      mockPrisma.class.update.mockResolvedValue({ id: 'class-1', name: '5-B', branchId: 'branch-1' });
      mockPrisma.attendance.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.grade.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.schedule.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.exam.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.homework.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.update(
        'class-1',
        { name: '5-B' },
        vpUser,
      );

      expect(result.name).toBe('5-B');
    });
  });
});
