import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { AuthService } from '@/modules/auth/auth.service';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  school: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  branch: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  schoolModule: {
    createMany: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
  systemConfig: {
    createMany: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  subscription: {
    count: jest.fn(),
    upsert: jest.fn(),
  },
  notification: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  $executeRaw: jest.fn(() => Promise.resolve(0)),
};

const mockAudit = {
  log: jest.fn(() => Promise.resolve()),
};

const mockAuth = {
  logoutAll: jest.fn(() => Promise.resolve()),
  generateImpersonationTokens: jest.fn(() =>
    Promise.resolve({ accessToken: 'imp-token', refreshToken: '', expiresIn: 1800 }),
  ),
};

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('SuperAdminService', () => {
  let service: SuperAdminService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuperAdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compile();

    service = module.get<SuperAdminService>(SuperAdminService);
  });

  // ── createSchool default branch name (BUG 4 regression) ──────────────────

  describe('createSchool()', () => {
    it('creates default branch named "Asosiy filial"', async () => {
      const dto = {
        name: 'Test Maktab',
        slug: 'test-maktab',
        address: 'Toshkent',
        phone: '+998901234567',
        email: 'info@test.uz',
      };

      mockPrisma.school.findFirst.mockResolvedValueOnce(null); // slug unique
      mockPrisma.school.create.mockResolvedValueOnce({
        id: 'school-1',
        name: dto.name,
        slug: dto.slug,
      });
      mockPrisma.branch.create.mockResolvedValueOnce({
        id: 'branch-1',
        schoolId: 'school-1',
        name: 'Asosiy filial',
        code: 'MAIN',
      });
      mockPrisma.schoolModule.createMany.mockResolvedValueOnce({ count: 5 });
      mockPrisma.school.update.mockResolvedValueOnce({
        id: 'school-1',
        mainBranchId: 'branch-1',
      });

      const result = await service.createSchool(dto as any);

      expect(mockPrisma.systemConfig.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ schoolId: 'school-1', key: 'school_name', value: 'Test Maktab' }),
          expect.objectContaining({ schoolId: 'school-1', key: 'school_address', value: 'Toshkent' }),
          expect.objectContaining({ schoolId: 'school-1', key: 'school_phone', value: '+998901234567' }),
          expect.objectContaining({ schoolId: 'school-1', key: 'academic_year', value: '2025-2026' }),
        ]),
      });
      expect(mockPrisma.branch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          schoolId: 'school-1',
          name: 'Asosiy filial',
          code: 'MAIN',
          isActive: true,
        }),
      });
      expect(result.mainBranchId).toBe('branch-1');
    });

    it('does not create branch named "Main Campus"', async () => {
      const dto = {
        name: 'Test Maktab',
        slug: 'test-maktab-2',
        address: 'Toshkent',
        phone: '+998901234567',
        email: 'info@test.uz',
      };

      mockPrisma.school.findFirst.mockResolvedValueOnce(null);
      mockPrisma.school.create.mockResolvedValueOnce({
        id: 'school-2',
        name: dto.name,
        slug: dto.slug,
      });
      mockPrisma.branch.create.mockResolvedValueOnce({
        id: 'branch-2',
        schoolId: 'school-2',
        name: 'Asosiy filial',
        code: 'MAIN',
      });
      mockPrisma.schoolModule.createMany.mockResolvedValueOnce({ count: 5 });
      mockPrisma.school.update.mockResolvedValueOnce({
        id: 'school-2',
        mainBranchId: 'branch-2',
      });

      await service.createSchool(dto as any);

      const branchCall = mockPrisma.branch.create.mock.calls[0][0];
      expect(branchCall.data.name).not.toBe('Main Campus');
      expect(branchCall.data.name).toBe('Asosiy filial');
    });
  });

  // ── updateSchool syncs to SystemConfig ─────────────────────────────────────

  describe('updateSchool()', () => {
    it('syncs updated fields to SystemConfig', async () => {
      const dto = {
        name: 'Updated Maktab',
        phone: '+998999999999',
      };

      mockPrisma.school.findUnique.mockResolvedValueOnce({ id: 'school-1', name: 'Old', deletedAt: null });
      mockPrisma.school.update.mockResolvedValueOnce({ id: 'school-1', ...dto });
      mockPrisma.systemConfig.upsert.mockResolvedValue({});

      await service.updateSchool('school-1', dto);

      expect(mockPrisma.school.update).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        data: dto,
      });
      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledTimes(2);
      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { schoolId_key: { schoolId: 'school-1', key: 'school_name' } },
        create: { schoolId: 'school-1', key: 'school_name', value: 'Updated Maktab' },
        update: { value: 'Updated Maktab' },
      });
      expect(mockPrisma.systemConfig.upsert).toHaveBeenCalledWith({
        where: { schoolId_key: { schoolId: 'school-1', key: 'school_phone' } },
        create: { schoolId: 'school-1', key: 'school_phone', value: '+998999999999' },
        update: { value: '+998999999999' },
      });
    });

    it('does not touch SystemConfig when only slug is updated', async () => {
      const dto = { slug: 'new-slug' };

      mockPrisma.school.findUnique.mockResolvedValueOnce({ id: 'school-1', name: 'Old', deletedAt: null });
      mockPrisma.school.update.mockResolvedValueOnce({ id: 'school-1', slug: 'new-slug' });

      await service.updateSchool('school-1', dto);

      expect(mockPrisma.school.update).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        data: dto,
      });
      expect(mockPrisma.systemConfig.upsert).not.toHaveBeenCalled();
    });
  });

  // ── getSchools excludes deleted schools ────────────────────────────────────

  describe('getSchools()', () => {
    it('excludes deleted schools from list', async () => {
      mockPrisma.school.findMany.mockResolvedValueOnce([]);
      mockPrisma.school.count.mockResolvedValueOnce(0);

      await service.getSchools(1, 20);

      expect(mockPrisma.school.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
      expect(mockPrisma.school.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });

  // ── getSchool returns 404 for deleted school ───────────────────────────────

  describe('getSchool()', () => {
    it('returns 404 for deleted school', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({
        id: 'school-del',
        name: 'Deleted',
        deletedAt: new Date(),
      });

      await expect(service.getSchool('school-del')).rejects.toThrow(NotFoundException);
    });

    it('returns school when not deleted', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({
        id: 'school-1',
        name: 'Active',
        deletedAt: null,
      });

      const result = await service.getSchool('school-1');
      expect(result.name).toBe('Active');
    });
  });

  // ── deleteSchool soft delete ───────────────────────────────────────────────

  describe('deleteSchool()', () => {
    const superAdmin = { sub: 'admin-1', role: 'super_admin' } as any;

    it('soft deletes school, deactivates users, revokes sessions, and logs audit', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({
        id: 'school-1',
        name: 'Test School',
        slug: 'test-school',
        deletedAt: null,
      });
      mockPrisma.school.update.mockResolvedValueOnce({ id: 'school-1', deletedAt: new Date() });
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' },
      ]);

      const result = await service.deleteSchool('school-1', superAdmin);

      expect(mockPrisma.school.update).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedById: 'admin-1',
          isActive: false,
        }),
      });
      // Foydalanuvchi email'lari raw SQL bilan suffikslanadi va isActive=false qilinadi
      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockAuth.logoutAll).toHaveBeenCalledTimes(3);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'school_deleted',
          entity: 'School',
          entityId: 'school-1',
        }),
      );
      expect(result.schoolId).toBe('school-1');
    });

    it('throws 404 for non-existent school', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce(null);

      await expect(service.deleteSchool('nonexistent', superAdmin)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if school already deleted', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({
        id: 'school-1',
        name: 'Deleted School',
        deletedAt: new Date(),
      });

      await expect(service.deleteSchool('school-1', superAdmin)).rejects.toThrow(ConflictException);
    });
  });

  // ── getPlatformStats excludes deleted schools ──────────────────────────────

  describe('getPlatformStats()', () => {
    it('counts only non-deleted active schools', async () => {
      mockPrisma.school.count.mockResolvedValueOnce(5);
      mockPrisma.user.count.mockResolvedValueOnce(100);
      mockPrisma.subscription.count.mockResolvedValueOnce(3);

      await service.getPlatformStats();

      expect(mockPrisma.school.count).toHaveBeenCalledWith({
        where: { isActive: true, deletedAt: null },
      });
    });
  });

  // ── suspendSchool / reactivateSchool ───────────────────────────────────────

  describe('suspendSchool()', () => {
    const superAdmin = { sub: 'admin-1', role: 'super_admin' } as any;

    it('suspends school, revokes sessions, logs audit, does NOT deactivate users', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({
        id: 'school-1', name: 'Test', isActive: true, deletedAt: null,
      });
      mockPrisma.school.update.mockResolvedValueOnce({ id: 'school-1', isActive: false });
      mockPrisma.user.findMany.mockResolvedValueOnce([{ id: 'u1' }, { id: 'u2' }]);

      const result = await service.suspendSchool('school-1', superAdmin);

      expect(mockPrisma.school.update).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        data: { isActive: false },
      });
      expect(mockPrisma.user.updateMany).not.toHaveBeenCalled();
      expect(mockAuth.logoutAll).toHaveBeenCalledTimes(2);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entity: 'School',
          newData: expect.objectContaining({ event: 'school_suspended', revokedUsers: 2 }),
        }),
      );
      expect(result.schoolId).toBe('school-1');
    });

    it('throws Conflict when already suspended', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({
        id: 'school-1', name: 'Test', isActive: false, deletedAt: null,
      });
      await expect(service.suspendSchool('school-1', superAdmin)).rejects.toThrow(ConflictException);
    });

    it('throws 404 for deleted school', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({
        id: 'school-1', name: 'Test', isActive: true, deletedAt: new Date(),
      });
      await expect(service.suspendSchool('school-1', superAdmin)).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivateSchool()', () => {
    const superAdmin = { sub: 'admin-1', role: 'super_admin' } as any;

    it('reactivates suspended school without touching sessions', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({
        id: 'school-1', name: 'Test', isActive: false, deletedAt: null,
      });
      mockPrisma.school.update.mockResolvedValueOnce({ id: 'school-1', isActive: true });

      await service.reactivateSchool('school-1', superAdmin);

      expect(mockPrisma.school.update).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        data: { isActive: true },
      });
      expect(mockAuth.logoutAll).not.toHaveBeenCalled();
    });

    it('throws Conflict when already active', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({
        id: 'school-1', name: 'Test', isActive: true, deletedAt: null,
      });
      await expect(service.reactivateSchool('school-1', superAdmin)).rejects.toThrow(ConflictException);
    });
  });

  // ── updateSubscription ─────────────────────────────────────────────────────

  describe('updateSubscription()', () => {
    const superAdmin = { sub: 'admin-1', role: 'super_admin' } as any;

    it('upserts subscription and syncs subscriptionTier when plan present', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({ id: 'school-1', deletedAt: null });
      mockPrisma.subscription.upsert.mockResolvedValueOnce({ id: 'sub-1', plan: 'premium' });
      mockPrisma.school.update.mockResolvedValueOnce({ id: 'school-1' });

      await service.updateSubscription('school-1', { plan: 'premium', status: 'active' } as any, superAdmin);

      expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { schoolId: 'school-1' },
          update: expect.objectContaining({ plan: 'premium', status: 'active' }),
        }),
      );
      // plan berilgani uchun school.subscriptionTier ham yangilanadi
      expect(mockPrisma.school.update).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        data: { subscriptionTier: 'premium' },
      });
    });

    it('does not touch school tier when plan absent', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({ id: 'school-1', deletedAt: null });
      mockPrisma.subscription.upsert.mockResolvedValueOnce({ id: 'sub-1' });

      await service.updateSubscription('school-1', { status: 'expired' } as any, superAdmin);

      expect(mockPrisma.school.update).not.toHaveBeenCalled();
    });
  });

  // ── impersonate ────────────────────────────────────────────────────────────

  describe('impersonate()', () => {
    const superAdmin = { sub: 'admin-1', email: 'super@x.uz', role: 'super_admin' } as any;
    const activeSchool = { id: 'school-1', name: 'Test', isActive: true, deletedAt: null };

    it('issues impersonation tokens for active director and logs audit', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce(activeSchool);
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'dir-1', email: 'dir@x.uz', firstName: 'D', lastName: 'I',
        role: 'director', schoolId: 'school-1', branchId: 'b1', isActive: true,
      });

      const result = await service.impersonate('school-1', { userId: 'dir-1' }, superAdmin);

      expect(mockAuth.generateImpersonationTokens).toHaveBeenCalledWith('dir-1', superAdmin);
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity: 'Impersonation', action: 'login', entityId: 'dir-1' }),
      );
      expect(result.tokens.accessToken).toBe('imp-token');
      expect(result.impersonation.schoolName).toBe('Test');
      expect((result.user as any).isFirstLogin).toBe(false);
    });

    it('rejects target from another school (404)', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce(activeSchool);
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.impersonate('school-1', { userId: 'other' }, superAdmin),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects non-leadership roles (403)', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce(activeSchool);
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 't1', role: 'teacher', isActive: true,
      });
      await expect(
        service.impersonate('school-1', { userId: 't1' }, superAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects suspended school (403)', async () => {
      mockPrisma.school.findUnique.mockResolvedValueOnce({ ...activeSchool, isActive: false });
      await expect(
        service.impersonate('school-1', { userId: 'dir-1' }, superAdmin),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── broadcastToDirectors ───────────────────────────────────────────────────

  describe('broadcastToDirectors()', () => {
    const superAdmin = { sub: 'admin-1', role: 'super_admin' } as any;

    it('creates notifications for directors with branch fallback', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: 'd1', schoolId: 's1', branchId: 'b1' },
        { id: 'd2', schoolId: 's2', branchId: null }, // fallback kerak
      ]);
      mockPrisma.branch.findMany.mockResolvedValueOnce([
        { id: 'b2-first', schoolId: 's2' },
      ]);
      mockPrisma.notification.createMany.mockResolvedValueOnce({ count: 2 });

      const result = await service.broadcastToDirectors(
        { title: 'Yangilik', body: 'Matn' } as any,
        superAdmin,
      );

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ recipientId: 'd1', branchId: 'b1', category: 'announcement' }),
          expect.objectContaining({ recipientId: 'd2', branchId: 'b2-first' }),
        ]),
      });
      expect(result.sent).toBe(2);
      expect(result.skipped).toBe(0);
    });

    it('skips directors whose school has no branch', async () => {
      mockPrisma.user.findMany.mockResolvedValueOnce([
        { id: 'd1', schoolId: 's1', branchId: null },
      ]);
      mockPrisma.branch.findMany.mockResolvedValueOnce([]);

      const result = await service.broadcastToDirectors(
        { title: 'Yangilik', body: 'Matn' } as any,
        superAdmin,
      );

      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
      expect(result.sent).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });
});
