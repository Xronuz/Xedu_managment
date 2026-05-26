import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { TimetableAnalyticsService } from './timetable-analytics.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole, ScheduleStatus, WeekType } from '@eduplatform/types';

const mockDirector: JwtPayload = {
  sub: 'user-director', email: 'd@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockBranchAdmin: JwtPayload = {
  sub: 'user-ba', email: 'ba@test.com', role: UserRole.BRANCH_ADMIN,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockTeacher: JwtPayload = {
  sub: 'teacher-1', email: 't1@test.com', role: UserRole.TEACHER,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockStudent: JwtPayload = {
  sub: 'student-1', email: 's1@test.com', role: UserRole.STUDENT,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

describe('TimetableAnalyticsService', () => {
  let service: TimetableAnalyticsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      staffSalary: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      room: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      period: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      teacherAttendance: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      teacherSubstitution: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      solverRun: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      monthlyPayroll: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TimetableAnalyticsService>(TimetableAnalyticsService);
    jest.clearAllMocks();
  });

  describe('RBAC', () => {
    it('should reject student access', async () => {
      await expect(service.getOverview(mockStudent, {})).rejects.toThrow(ForbiddenException);
    });

    it('should allow teacher access', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.room.findMany.mockResolvedValue([]);
      prisma.period.findMany.mockResolvedValue([]);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.teacherSubstitution.count.mockResolvedValue(0);
      prisma.solverRun.findMany.mockResolvedValue([]);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);

      const result = await service.getOverview(mockTeacher, {});
      expect(result).toBeDefined();
    });
  });

  describe('teacher utilization', () => {
    it('should calculate utilization from published schedules', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev', branchId: 'branch-1' },
      ]);
      prisma.schedule.findMany.mockResolvedValue([
        { teacherId: 'teacher-1', weekType: WeekType.ALL, subject: { name: 'Matematika' } },
        { teacherId: 'teacher-1', weekType: WeekType.ALL, subject: { name: 'Fizika' } },
      ]);
      prisma.staffSalary.findMany.mockResolvedValue([
        { userId: 'teacher-1', weeklyLessonHours: 18 },
      ]);

      const result = await service.getTeacherUtilization(mockDirector, {});

      expect(result).toHaveLength(1);
      expect(result[0].scheduledSlots).toBe(2);
      expect(result[0].contractualHours).toBe(18);
      expect(result[0].utilizationPct).toBe(11); // 2/18*100 = 11%
      expect(result[0].status).toBe('underloaded');
      expect(result[0].subjects).toContain('Matematika');
    });

    it('should respect weekType for numerator schedules', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev', branchId: 'branch-1' },
      ]);
      prisma.schedule.findMany.mockResolvedValue([
        { teacherId: 'teacher-1', weekType: WeekType.NUMERATOR, subject: { name: 'Matematika' } },
      ]);
      prisma.staffSalary.findMany.mockResolvedValue([]);

      const result = await service.getTeacherUtilization(mockDirector, { weekType: WeekType.NUMERATOR });

      expect(result[0].scheduledSlots).toBe(0.5);
    });

    it('should scope Branch Admin to own branch', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev', branchId: 'branch-1' },
      ]);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.staffSalary.findMany.mockResolvedValue([]);

      await service.getTeacherUtilization(mockBranchAdmin, {});

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ branchId: 'branch-1' }),
      }));
    });
  });

  describe('room utilization', () => {
    it('should calculate room occupancy percentage', async () => {
      prisma.room.findMany.mockResolvedValue([
        { id: 'room-1', name: '101', capacity: 30 },
      ]);
      prisma.schedule.findMany.mockResolvedValue([
        { roomId: 'room-1', weekType: WeekType.ALL },
        { roomId: 'room-1', weekType: WeekType.ALL },
      ]);
      prisma.period.findMany.mockResolvedValue([
        { branchId: 'branch-1' },
        { branchId: 'branch-1' },
        { branchId: 'branch-1' },
        { branchId: 'branch-1' },
      ]);

      const result = await service.getRoomUtilization(mockDirector, {});

      expect(result).toHaveLength(1);
      expect(result[0].occupiedSlots).toBe(2);
      expect(result[0].totalSlots).toBe(20); // 4 periods * 5 days
      expect(result[0].utilizationPct).toBe(10); // 2/20*100
    });

    it('should return empty when no rooms exist', async () => {
      prisma.room.findMany.mockResolvedValue([]);

      const result = await service.getRoomUtilization(mockDirector, {});

      expect(result).toEqual([]);
    });
  });

  describe('schedule density', () => {
    it('should aggregate schedules by day and slot', async () => {
      prisma.schedule.findMany.mockResolvedValue([
        { dayOfWeek: 'monday', timeSlot: 1, classId: 'class-1', teacherId: 'teacher-1' },
        { dayOfWeek: 'monday', timeSlot: 1, classId: 'class-2', teacherId: 'teacher-2' },
        { dayOfWeek: 'monday', timeSlot: 2, classId: 'class-1', teacherId: 'teacher-1' },
      ]);

      const result = await service.getScheduleDensity(mockDirector, {});

      expect(result).toHaveLength(2);
      const slot1 = result.find(r => r.timeSlot === 1);
      expect(slot1!.scheduleCount).toBe(2);
      expect(slot1!.classCount).toBe(2);
      expect(slot1!.teacherCount).toBe(2);
    });

    it('should filter by published status only', async () => {
      prisma.schedule.findMany.mockImplementation((args: any) => {
        expect(args.where.status).toBe(ScheduleStatus.PUBLISHED);
        return Promise.resolve([]);
      });

      await service.getScheduleDensity(mockDirector, {});
    });
  });

  describe('absence and substitution', () => {
    it('should calculate absence rate and substitution fill rate', async () => {
      prisma.teacherAttendance.count.mockImplementation((args: any) => {
        if (args.where?.status === 'present') return Promise.resolve(80);
        if (args.where?.status === 'absent') return Promise.resolve(10);
        if (args.where?.status === 'excused') return Promise.resolve(5);
        if (args.where?.status === 'late') return Promise.resolve(3);
        if (args.where?.status === 'substituted') return Promise.resolve(2);
        return Promise.resolve(100);
      });
      prisma.teacherSubstitution.count.mockImplementation((args: any) => {
        if (args.where?.status === 'proposed') return Promise.resolve(5);
        if (args.where?.status === 'approved') return Promise.resolve(3);
        if (args.where?.status === 'applied') return Promise.resolve(7);
        return Promise.resolve(0);
      });
      prisma.teacherAttendance.findMany.mockResolvedValue([]);
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);

      const result = await service.getAbsenceSubstitution(mockDirector, {});

      expect(result.totalAttendanceRecords).toBe(100);
      expect(result.presentCount).toBe(80);
      expect(result.absentCount).toBe(10);
      expect(result.excusedCount).toBe(5);
      expect(result.absenceRatePct).toBe(15); // (10+5)/100
      expect(result.substitutionFillRatePct).toBe(47); // 7/(5+3+7) = 46.7% → 47
    });
  });

  describe('solver quality', () => {
    it('should aggregate solver run metrics', async () => {
      prisma.solverRun.findMany.mockResolvedValue([
        { id: 'run-1', strategy: 'hybrid', status: 'completed', placedCount: 45, demandsCount: 50, score: 92, createdAt: new Date(), completedAt: new Date(Date.now() + 2000) },
        { id: 'run-2', strategy: 'greedy', status: 'completed', placedCount: 40, demandsCount: 50, score: 85, createdAt: new Date(), completedAt: new Date(Date.now() + 1000) },
        { id: 'run-3', strategy: 'hybrid', status: 'failed', placedCount: 0, demandsCount: 50, score: null, createdAt: new Date(), completedAt: null },
      ]);

      const result = await service.getSolverQuality(mockDirector, {});

      expect(result.totalRuns).toBe(3);
      expect(result.successRatePct).toBe(67); // 2/3
      expect(result.avgPlacementPct).toBe(57); // (90+80+0)/3
      expect(result.bestScore).toBe(92);
      expect(result.recentRuns).toHaveLength(3);
    });
  });

  describe('payroll variance', () => {
    it('should calculate scheduled vs completed hours variance', async () => {
      prisma.monthlyPayroll.findFirst.mockResolvedValue({
        status: 'draft',
        items: [
          {
            userId: 'teacher-1', scheduledHours: 20, completedHours: 18,
            completedHoursSource: 'attendance',
            user: { firstName: 'Ali', lastName: 'Valiyev' },
            staffSalary: { branchId: 'branch-1' },
          },
          {
            userId: 'teacher-2', scheduledHours: 20, completedHours: 22,
            completedHoursSource: 'manual',
            user: { firstName: 'Bobur', lastName: 'Karimov' },
            staffSalary: { branchId: 'branch-1' },
          },
        ],
      });

      const result = await service.getPayrollVariance(mockDirector, {});

      expect(result).toHaveLength(2);
      expect(result[0].varianceHours).toBe(-2);
      expect(result[0].variancePct).toBe(-10);
      expect(result[1].varianceHours).toBe(2);
      expect(result[1].variancePct).toBe(10);
    });

    it('should scope Branch Admin to own branch', async () => {
      prisma.monthlyPayroll.findFirst.mockResolvedValue({
        status: 'draft',
        items: [
          {
            userId: 'teacher-1', scheduledHours: 20, completedHours: 18,
            completedHoursSource: 'attendance',
            user: { firstName: 'Ali', lastName: 'Valiyev' },
            staffSalary: { branchId: 'branch-1' },
          },
          {
            userId: 'teacher-2', scheduledHours: 20, completedHours: 22,
            completedHoursSource: 'manual',
            user: { firstName: 'Bobur', lastName: 'Karimov' },
            staffSalary: { branchId: 'branch-2' },
          },
        ],
      });

      const result = await service.getPayrollVariance(mockBranchAdmin, {});

      expect(result).toHaveLength(1);
      expect(result[0].teacherId).toBe('teacher-1');
    });
  });

  describe('overview', () => {
    it('should return aggregated executive summary', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev', branchId: 'branch-1' },
      ]);
      prisma.schedule.findMany.mockResolvedValue([
        { teacherId: 'teacher-1', weekType: WeekType.ALL, subject: { name: 'Matematika' } },
      ]);
      prisma.staffSalary.findMany.mockResolvedValue([
        { userId: 'teacher-1', weeklyLessonHours: 18 },
      ]);
      prisma.room.findMany.mockResolvedValue([
        { id: 'room-1', name: '101', capacity: 30 },
      ]);
      prisma.period.findMany.mockResolvedValue([{ branchId: 'branch-1' }]);
      prisma.teacherAttendance.count.mockResolvedValue(0);
      prisma.teacherSubstitution.count.mockResolvedValue(0);
      prisma.solverRun.findMany.mockResolvedValue([]);
      prisma.monthlyPayroll.findFirst.mockResolvedValue(null);

      const result = await service.getOverview(mockDirector, {});

      expect(result.teacherCount).toBe(1);
      expect(result.avgTeacherUtilizationPct).toBeGreaterThanOrEqual(0);
      expect(result.roomCount).toBe(1);
      expect(result.totalPublishedSlots).toBeGreaterThanOrEqual(0);
    });
  });
});
