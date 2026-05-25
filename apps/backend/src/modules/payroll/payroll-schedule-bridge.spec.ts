import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole, ScheduleStatus, WeekType } from '@eduplatform/types';

const mockDirector: JwtPayload = {
  sub: 'user-director', email: 'd@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockAccountant: JwtPayload = {
  sub: 'user-acc', email: 'acc@test.com', role: UserRole.ACCOUNTANT,
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

describe('PayrollService — Schedule Bridge (Phase 5A.3)', () => {
  let service: PayrollService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      monthlyPayroll: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({
          id: 'payroll-1',
          ...data,
          items: data.items?.create?.map((i: any, idx: number) => ({ ...i, id: `item-${idx}` })) ?? [],
        })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'payroll-1', ...data })),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      staffSalary: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      salaryAdvance: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      schedule: {
        findMany: jest.fn().mockImplementation((args: any) => {
          const where = args?.where ?? {};
          let result: any[] = [];
          // Return matching schedules based on simple where filtering
          if (where.teacherId && where.status === ScheduleStatus.PUBLISHED) {
            // Only published schedules for this teacher
            result = [
              { dayOfWeek: 'monday', weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED },
            ];
          }
          return Promise.resolve(result);
        }),
      },
      payrollItem: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      school: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Test School' }),
      },
      $transaction: jest.fn().mockImplementation((promises: any[]) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'TariffCalculatorService', useValue: null },
        { provide: 'SystemConfigService', useValue: null },
        { provide: 'MailService', useValue: null },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
    jest.clearAllMocks();
  });

  function makeSalaryConfig(overrides?: any) {
    return [{
      id: 'salary-1',
      userId: 'teacher-1',
      schoolId: 'school-1',
      branchId: 'branch-1',
      baseSalary: 5000000,
      degreeAllowance: 0,
      certificateAllowance: 0,
      hourlyRate: 50000,
      extraCurricularRate: 0,
      isActive: true,
      user: { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev', role: 'teacher' },
      ...overrides,
    }];
  }

  function makeSchedule(overrides?: any) {
    return [{
      schoolId: 'school-1',
      branchId: 'branch-1',
      teacherId: 'teacher-1',
      classId: 'class-1',
      subjectId: 'subject-1',
      dayOfWeek: 'monday',
      timeSlot: 1,
      startTime: '08:00',
      endTime: '09:00',
      status: ScheduleStatus.PUBLISHED,
      weekType: WeekType.ALL,
      ...overrides,
    }];
  }

  describe('generatePayroll — scheduledHours auto-fill', () => {
    it('should auto-fill scheduledHours from published schedules', async () => {
      // May 2026 has 4 Mondays → 4 slots for ALL weekType
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaryConfig());
      prisma.salaryAdvance.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue(makeSchedule());

      const result = await service.generatePayroll({ month: 5, year: 2026 }, mockDirector);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].scheduledHours).toBe(4); // 4 Mondays in May 2026
      expect(result.items[0].scheduledHoursSource).toBe('schedule');
      expect(result.items[0].scheduledHoursCalculatedAt).toBeInstanceOf(Date);
    });

    it('should query only published schedules', async () => {
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaryConfig());
      prisma.salaryAdvance.findMany.mockResolvedValue([]);
      // Mock checks that status=PUBLISHED is passed in the where clause
      prisma.schedule.findMany.mockImplementation((args: any) => {
        expect(args.where.status).toBe(ScheduleStatus.PUBLISHED);
        return Promise.resolve([{ dayOfWeek: 'monday', weekType: WeekType.ALL }]);
      });

      const result = await service.generatePayroll({ month: 5, year: 2026 }, mockDirector);
      expect(result.items[0].scheduledHours).toBe(4);
    });

    it('should count numerator weeks only for numerator schedules', async () => {
      // May 2026 ISO weeks: 18(even), 19(odd), 20(even), 21(odd), 22(even)
      // numerator weeks: 19, 21 → 2 Mondays
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaryConfig());
      prisma.salaryAdvance.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue(makeSchedule({ weekType: WeekType.NUMERATOR }));

      const result = await service.generatePayroll({ month: 5, year: 2026 }, mockDirector);
      expect(result.items[0].scheduledHours).toBe(2);
    });

    it('should count denominator weeks only for denominator schedules', async () => {
      // May 2026: denominator weeks = 20, 22 → 2 Mondays
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaryConfig());
      prisma.salaryAdvance.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue(makeSchedule({ weekType: WeekType.DENOMINATOR }));

      const result = await service.generatePayroll({ month: 5, year: 2026 }, mockDirector);
      expect(result.items[0].scheduledHours).toBe(2);
    });

    it('should set source null when no published schedules exist', async () => {
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaryConfig());
      prisma.salaryAdvance.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.generatePayroll({ month: 5, year: 2026 }, mockDirector);
      expect(result.items[0].scheduledHours).toBe(0);
      expect(result.items[0].scheduledHoursSource).toBeNull();
      expect(result.items[0].scheduledHoursCalculatedAt).toBeNull();
    });
  });

  describe('recalculateScheduledHours', () => {
    it('should recalculate and update scheduledHours for draft payroll', async () => {
      prisma.monthlyPayroll.findFirst.mockResolvedValue({
        id: 'payroll-1',
        schoolId: 'school-1',
        month: 5,
        year: 2026,
        status: 'draft',
        items: [
          { id: 'item-1', userId: 'teacher-1', staffSalaryId: 'salary-1', scheduledHours: 0, scheduledHoursSource: null, staffSalary: { branchId: 'branch-1' } },
        ],
      });
      prisma.schedule.findMany.mockResolvedValue(makeSchedule());

      const result = await service.recalculateScheduledHours('payroll-1', { force: false }, mockDirector);

      expect(result.updatedCount).toBe(1);
      expect(prisma.payrollItem.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          scheduledHours: 4,
          scheduledHoursSource: 'schedule',
          scheduledHoursCalculatedAt: expect.any(Date),
        }),
      }));
    });

    it('should skip manual override items unless force=true', async () => {
      prisma.monthlyPayroll.findFirst.mockResolvedValue({
        id: 'payroll-1',
        schoolId: 'school-1',
        month: 5,
        year: 2026,
        status: 'draft',
        items: [
          { id: 'item-1', userId: 'teacher-1', staffSalaryId: 'salary-1', scheduledHours: 10, scheduledHoursSource: 'manual', staffSalary: { branchId: 'branch-1' } },
        ],
      });
      prisma.schedule.findMany.mockResolvedValue(makeSchedule());

      const result = await service.recalculateScheduledHours('payroll-1', { force: false }, mockDirector);

      expect(result.skippedCount).toBe(1);
      expect(prisma.payrollItem.update).not.toHaveBeenCalled();
    });

    it('should overwrite manual override when force=true', async () => {
      prisma.monthlyPayroll.findFirst.mockResolvedValue({
        id: 'payroll-1',
        schoolId: 'school-1',
        month: 5,
        year: 2026,
        status: 'draft',
        items: [
          { id: 'item-1', userId: 'teacher-1', staffSalaryId: 'salary-1', scheduledHours: 10, scheduledHoursSource: 'manual', staffSalary: { branchId: 'branch-1' } },
        ],
      });
      prisma.schedule.findMany.mockResolvedValue(makeSchedule());

      const result = await service.recalculateScheduledHours('payroll-1', { force: true, reason: 'Test' }, mockDirector);

      expect(result.updatedCount).toBe(1);
      expect(prisma.payrollItem.update).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'item-1' },
        data: expect.objectContaining({
          scheduledHours: 4,
          scheduledHoursSource: 'schedule',
          scheduledHoursOverrideReason: 'Test',
        }),
      }));
    });

    it('should reject recalculation for paid payroll', async () => {
      prisma.monthlyPayroll.findFirst.mockResolvedValue({
        id: 'payroll-1',
        schoolId: 'school-1',
        month: 5,
        year: 2026,
        status: 'paid',
        items: [],
      });

      await expect(
        service.recalculateScheduledHours('payroll-1', { force: false }, mockDirector),
      ).rejects.toThrow(BadRequestException);
    });

    it('should scope Branch Admin to own branch', async () => {
      prisma.monthlyPayroll.findFirst.mockResolvedValue({
        id: 'payroll-1',
        schoolId: 'school-1',
        month: 5,
        year: 2026,
        status: 'draft',
        items: [
          { id: 'item-1', userId: 'teacher-1', staffSalaryId: 'salary-1', scheduledHours: 0, scheduledHoursSource: null, staffSalary: { branchId: 'branch-1' } },
          { id: 'item-2', userId: 'teacher-2', staffSalaryId: 'salary-2', scheduledHours: 0, scheduledHoursSource: null, staffSalary: { branchId: 'branch-2' } },
        ],
      });
      prisma.schedule.findMany.mockResolvedValue(makeSchedule());

      const result = await service.recalculateScheduledHours('payroll-1', { force: false }, mockBranchAdmin);

      // Branch Admin can only affect branch-1 items
      expect(result.updatedCount).toBe(1);
      expect(result.skippedCount).toBe(1);
      const updateCalls = prisma.payrollItem.update.mock.calls;
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0][0].where.id).toBe('item-1');
    });
  });

  describe('updatePayrollItem — manual override tracking', () => {
    it('should mark source as manual when scheduledHours is changed', async () => {
      prisma.payrollItem.findFirst.mockResolvedValue({
        id: 'item-1',
        schoolId: 'school-1',
        payrollId: 'payroll-1',
        scheduledHours: 5,
        completedHours: 0,
        extraCurricularHours: 0,
        bonuses: 0,
        deductions: 0,
        hourlyAmount: 0,
        extraCurricularAmount: 0,
        advancePaid: 0,
        baseSalary: 5000000,
        degreeAllowance: 0,
        certificateAllowance: 0,
        grossTotal: 5000000,
        netTotal: 5000000,
        staffSalary: { hourlyRate: 50000, extraCurricularRate: 0 },
        payroll: { status: 'draft' },
      });
      prisma.payrollItem.findMany.mockResolvedValue([]);

      await service.updatePayrollItem('item-1', { scheduledHours: 20 }, mockDirector);

      expect(prisma.payrollItem.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          scheduledHours: 20,
          scheduledHoursSource: 'manual',
        }),
      }));
    });

    it('should not change source when scheduledHours is unchanged', async () => {
      prisma.payrollItem.findFirst.mockResolvedValue({
        id: 'item-1',
        schoolId: 'school-1',
        payrollId: 'payroll-1',
        scheduledHours: 5,
        completedHours: 0,
        extraCurricularHours: 0,
        bonuses: 0,
        deductions: 0,
        hourlyAmount: 0,
        extraCurricularAmount: 0,
        advancePaid: 0,
        baseSalary: 5000000,
        degreeAllowance: 0,
        certificateAllowance: 0,
        grossTotal: 5000000,
        netTotal: 5000000,
        staffSalary: { hourlyRate: 50000, extraCurricularRate: 0 },
        payroll: { status: 'draft' },
      });
      prisma.payrollItem.findMany.mockResolvedValue([]);

      await service.updatePayrollItem('item-1', { bonuses: 1000 }, mockDirector);

      expect(prisma.payrollItem.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          bonuses: 1000,
          scheduledHoursSource: undefined, // Prisma won't update undefined fields
        }),
      }));
    });
  });
});
