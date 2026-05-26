import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OpsCommandCenterService } from './ops-command-center.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { JwtPayload, UserRole, ScheduleStatus, TeacherAttendanceStatus, SubstitutionStatus } from '@eduplatform/types';

const mockDirector: JwtPayload = {
  sub: 'user-1', email: 'director@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockVP: JwtPayload = {
  sub: 'user-2', email: 'vp@test.com', role: UserRole.VICE_PRINCIPAL,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockBranchAdmin: JwtPayload = {
  sub: 'user-3', email: 'branch@test.com', role: UserRole.BRANCH_ADMIN,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockTeacher: JwtPayload = {
  sub: 'user-4', email: 'teacher@test.com', role: UserRole.TEACHER,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockStudent: JwtPayload = {
  sub: 'user-5', email: 'student@test.com', role: UserRole.STUDENT,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockRedisService = {
  get: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  smembers: jest.fn().mockResolvedValue([]),
  sadd: jest.fn(),
  expire: jest.fn(),
};

describe('OpsCommandCenterService', () => {
  let service: OpsCommandCenterService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      school: { findUnique: jest.fn(), update: jest.fn() },
      branch: { count: jest.fn() },
      period: { count: jest.fn() },
      room: { count: jest.fn() },
      class: { count: jest.fn() },
      subject: { count: jest.fn() },
      teachingLoad: { count: jest.fn() },
      schedule: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      teacherAttendance: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      teacherSubstitution: { count: jest.fn() },
      leaveRequest: { count: jest.fn() },
      monthlyPayroll: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpsCommandCenterService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<OpsCommandCenterService>(OpsCommandCenterService);
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RBAC
  // ═══════════════════════════════════════════════════════════════════════════

  describe('RBAC', () => {
    it('should allow director access', async () => {
      prisma.period.count.mockResolvedValue(1);
      prisma.room.count.mockResolvedValue(1);
      prisma.class.count.mockResolvedValue(1);
      prisma.schedule.count.mockResolvedValue(0);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.teacherSubstitution.count.mockResolvedValue(0);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.teacherAttendance.findMany.mockResolvedValue([]);

      const result = await service.getTodaySummary(mockDirector);
      expect(result.schoolId).toBe('school-1');
    });

    it('should block student access', async () => {
      await expect(service.getTodaySummary(mockStudent)).rejects.toThrow(ForbiddenException);
    });

    it('should block parent access', async () => {
      const mockParent: JwtPayload = {
        sub: 'user-6', email: 'parent@test.com', role: UserRole.PARENT,
        schoolId: 'school-1', branchId: null, isSuperAdmin: false,
      };
      await expect(service.getTodaySummary(mockParent)).rejects.toThrow(ForbiddenException);
    });

    it('should allow teacher access', async () => {
      prisma.period.count.mockResolvedValue(1);
      prisma.room.count.mockResolvedValue(1);
      prisma.class.count.mockResolvedValue(1);
      prisma.schedule.count.mockResolvedValue(0);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.teacherSubstitution.count.mockResolvedValue(0);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.teacherAttendance.findMany.mockResolvedValue([]);

      const result = await service.getTodaySummary(mockTeacher);
      expect(result.schoolId).toBe('school-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Readiness Score
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getReadinessScore', () => {
    beforeEach(() => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.setEx.mockResolvedValue(undefined);
    });

    it('should return 0 (not_started) when no data exists', async () => {
      prisma.school.findUnique.mockResolvedValue({ name: null, address: null, phone: null });
      prisma.branch.count.mockResolvedValue(0);
      prisma.period.count.mockResolvedValue(0);
      prisma.room.count.mockResolvedValue(0);
      prisma.class.count.mockResolvedValue(0);
      prisma.subject.count.mockResolvedValue(0);
      prisma.teachingLoad.count.mockResolvedValue(0);
      prisma.schedule.count.mockResolvedValue(0);

      const result = await service.getReadinessScore(mockDirector, 'school-1');

      expect(result.score).toBe(0);
      expect(result.status).toBe('not_started');
      expect(result.checklist.every(i => !i.completed)).toBe(true);
    });

    it('should return 100 (operational) when all items complete', async () => {
      prisma.school.findUnique.mockResolvedValue({ name: 'Test School', address: '123 Main', phone: '999' });
      prisma.branch.count.mockResolvedValue(1);
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.subject.count.mockResolvedValue(12);
      prisma.teachingLoad.count.mockResolvedValue(20);
      prisma.schedule.count.mockResolvedValue(100);

      const result = await service.getReadinessScore(mockDirector, 'school-1');

      expect(result.score).toBe(100);
      expect(result.status).toBe('operational');
      expect(result.checklist.every(i => i.completed)).toBe(true);
    });

    it('should return ready when all required items complete but optional missing', async () => {
      prisma.school.findUnique.mockResolvedValue({ name: 'Test School', address: '123 Main', phone: '999' });
      prisma.branch.count.mockResolvedValue(1);
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.subject.count.mockResolvedValue(12);
      prisma.teachingLoad.count.mockResolvedValue(20);
      prisma.schedule.count.mockResolvedValue(0); // publishedTimetable = false (optional)

      const result = await service.getReadinessScore(mockDirector, 'school-1');

      expect(result.score).toBe(90); // 100 - 10 for publishedTimetable
      expect(result.status).toBe('ready');
      expect(result.checklist.find(i => i.id === 'publishedTimetable')?.completed).toBe(false);
    });

    it('should return in_progress when some required items missing', async () => {
      prisma.school.findUnique.mockResolvedValue({ name: 'Test School', address: '123 Main', phone: '999' });
      prisma.branch.count.mockResolvedValue(1);
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(0); // missing
      prisma.class.count.mockResolvedValue(10);
      prisma.subject.count.mockResolvedValue(12);
      prisma.teachingLoad.count.mockResolvedValue(20);
      prisma.schedule.count.mockResolvedValue(100);

      const result = await service.getReadinessScore(mockDirector, 'school-1');

      expect(result.score).toBe(90); // 100 - 10 for rooms
      expect(result.status).toBe('in_progress');
    });

    it('should use cache when available', async () => {
      const cached = { score: 75, status: 'in_progress', checklist: [] };
      mockRedisService.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getReadinessScore(mockDirector, 'school-1');

      expect(result.score).toBe(75);
      expect(prisma.school.findUnique).not.toHaveBeenCalled();
    });

    it('should recalculate and update cache', async () => {
      prisma.school.findUnique.mockResolvedValue({ name: 'Test School', address: '123 Main', phone: '999' });
      prisma.branch.count.mockResolvedValue(1);
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.subject.count.mockResolvedValue(12);
      prisma.teachingLoad.count.mockResolvedValue(20);
      prisma.schedule.count.mockResolvedValue(100);
      prisma.school.update.mockResolvedValue({});

      const result = await service.recalculateReadiness(mockDirector, 'school-1');

      expect(result.score).toBe(100);
      expect(mockRedisService.del).toHaveBeenCalledWith('ops:readiness:school-1');
      expect(mockRedisService.setEx).toHaveBeenCalled();
      expect(prisma.school.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'school-1' },
          data: { readinessScore: 100 },
        }),
      );
    });

    it('should block branch admin from other schools', async () => {
      const otherBranchAdmin: JwtPayload = {
        sub: 'user-7', email: 'other@test.com', role: UserRole.BRANCH_ADMIN,
        schoolId: 'school-2', branchId: 'branch-2', isSuperAdmin: false,
      };
      await expect(service.getReadinessScore(otherBranchAdmin, 'school-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Alerts
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getAlerts', () => {
    beforeEach(() => {
      // Default: empty data = all setup alerts triggered
      prisma.period.count.mockResolvedValue(0);
      prisma.room.count.mockResolvedValue(0);
      prisma.class.count.mockResolvedValue(0);
      prisma.subject.count.mockResolvedValue(0);
      prisma.teachingLoad.count.mockResolvedValue(0);
      prisma.schedule.count.mockResolvedValue(0);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.teacherAttendance.findMany.mockResolvedValue([]);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);
    });

    it('should generate setup alerts when prerequisites missing', async () => {
      const alerts = await service.getAlerts(mockDirector);

      const criticalAlerts = alerts.filter(a => a.severity === 'critical');
      expect(criticalAlerts.length).toBeGreaterThanOrEqual(3); // periods, classes, subjects
      expect(alerts.some(a => a.id === 'setup:periods')).toBe(true);
      expect(alerts.some(a => a.id === 'setup:classes')).toBe(true);
      expect(alerts.some(a => a.id === 'setup:subjects')).toBe(true);
    });

    it('should generate no setup alerts when all configured', async () => {
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.subject.count.mockResolvedValue(12);
      prisma.teachingLoad.count.mockResolvedValue(20);
      prisma.schedule.count.mockResolvedValue(50);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.monthlyPayroll.findFirst.mockResolvedValue({ status: 'generated' });

      const alerts = await service.getAlerts(mockDirector);

      expect(alerts.some(a => a.id === 'setup:periods')).toBe(false);
      expect(alerts.some(a => a.id === 'setup:classes')).toBe(false);
      expect(alerts.some(a => a.id === 'setup:subjects')).toBe(false);
    });

    it('should alert on unpublished drafts', async () => {
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.subject.count.mockResolvedValue(12);
      prisma.teachingLoad.count.mockResolvedValue(20);
      // Published = 0, but drafts exist
      prisma.schedule.count.mockResolvedValueOnce(0); // published count
      prisma.schedule.count.mockResolvedValueOnce(10); // total count for unpublished check

      const alerts = await service.getAlerts(mockDirector);

      expect(alerts.some(a => a.id === 'schedule:unpublished')).toBe(true);
    });

    it('should alert on missing payroll', async () => {
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.subject.count.mockResolvedValue(12);
      prisma.teachingLoad.count.mockResolvedValue(20);
      prisma.schedule.count.mockResolvedValue(50);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);

      const alerts = await service.getAlerts(mockDirector);

      expect(alerts.some(a => a.id === 'payroll:missing')).toBe(true);
    });

    it('should sort alerts by severity (critical first)', async () => {
      const alerts = await service.getAlerts(mockDirector);

      for (let i = 1; i < alerts.length; i++) {
        const prev = alerts[i - 1].severity;
        const curr = alerts[i].severity;
        const order = { critical: 0, warning: 1, info: 2 };
        expect(order[prev]).toBeLessThanOrEqual(order[curr]);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Today Summary
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getTodaySummary', () => {
    beforeEach(() => {
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.schedule.count.mockResolvedValue(0);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.teacherSubstitution.count.mockResolvedValue(0);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.teacherAttendance.findMany.mockResolvedValue([]);
    });

    it('should return summary with correct structure', async () => {
      const result = await service.getTodaySummary(mockDirector);

      expect(result).toHaveProperty('date');
      expect(result).toHaveProperty('schoolId', 'school-1');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('schedule');
      expect(result).toHaveProperty('staff');
      expect(result).toHaveProperty('substitutions');
      expect(result).toHaveProperty('payroll');
      expect(result).toHaveProperty('alerts');
    });

    it('should scope to branch for branch admin', async () => {
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.schedule.count.mockResolvedValue(0);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.teacherSubstitution.count.mockResolvedValue(0);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.teacherAttendance.findMany.mockResolvedValue([]);

      const result = await service.getTodaySummary(mockBranchAdmin);

      expect(result.branchId).toBe('branch-1');
      expect(prisma.class.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ branchId: 'branch-1' }) }),
      );
    });

    it('should count published and draft slots correctly', async () => {
      prisma.schedule.count.mockImplementation(({ where }: any) => {
        if (where.status === ScheduleStatus.PUBLISHED) return Promise.resolve(24);
        if (where.status === ScheduleStatus.DRAFT) return Promise.resolve(3);
        return Promise.resolve(0);
      });

      const result = await service.getTodaySummary(mockDirector);

      expect(result.schedule.publishedSlots).toBe(24);
      expect(result.schedule.draftSlots).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Branch Scope
  // ═══════════════════════════════════════════════════════════════════════════

  describe('branch scope', () => {
    it('should filter alerts by branchId query param', async () => {
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.subject.count.mockResolvedValue(12);
      prisma.teachingLoad.count.mockResolvedValue(20);
      prisma.schedule.count.mockResolvedValue(50);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);

      await service.getAlerts(mockDirector, 'branch-1');

      expect(prisma.period.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ branchId: 'branch-1' }) }),
      );
    });

    it('should use school-wide scope for director when no branch specified', async () => {
      prisma.period.count.mockResolvedValue(6);
      prisma.room.count.mockResolvedValue(5);
      prisma.class.count.mockResolvedValue(10);
      prisma.subject.count.mockResolvedValue(12);
      prisma.teachingLoad.count.mockResolvedValue(20);
      prisma.schedule.count.mockResolvedValue(50);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.leaveRequest.count.mockResolvedValue(0);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);

      await service.getAlerts(mockDirector);

      expect(prisma.period.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-1' }) }),
      );
    });
  });
});
