import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PeriodsService, CreatePeriodDto, UpdatePeriodDto } from './periods.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockDirector: JwtPayload = {
  sub: 'user-1', email: 'd@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockBranchAdmin: JwtPayload = {
  sub: 'user-2', email: 'b@test.com', role: UserRole.BRANCH_ADMIN,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockVP: JwtPayload = {
  sub: 'user-3', email: 'vp@test.com', role: UserRole.VICE_PRINCIPAL,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

describe('PeriodsService', () => {
  let service: PeriodsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      period: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeriodsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PeriodsService>(PeriodsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all periods for Director (school-wide)', async () => {
      prisma.period.findMany.mockResolvedValue([{ id: 'p1', branchId: 'branch-1' }]);
      const result = await service.findAll(mockDirector);
      expect(result).toHaveLength(1);
      expect(prisma.period.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: 'school-1' } }),
      );
    });

    it('should scope to branch for Branch Admin', async () => {
      prisma.period.findMany.mockResolvedValue([{ id: 'p1', branchId: 'branch-1' }]);
      const result = await service.findAll(mockBranchAdmin);
      expect(prisma.period.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ branchId: 'branch-1' }) }),
      );
    });

    it('should reject cross-branch read for Branch Admin', async () => {
      await expect(service.findAll(mockBranchAdmin, 'branch-2'))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('should create a period for Director', async () => {
      prisma.period.findFirst.mockResolvedValue(null);
      prisma.period.create.mockResolvedValue({ id: 'p1', periodNumber: 1 });

      const dto: CreatePeriodDto = { periodNumber: 1, startTime: '08:00', endTime: '08:45' };
      const result = await service.create(dto, mockDirector);

      expect(result.id).toBe('p1');
      expect(prisma.period.create).toHaveBeenCalled();
    });

    it('should create a period for Branch Admin in own branch', async () => {
      prisma.period.findFirst.mockResolvedValue(null);
      prisma.period.create.mockResolvedValue({ id: 'p1', periodNumber: 1, branchId: 'branch-1' });

      const dto: CreatePeriodDto = { periodNumber: 1, startTime: '08:00', endTime: '08:45' };
      const result = await service.create(dto, mockBranchAdmin);

      expect(result.branchId).toBe('branch-1');
    });

    it('should reject duplicate periodNumber', async () => {
      prisma.period.findFirst.mockResolvedValue({ id: 'existing' });

      const dto: CreatePeriodDto = { periodNumber: 1, startTime: '08:00', endTime: '08:45' };
      await expect(service.create(dto, mockDirector))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update a period', async () => {
      prisma.period.findFirst.mockResolvedValue({ id: 'p1', branchId: 'branch-1' });
      prisma.period.update.mockResolvedValue({ id: 'p1', startTime: '09:00' });

      const result = await service.update('p1', { startTime: '09:00' }, mockDirector);
      expect(result.startTime).toBe('09:00');
    });

    it('should reject cross-branch update for Branch Admin', async () => {
      prisma.period.findFirst.mockResolvedValue({ id: 'p1', branchId: 'branch-2' });

      await expect(service.update('p1', {}, mockBranchAdmin))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete a period', async () => {
      prisma.period.findFirst.mockResolvedValue({ id: 'p1', branchId: 'branch-1' });
      prisma.period.delete.mockResolvedValue({});

      const result = await service.remove('p1', mockDirector);
      expect(result.message).toContain('chirildi');
    });

    it('should reject cross-branch delete for Branch Admin', async () => {
      prisma.period.findFirst.mockResolvedValue({ id: 'p1', branchId: 'branch-2' });

      await expect(service.remove('p1', mockBranchAdmin))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('resolvePeriod', () => {
    it('should return period times', async () => {
      prisma.period.findFirst.mockResolvedValue({ startTime: '08:00', endTime: '08:45' });

      const result = await service.resolvePeriod('school-1', 'branch-1', 1);

      expect(result).toEqual({ startTime: '08:00', endTime: '08:45' });
    });

    it('should return null if period not found', async () => {
      prisma.period.findFirst.mockResolvedValue(null);

      const result = await service.resolvePeriod('school-1', 'branch-1', 99);

      expect(result).toBeNull();
    });
  });
});
