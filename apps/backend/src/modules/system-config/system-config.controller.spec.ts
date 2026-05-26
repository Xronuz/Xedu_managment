import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@eduplatform/types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockService = {
  getAll: jest.fn(),
  setBulk: jest.fn(),
};

const mockPrisma = {
  school: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  branch: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  user: {
    count: jest.fn(),
  },
  class: {
    count: jest.fn(),
  },
  subject: {
    count: jest.fn(),
  },
  systemConfig: {
    findUnique: jest.fn(),
  },
  period: {
    count: jest.fn(),
  },
  room: {
    count: jest.fn(),
  },
  teachingLoad: {
    count: jest.fn(),
  },
  schedule: {
    count: jest.fn(),
  },
};

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('SystemConfigController', () => {
  let controller: SystemConfigController;

  const directorUser = {
    sub: 'user-1',
    email: 'dir@test.uz',
    role: UserRole.DIRECTOR,
    schoolId: 'school-1',
    branchId: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigController],
      providers: [
        { provide: SystemConfigService, useValue: mockService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true } as CanActivate)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true } as CanActivate)
      .compile();

    controller = module.get<SystemConfigController>(SystemConfigController);
  });

  // ── PATCH /system-config syncs School model ──────────────────────────────

  describe('update()', () => {
    it('syncs school profile fields to School model', async () => {
      const dto = {
        school_name: 'Yangi Maktab',
        school_phone: '+998901112233',
        school_address: 'Samarqand',
        academic_year: '2026-2027',
      };

      mockService.setBulk.mockResolvedValue(undefined);
      mockService.getAll.mockResolvedValue({
        school_name: 'Yangi Maktab',
        school_phone: '+998901112233',
        school_address: 'Samarqand',
        academic_year: '2026-2027',
      });
      mockPrisma.school.update.mockResolvedValue({ id: 'school-1' });

      const result = await controller.update(directorUser as any, dto as any);

      expect(mockService.setBulk).toHaveBeenCalledWith('school-1', dto);
      expect(mockPrisma.school.update).toHaveBeenCalledWith({
        where: { id: 'school-1' },
        data: {
          name: 'Yangi Maktab',
          phone: '+998901112233',
          address: 'Samarqand',
        },
      });
      expect(result.school_name).toBe('Yangi Maktab');
    });

    it('does not update School model when only bhm is changed', async () => {
      const dto = { bhm: 1_200_000 };

      mockService.setBulk.mockResolvedValue(undefined);
      mockService.getAll.mockResolvedValue({ bhm: 1_200_000 });

      await controller.update(directorUser as any, dto as any);

      expect(mockService.setBulk).toHaveBeenCalledWith('school-1', dto);
      expect(mockPrisma.school.update).not.toHaveBeenCalled();
    });
  });

  // ── GET /system-config/onboarding-computed ─────────────────────────────────

  describe('getOnboardingComputed()', () => {
    it('returns completed when all data is present', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        name: 'Test Maktab',
        phone: '+998901112233',
        address: 'Toshkent',
        readinessScore: 80,
      });
      mockPrisma.systemConfig.findUnique.mockResolvedValue({ value: '2025-2026' });
      mockPrisma.branch.findMany.mockResolvedValue([{ id: 'b1', name: 'Asosiy' }]);
      mockPrisma.user.count.mockResolvedValue(5);
      mockPrisma.class.count.mockResolvedValue(3);
      mockPrisma.subject.count.mockResolvedValue(5);
      mockPrisma.period.count.mockResolvedValue(6);
      mockPrisma.room.count.mockResolvedValue(5);
      mockPrisma.teachingLoad.count.mockResolvedValue(10);
      mockPrisma.schedule.count.mockResolvedValue(20);

      const result = await controller.getOnboardingComputed(directorUser as any);

      expect(result.schoolProfile.completed).toBe(true);
      expect(result.branches.completed).toBe(true);
      expect(result.staff.completed).toBe(true);
      expect(result.education.completed).toBe(true);
      expect(result.periods.completed).toBe(true);
      expect(result.rooms.completed).toBe(true);
      expect(result.teachingLoads.completed).toBe(true);
      expect(result.timetable.completed).toBe(true);
      expect(result.overallCompleted).toBe(true);
      expect(result.readinessScore).toBe(80);
    });

    it('returns missing fields when data is incomplete', async () => {
      mockPrisma.school.findUnique.mockResolvedValue({
        name: '',
        phone: null,
        address: null,
        readinessScore: 0,
      });
      mockPrisma.systemConfig.findUnique.mockResolvedValue(null);
      mockPrisma.branch.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.class.count.mockResolvedValue(0);
      mockPrisma.subject.count.mockResolvedValue(0);
      mockPrisma.period.count.mockResolvedValue(0);
      mockPrisma.room.count.mockResolvedValue(0);
      mockPrisma.teachingLoad.count.mockResolvedValue(0);
      mockPrisma.schedule.count.mockResolvedValue(0);

      const result = await controller.getOnboardingComputed(directorUser as any);

      expect(result.schoolProfile.completed).toBe(false);
      expect(result.schoolProfile.missing).toContain('name');
      expect(result.schoolProfile.missing).toContain('phone');
      expect(result.schoolProfile.missing).toContain('address');
      expect(result.schoolProfile.missing).toContain('academic_year');
      expect(result.branches.completed).toBe(false);
      expect(result.staff.completed).toBe(false);
      expect(result.education.completed).toBe(false);
      expect(result.periods.completed).toBe(false);
      expect(result.rooms.completed).toBe(false);
      expect(result.teachingLoads.completed).toBe(false);
      expect(result.timetable.completed).toBe(false);
      expect(result.overallCompleted).toBe(false);
    });
  });
});
