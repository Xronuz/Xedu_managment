import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ScheduleRepairService } from './schedule-repair.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole, ScheduleStatus, WeekType, SubstitutionStatus } from '@eduplatform/types';

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

describe('ScheduleRepairService', () => {
  let service: ScheduleRepairService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      leaveRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      teacherSubstitution: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'sub-1', ...data })),
      },
      teachingLoad: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      room: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleRepairService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ScheduleRepairService>(ScheduleRepairService);
    jest.clearAllMocks();
  });

  describe('analyze', () => {
    it('should reject non-manager access', async () => {
      await expect(service.analyze({ scheduleId: 's1', date: '2026-05-04' }, mockTeacher))
        .rejects.toThrow(ForbiddenException);
    });

    it('should analyze leave disruption and produce substitute options', async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
        requesterId: 'teacher-1', startDate: new Date('2026-05-04'), endDate: new Date('2026-05-04'),
        affectsSchedule: true,
        requester: { firstName: 'Ali', lastName: 'Valiyev' },
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-2', firstName: 'Bobur', lastName: 'Karimov', role: 'teacher', branchId: 'branch-1', isActive: true },
      ]);
      prisma.schedule.findUnique.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED,
        subject: { name: 'Matematika' },
        class: { id: 'class-1', name: '5-A' },
        teacher: { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev' },
      });
      prisma.schedule.findMany.mockImplementation((args: any) => {
        if (args.where?.teacherId && args.where?.status === ScheduleStatus.PUBLISHED) {
          // Affected schedules query
          return Promise.resolve([{
            id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
            teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
            dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED,
            roomId: 'room-1',
            subject: { name: 'Matematika' },
            class: { name: '5-A' },
            room: { name: '101' },
            teacher: { firstName: 'Ali', lastName: 'Valiyev' },
            teacherSubstitutions: [],
          }]);
        }
        if (args.where?.teacherId?.in) return Promise.resolve([]); // no conflicts
        if (args.where?.dayOfWeek && args.where?.status === ScheduleStatus.PUBLISHED) return Promise.resolve([]);
        return Promise.resolve([]);
      });
      prisma.teachingLoad.findMany.mockResolvedValue([
        { teacherId: 'teacher-2', subjectId: 'subj-1', classId: 'class-1' },
      ]);
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);

      const result = await service.analyze({ leaveRequestId: 'leave-1' }, mockDirector);

      expect(result.disruption.type).toBe('leave');
      expect(result.affectedSchedules.length).toBeGreaterThan(0);
      expect(result.options.some(o => o.type === 'substitute_teacher')).toBe(true);
    });

    it('should produce room swap options when room is unavailable', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED,
        roomId: 'room-1',
        subject: { name: 'Matematika' },
        class: { name: '5-A' },
        room: { id: 'room-1', name: '101' },
        teacher: { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev' },
      });
      prisma.room.findMany.mockResolvedValue([
        { id: 'room-2', name: '102', capacity: 30 },
      ]);
      prisma.schedule.findMany.mockImplementation((args: any) => {
        if (args.where?.roomId?.not === null) return Promise.resolve([]); // no occupied rooms
        return Promise.resolve([]);
      });
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.analyze({ scheduleId: 'sched-1', date: '2026-05-04', reason: 'Xona ta\'mir' }, mockDirector);

      expect(result.options.some(o => o.type === 'room_swap')).toBe(true);
    });

    it('should produce reschedule options for slot disruption', async () => {
      const baseSchedule = {
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED,
        roomId: 'room-1',
        subject: { name: 'Matematika' },
        class: { name: '5-A' },
        room: { id: 'room-1', name: '101' },
        teacher: { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev' },
      };
      prisma.schedule.findFirst.mockImplementation((args: any) => {
        if (args.where?.id === 'sched-1') return Promise.resolve(baseSchedule);
        // All conflict checks return null (no conflicts)
        return Promise.resolve(null);
      });
      // No conflicts on any day for teacher, class, or room
      prisma.schedule.findMany.mockImplementation((args: any) => {
        if (args.where?.dayOfWeek && args.where?.status === ScheduleStatus.PUBLISHED) {
          return Promise.resolve([]);
        }
        return Promise.resolve([]);
      });
      prisma.room.findMany.mockResolvedValue([]);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.analyze({ scheduleId: 'sched-1', date: '2026-05-04' }, mockDirector);

      expect(result.options.some(o => o.type === 'reschedule_lesson')).toBe(true);
    });

    it('should score same-subject available teacher higher', async () => {
      const baseSchedule = {
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED,
        roomId: null,
        subject: { name: 'Matematika' },
        class: { name: '5-A' },
        room: null,
        teacher: { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev' },
      };
      prisma.schedule.findFirst.mockImplementation((args: any) => {
        if (args.where?.id === 'sched-1') return Promise.resolve(baseSchedule);
        return Promise.resolve(null);
      });
      prisma.schedule.findUnique.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED,
        subject: { name: 'Matematika' },
        class: { id: 'class-1', name: '5-A' },
        teacher: { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev' },
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-2', firstName: 'Bobur', lastName: 'Karimov', role: 'teacher', branchId: 'branch-1', isActive: true },
        { id: 'teacher-3', firstName: 'Sardor', lastName: 'Rahimov', role: 'teacher', branchId: 'branch-1', isActive: true },
      ]);
      prisma.schedule.findMany.mockImplementation((args: any) => {
        if (args.where?.teacherId?.in) return Promise.resolve([]);
        if (args.where?.dayOfWeek && args.where?.status === ScheduleStatus.PUBLISHED) return Promise.resolve([]);
        return Promise.resolve([]);
      });
      prisma.teachingLoad.findMany.mockImplementation((args: any) => {
        if (args.where?.subjectId === 'subj-1') {
          return Promise.resolve([
            { teacherId: 'teacher-2', subjectId: 'subj-1', classId: 'class-1' },
          ]);
        }
        return Promise.resolve([]);
      });
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);

      const result = await service.analyze({ scheduleId: 'sched-1', date: '2026-05-04' }, mockDirector);

      const subOptions = result.options.filter(o => o.type === 'substitute_teacher');
      expect(subOptions.length).toBeGreaterThanOrEqual(2);
      expect(subOptions[0].score).toBeGreaterThan(subOptions[1].score);
      expect(subOptions[0].payload.substituteTeacherId).toBe('teacher-2');
    });

    it('should give lower score to overloaded teacher', async () => {
      const baseSchedule = {
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED,
        roomId: null,
        subject: { name: 'Matematika' },
        class: { name: '5-A' },
        room: null,
        teacher: { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev' },
      };
      prisma.schedule.findFirst.mockImplementation((args: any) => {
        if (args.where?.id === 'sched-1') return Promise.resolve(baseSchedule);
        return Promise.resolve(null);
      });
      prisma.schedule.findUnique.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED,
        subject: { name: 'Matematika' },
        class: { id: 'class-1', name: '5-A' },
        teacher: { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev' },
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-2', firstName: 'Bobur', lastName: 'Karimov', role: 'teacher', branchId: 'branch-1', isActive: true },
      ]);
      prisma.schedule.findMany.mockImplementation((args: any) => {
        if (args.where?.teacherId?.in && args.where?.timeSlot) {
          return Promise.resolve([]); // conflict query: no conflicts
        }
        if (args.where?.teacherId?.in && args.where?.dayOfWeek && !args.where?.timeSlot) {
          // Daily load query: teacher-2 has 6 classes
          return Promise.resolve(Array(6).fill(null).map(() => ({
            teacherId: 'teacher-2', weekType: WeekType.ALL,
          })));
        }
        return Promise.resolve([]);
      });
      prisma.teachingLoad.findMany.mockResolvedValue([
        { teacherId: 'teacher-2', subjectId: 'subj-1', classId: 'class-1' },
      ]);
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);

      const result = await service.analyze({ scheduleId: 'sched-1', date: '2026-05-04' }, mockDirector);

      const subOptions = result.options.filter(o => o.type === 'substitute_teacher');
      expect(subOptions.length).toBe(1);
      expect(subOptions[0].score).toBeLessThan(50); // overloaded penalty applied
      expect(subOptions[0].explanation).toContain('Juda band');
    });

    it('should scope Branch Admin to own branch', async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave-1', schoolId: 'school-1', branchId: 'branch-2',
        requesterId: 'teacher-1', startDate: new Date('2026-05-04'), endDate: new Date('2026-05-04'),
        affectsSchedule: true,
        requester: { firstName: 'Ali', lastName: 'Valiyev' },
      });

      await expect(service.analyze({ leaveRequestId: 'leave-1' }, mockBranchAdmin))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('apply', () => {
    it('should create approved TeacherSubstitution for substitute_teacher repair', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', status: ScheduleStatus.PUBLISHED,
      });
      prisma.teacherSubstitution.findFirst.mockResolvedValue(null);
      prisma.teacherSubstitution.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'sub-1', ...data }),
      );

      const result = await service.apply({
        optionId: 'opt-1', type: 'substitute_teacher',
        scheduleId: 'sched-1', date: '2026-05-04',
        substituteTeacherId: 'teacher-2',
      }, mockDirector);

      expect(result.applied).toBe(true);
      expect(result.type).toBe('substitute_teacher');
      expect(result.substitutionId).toBe('sub-1');
      expect(prisma.teacherSubstitution.create).toHaveBeenCalled();
    });

    it('should reject non-substitute repair types as analyze-only', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', status: ScheduleStatus.PUBLISHED,
      });

      await expect(service.apply({
        optionId: 'opt-1', type: 'room_swap',
        scheduleId: 'sched-1', date: '2026-05-04',
        newRoomId: 'room-2',
      }, mockDirector)).rejects.toThrow(BadRequestException);
    });

    it('should reject if substitution already exists', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', status: ScheduleStatus.PUBLISHED,
      });
      prisma.teacherSubstitution.findFirst.mockResolvedValue({ id: 'existing-sub' });

      await expect(service.apply({
        optionId: 'opt-1', type: 'substitute_teacher',
        scheduleId: 'sched-1', date: '2026-05-04',
        substituteTeacherId: 'teacher-2',
      }, mockDirector)).rejects.toThrow(BadRequestException);
    });

    it('should not mutate published Schedule', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', status: ScheduleStatus.PUBLISHED,
      });
      prisma.teacherSubstitution.findFirst.mockResolvedValue(null);
      prisma.teacherSubstitution.create.mockResolvedValue({ id: 'sub-1' });

      await service.apply({
        optionId: 'opt-1', type: 'substitute_teacher',
        scheduleId: 'sched-1', date: '2026-05-04',
        substituteTeacherId: 'teacher-2',
      }, mockDirector);

      // Schedule.update should NOT be called
      expect(prisma.schedule.update).not.toHaveBeenCalled();
    });

    it('should reject Branch Admin for other branch schedule', async () => {
      prisma.schedule.findFirst.mockResolvedValue(null); // different branch

      await expect(service.apply({
        optionId: 'opt-1', type: 'substitute_teacher',
        scheduleId: 'sched-1', date: '2026-05-04',
        substituteTeacherId: 'teacher-2',
      }, mockBranchAdmin)).rejects.toThrow(NotFoundException);
    });
  });
});
