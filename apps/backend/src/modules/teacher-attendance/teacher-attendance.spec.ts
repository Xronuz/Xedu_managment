import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeacherAttendanceService } from './teacher-attendance.service';
import { LeaveRequestsService } from '../leave-requests/leave-requests.service';
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
  sub: 'student-1', email: 's@test.com', role: UserRole.STUDENT,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

describe('TeacherAttendanceService', () => {
  let service: TeacherAttendanceService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      teacherAttendance: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'ta-1', ...data })),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'ta-1', ...data })),
      },
      teacherSubstitution: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'ts-1', ...data })),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'ts-1', ...data })),
      },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'teacher-1', role: 'teacher' }) },
      schedule: { findFirst: jest.fn().mockResolvedValue({ id: 'sched-1', branchId: 'branch-1' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeacherAttendanceService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TeacherAttendanceService>(TeacherAttendanceService);
    jest.clearAllMocks();
  });

  describe('RBAC', () => {
    it('should reject student access', async () => {
      await expect(service.findByTeacher('teacher-1', mockStudent)).rejects.toThrow(ForbiddenException);
    });

    it('should allow teacher to view own attendance', async () => {
      prisma.teacherAttendance.findMany.mockResolvedValue([{ id: 'ta-1', teacherId: 'teacher-1' }]);
      const result = await service.findByTeacher('teacher-1', mockTeacher);
      expect(result).toHaveLength(1);
    });

    it('should reject teacher viewing another teacher', async () => {
      await expect(service.findByTeacher('teacher-2', mockTeacher)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAttendance', () => {
    it('should create new attendance record', async () => {
      const result = await service.markAttendance({
        teacherId: 'teacher-1', date: '2026-05-01', status: 'present',
      }, mockBranchAdmin);
      expect(prisma.teacherAttendance.create).toHaveBeenCalled();
      expect(result.status).toBe('present');
    });

    it('should update existing attendance record', async () => {
      prisma.teacherAttendance.findFirst.mockResolvedValue({ id: 'ta-1', status: 'absent' });
      const result = await service.markAttendance({
        teacherId: 'teacher-1', date: '2026-05-01', status: 'present',
      }, mockBranchAdmin);
      expect(prisma.teacherAttendance.update).toHaveBeenCalled();
      expect(result.status).toBe('present');
    });
  });

  describe('substitutions', () => {
    it('should create substitution scoped to branch', async () => {
      const result = await service.createSubstitution({
        date: '2026-05-01',
        scheduleId: 'sched-1',
        originalTeacherId: 'teacher-1',
        substituteTeacherId: 'teacher-2',
      }, mockBranchAdmin);
      expect(prisma.teacherSubstitution.create).toHaveBeenCalled();
      expect(result.branchId).toBe('branch-1');
    });

    it('should reject Branch Admin cross-branch substitution', async () => {
      prisma.schedule.findFirst.mockResolvedValue({ id: 'sched-1', branchId: 'branch-2' });
      await expect(service.createSubstitution({
        date: '2026-05-01',
        scheduleId: 'sched-1',
        originalTeacherId: 'teacher-1',
        substituteTeacherId: 'teacher-2',
      }, mockBranchAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('should approve a proposed substitution', async () => {
      prisma.teacherSubstitution.findFirst.mockResolvedValue({
        id: 'ts-1', status: 'proposed', notes: null,
      });
      const result = await service.reviewSubstitution('ts-1', { action: 'approve' }, mockDirector);
      expect(prisma.teacherSubstitution.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: 'approved', approvedById: 'user-director' }),
      }));
    });
  });
});

describe('LeaveRequestsService — findAffectedSchedules', () => {
  let service: LeaveRequestsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      leaveRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      leaveApproval: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
      attendance: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      classStudent: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaveRequestsService,
        { provide: PrismaService, useValue: prisma },
        { provide: 'AuditService', useValue: { log: jest.fn() } },
        { provide: 'EventsGateway', useValue: { emitToUser: jest.fn(), emitToSchool: jest.fn(), emitPersonalNotification: jest.fn() } },
      ],
    }).compile();

    service = module.get<LeaveRequestsService>(LeaveRequestsService);
    jest.clearAllMocks();
  });

  it('should return empty for non-teacher requester', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValue({
      id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
      requesterId: 'student-1', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-03'),
      affectsSchedule: true,
    });
    prisma.user.findUnique.mockResolvedValue({ role: 'student', firstName: 'Ali', lastName: 'Valiyev' });

    const result = await service.findAffectedSchedules('leave-1', mockDirector);
    expect(result.affectedSlots).toHaveLength(0);
  });

  it('should return empty when affectsSchedule=false', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValue({
      id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
      requesterId: 'teacher-1', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-03'),
      affectsSchedule: false,
    });
    prisma.user.findUnique.mockResolvedValue({ role: 'teacher', firstName: 'Ali', lastName: 'Valiyev' });

    const result = await service.findAffectedSchedules('leave-1', mockDirector);
    expect(result.affectedSlots).toHaveLength(0);
  });

  it('should detect affected published schedules respecting weekType', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValue({
      id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
      requesterId: 'teacher-1', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-15'),
      affectsSchedule: true,
    });
    prisma.user.findUnique.mockResolvedValue({ role: 'teacher', firstName: 'Ali', lastName: 'Valiyev' });

    // May 2026: Mondays are May 4 (week 19 numerator), May 11 (week 20 denominator)
    // Mock simulates Prisma filtering: only published schedules returned
    prisma.schedule.findMany.mockImplementation((args: any) => {
      const all = [
        {
          id: 'sched-all', dayOfWeek: 'monday', timeSlot: 1, startTime: '08:00', endTime: '09:00',
          weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED,
          subject: { name: 'Matematika' }, class: { name: '5-A' }, room: { name: '101' }, branch: { name: 'Chilonzor' },
        },
        {
          id: 'sched-num', dayOfWeek: 'monday', timeSlot: 2, startTime: '09:00', endTime: '10:00',
          weekType: WeekType.NUMERATOR, status: ScheduleStatus.PUBLISHED,
          subject: { name: 'Fizika' }, class: { name: '6-A' }, room: null, branch: { name: 'Chilonzor' },
        },
        {
          id: 'sched-den', dayOfWeek: 'monday', timeSlot: 3, startTime: '10:00', endTime: '11:00',
          weekType: WeekType.DENOMINATOR, status: ScheduleStatus.PUBLISHED,
          subject: { name: 'Kimyo' }, class: { name: '7-A' }, room: null, branch: { name: 'Chilonzor' },
        },
        {
          id: 'sched-draft', dayOfWeek: 'monday', timeSlot: 4, startTime: '11:00', endTime: '12:00',
          weekType: WeekType.ALL, status: ScheduleStatus.DRAFT,
          subject: { name: 'Biologiya' }, class: { name: '8-A' }, room: null, branch: { name: 'Chilonzor' },
        },
      ];
      if (args?.where?.status === ScheduleStatus.PUBLISHED) {
        return Promise.resolve(all.filter((s: any) => s.status === ScheduleStatus.PUBLISHED));
      }
      return Promise.resolve(all);
    });

    const result = await service.findAffectedSchedules('leave-1', mockDirector);

    // ALL: May 4 + May 11 = 2 slots
    // NUMERATOR: May 4 only = 1 slot
    // DENOMINATOR: May 11 only = 1 slot
    // DRAFT: ignored = 0 slots
    expect(result.affectedCount).toBe(4);
    expect(result.affectedSlots.map((s: any) => s.scheduleId)).toEqual(
      expect.arrayContaining(['sched-all', 'sched-num', 'sched-den']),
    );
    // ALL appears twice (May 4 and May 11)
    const allSlots = result.affectedSlots.filter((s: any) => s.scheduleId === 'sched-all');
    expect(allSlots).toHaveLength(2);
  });

  it('should scope Branch Admin to own branch', async () => {
    prisma.leaveRequest.findFirst.mockResolvedValue({
      id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
      requesterId: 'teacher-1', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-03'),
      affectsSchedule: true,
    });
    prisma.user.findUnique.mockResolvedValue({ role: 'teacher', firstName: 'Ali', lastName: 'Valiyev' });

    await service.findAffectedSchedules('leave-1', mockBranchAdmin);

    expect(prisma.schedule.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ branchId: 'branch-1' }),
    }));
  });
});
