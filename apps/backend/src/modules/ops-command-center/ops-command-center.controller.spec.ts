import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, CanActivate } from '@nestjs/common';
import { OpsCommandCenterController } from './ops-command-center.controller';
import { OpsCommandCenterService } from './ops-command-center.service';
import { RedisService } from '@/common/redis/redis.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockGuard: CanActivate = { canActivate: jest.fn(() => true) };

const mockDirector: JwtPayload = {
  sub: 'user-1', email: 'director@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockBranchAdmin: JwtPayload = {
  sub: 'user-2', email: 'branch@test.com', role: UserRole.BRANCH_ADMIN,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockRedisService = {
  smembers: jest.fn().mockResolvedValue([]),
  sadd: jest.fn(),
  expire: jest.fn(),
};

describe('OpsCommandCenterController', () => {
  let controller: OpsCommandCenterController;
  let service: any;

  beforeEach(async () => {
    service = {
      getTodaySummary: jest.fn(),
      getAlerts: jest.fn(),
      getReadinessScore: jest.fn(),
      recalculateReadiness: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpsCommandCenterController],
      providers: [
        { provide: OpsCommandCenterService, useValue: service },
        { provide: RedisService, useValue: mockRedisService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<OpsCommandCenterController>(OpsCommandCenterController);
    jest.clearAllMocks();
  });

  // ─── Today Summary ─────────────────────────────────────────────────────────

  describe('GET /ops/today-summary', () => {
    it('should return today summary', async () => {
      const expected = {
        date: '2026-05-21',
        schoolId: 'school-1',
        stats: { totalClassesToday: 10, totalTeachersToday: 5, periodsConfigured: true, roomsConfigured: true },
        schedule: { publishedSlots: 24, draftSlots: 3, conflicts: 0 },
        staff: { teachersPresent: 5, teachersAbsent: 0, teachersSubstituted: 0, pendingLeaveRequests: 0 },
        substitutions: { pendingProposals: 0, activeToday: 0 },
        payroll: { currentMonthStatus: 'missing', missingAttendanceCount: 0 },
        alerts: { critical: 0, warning: 0, info: 0 },
      };
      service.getTodaySummary.mockResolvedValue(expected);

      const result = await controller.getTodaySummary(mockDirector);

      expect(result).toEqual(expected);
      expect(service.getTodaySummary).toHaveBeenCalledWith(mockDirector, undefined);
    });

    it('should pass branchId query param', async () => {
      service.getTodaySummary.mockResolvedValue({ schoolId: 'school-1', branchId: 'branch-1' });

      await controller.getTodaySummary(mockDirector, 'branch-1');

      expect(service.getTodaySummary).toHaveBeenCalledWith(mockDirector, 'branch-1');
    });
  });

  // ─── Alerts ────────────────────────────────────────────────────────────────

  describe('GET /ops/alerts', () => {
    it('should return alerts excluding acknowledged', async () => {
      const alerts = [
        { id: 'setup:periods', severity: 'critical', category: 'setup', title: 'Test', description: 'Test', createdAt: '' },
        { id: 'setup:rooms', severity: 'warning', category: 'setup', title: 'Test', description: 'Test', createdAt: '' },
      ];
      service.getAlerts.mockResolvedValue(alerts);
      mockRedisService.smembers.mockResolvedValue(['setup:periods']);

      const result = await controller.getAlerts(mockDirector);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('setup:rooms');
    });
  });

  describe('POST /ops/alerts/:id/acknowledge', () => {
    it('should acknowledge alert in Redis', async () => {
      const result = await controller.acknowledgeAlert(mockDirector, 'setup:periods');

      expect(result).toEqual({ success: true });
      expect(mockRedisService.sadd).toHaveBeenCalledWith(
        'ops:alerts:ack:school-1:all',
        'setup:periods',
      );
      expect(mockRedisService.expire).toHaveBeenCalledWith(
        'ops:alerts:ack:school-1:all',
        7 * 24 * 60 * 60,
      );
    });
  });

  // ─── Readiness ─────────────────────────────────────────────────────────────

  describe('GET /schools/:id/readiness', () => {
    it('should return readiness score', async () => {
      const expected = { score: 75, status: 'in_progress', checklist: [] };
      service.getReadinessScore.mockResolvedValue(expected);

      const result = await controller.getReadiness(mockDirector, 'school-1');

      expect(result).toEqual(expected);
      expect(service.getReadinessScore).toHaveBeenCalledWith(mockDirector, 'school-1');
    });

    it('should block access to other schools', async () => {
      await expect(controller.getReadiness(mockDirector, 'school-2')).rejects.toThrow(ForbiddenException);
    });

    it('should block branch admin from other schools', async () => {
      const otherAdmin: JwtPayload = {
        sub: 'user-3', email: 'other@test.com', role: UserRole.BRANCH_ADMIN,
        schoolId: 'school-2', branchId: 'branch-2', isSuperAdmin: false,
      };
      await expect(controller.getReadiness(otherAdmin, 'school-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('POST /schools/:id/readiness/recalculate', () => {
    it('should recalculate and return score', async () => {
      const expected = { score: 90, status: 'ready', checklist: [] };
      service.recalculateReadiness.mockResolvedValue(expected);

      const result = await controller.recalculateReadiness(mockDirector, 'school-1');

      expect(result).toEqual(expected);
      expect(service.recalculateReadiness).toHaveBeenCalledWith(mockDirector, 'school-1');
    });

    it('should block recalculation for other schools', async () => {
      await expect(controller.recalculateReadiness(mockDirector, 'school-2')).rejects.toThrow(ForbiddenException);
    });
  });
});
