import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockPrisma = {
  school: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  branch: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  schoolModule: {
    createMany: jest.fn(),
  },
};

const mockAudit = {
  log: jest.fn(() => Promise.resolve()),
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
});
