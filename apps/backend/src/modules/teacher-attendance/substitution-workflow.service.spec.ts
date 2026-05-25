import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { SubstitutionWorkflowService } from './substitution-workflow.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { JwtPayload, UserRole, ScheduleStatus, WeekType, SubstitutionStatus } from '@eduplatform/types';

const mockDirector: JwtPayload = {
  sub: 'user-director', email: 'd@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockVP: JwtPayload = {
  sub: 'user-vp', email: 'vp@test.com', role: UserRole.VICE_PRINCIPAL,
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

describe('SubstitutionWorkflowService', () => {
  let service: SubstitutionWorkflowService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      leaveRequest: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn() },
      schedule: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
      user: { findUnique: jest.fn(), findMany: jest.fn() },
      teacherSubstitution: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      teacherAttendance: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn(), deleteMany: jest.fn() },
      teachingLoad: { findMany: jest.fn() },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };

    const auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubstitutionWorkflowService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<SubstitutionWorkflowService>(SubstitutionWorkflowService);
    jest.clearAllMocks();
  });

  // ─── getAffectedSchedules ──────────────────────────────────────────────────

  describe('getAffectedSchedules', () => {
    it('should return empty for non-teacher requester', async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
        requesterId: 'student-1', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-03'),
        affectsSchedule: true,
      });
      prisma.user.findUnique.mockResolvedValue({ role: 'student', firstName: 'Ali', lastName: 'Valiyev' });

      const result = await service.getAffectedSchedules('leave-1', mockDirector);
      expect(result.affectedSlots).toHaveLength(0);
    });

    it('should return empty when affectsSchedule=false', async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
        requesterId: 'teacher-1', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-03'),
        affectsSchedule: false,
      });
      prisma.user.findUnique.mockResolvedValue({ role: 'teacher', firstName: 'Ali', lastName: 'Valiyev' });

      const result = await service.getAffectedSchedules('leave-1', mockDirector);
      expect(result.affectedSlots).toHaveLength(0);
    });

    it('should detect affected published schedules respecting weekType', async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
        requesterId: 'teacher-1', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-15'),
        affectsSchedule: true,
      });
      prisma.user.findUnique.mockResolvedValue({ role: 'teacher', firstName: 'Ali', lastName: 'Valiyev' });
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-all', dayOfWeek: 'monday', timeSlot: 1, startTime: '08:00', endTime: '09:00',
          weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED, teacherId: 'teacher-1',
          subject: { name: 'Matematika' }, class: { name: '5-A' }, room: { name: '101' }, branch: { name: 'Chilonzor' },
        },
        {
          id: 'sched-num', dayOfWeek: 'monday', timeSlot: 2, startTime: '09:00', endTime: '10:00',
          weekType: WeekType.NUMERATOR, status: ScheduleStatus.PUBLISHED, teacherId: 'teacher-1',
          subject: { name: 'Fizika' }, class: { name: '6-A' }, room: null, branch: { name: 'Chilonzor' },
        },
      ]);

      const result = await service.getAffectedSchedules('leave-1', mockDirector);
      // May 2026: Mondays are May 4 (week 19 numerator), May 11 (week 20 denominator)
      // ALL: May 4 + May 11 = 2 slots
      // NUMERATOR: May 4 only = 1 slot
      expect(result.affectedCount).toBe(3);
      expect(result.affectedSlots.map((s: any) => s.scheduleId)).toEqual(
        expect.arrayContaining(['sched-all', 'sched-num']),
      );
    });

    it('should scope Branch Admin to own branch', async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
        requesterId: 'teacher-1', startDate: new Date('2026-05-01'), endDate: new Date('2026-05-03'),
        affectsSchedule: true,
      });
      prisma.user.findUnique.mockResolvedValue({ role: 'teacher', firstName: 'Ali', lastName: 'Valiyev' });
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      await service.getAffectedSchedules('leave-1', mockBranchAdmin);
      expect(prisma.schedule.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ branchId: 'branch-1' }),
      }));
    });
  });

  // ─── getCandidates ─────────────────────────────────────────────────────────

  describe('getCandidates', () => {
    it('should reject non-manager access', async () => {
      await expect(service.getCandidates('sched-1', '2026-05-01', mockTeacher)).rejects.toThrow(ForbiddenException);
    });

    it('should exclude busy teachers', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL,
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-2', firstName: 'Bob', lastName: 'Smith', branchId: 'branch-1' },
        { id: 'teacher-3', firstName: 'Carol', lastName: 'White', branchId: 'branch-1' },
      ]);
      // teacher-2 is busy (has conflicting schedule)
      prisma.schedule.findMany.mockImplementation((args: any) => {
        if (args?.where?.teacherId?.in) {
          return Promise.resolve([{ teacherId: 'teacher-2' }]);
        }
        return Promise.resolve([]);
      });
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);
      prisma.leaveRequest.findMany.mockResolvedValue([]);
      prisma.teachingLoad.findMany.mockResolvedValue([]);

      const result = await service.getCandidates('sched-1', '2026-05-01', mockDirector);
      const teacherIds = result.map(c => c.teacherId);
      expect(teacherIds).not.toContain('teacher-2');
      expect(teacherIds).toContain('teacher-3');
    });

    it('should prefer same subject teachers', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL,
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-2', firstName: 'Bob', lastName: 'Smith', branchId: 'branch-1' },
        { id: 'teacher-3', firstName: 'Carol', lastName: 'White', branchId: 'branch-1' },
      ]);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);
      prisma.leaveRequest.findMany.mockResolvedValue([]);
      prisma.teachingLoad.findMany.mockResolvedValue([
        { teacherId: 'teacher-2', classId: 'class-1', subjectId: 'subj-1' }, // same subject + class
        { teacherId: 'teacher-3', classId: 'class-2', subjectId: 'subj-1' }, // same subject only
      ]);

      const result = await service.getCandidates('sched-1', '2026-05-01', mockDirector);
      expect(result[0].teacherId).toBe('teacher-2'); // highest score
      expect(result[0].reasons).toContain("Shu fan va sinfda o'qitadi");
      expect(result[1].reasons).toContain("Shu fanni o'qitadi");
    });

    it('should exclude teachers on leave', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        dayOfWeek: 'monday', timeSlot: 1, weekType: WeekType.ALL,
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'teacher-2', firstName: 'Bob', lastName: 'Smith', branchId: 'branch-1' },
      ]);
      prisma.schedule.findMany.mockResolvedValue([]);
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);
      prisma.leaveRequest.findMany.mockResolvedValue([
        { requesterId: 'teacher-2', startDate: new Date('2026-04-01'), endDate: new Date('2026-06-01'), affectsSchedule: true },
      ]);
      prisma.teachingLoad.findMany.mockResolvedValue([]);

      const result = await service.getCandidates('sched-1', '2026-05-01', mockDirector);
      expect(result).toHaveLength(0);
    });
  });

  // ─── proposeSubstitutions ──────────────────────────────────────────────────

  describe('proposeSubstitutions', () => {
    it('should create proposed substitutions', async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
        requesterId: 'teacher-1', startDate: new Date('2026-05-04'), endDate: new Date('2026-05-04'),
        affectsSchedule: true,
      });
      prisma.user.findUnique.mockResolvedValue({ role: 'teacher', firstName: 'Ali', lastName: 'Valiyev' });
      prisma.teacherSubstitution.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1', dayOfWeek: 'monday', timeSlot: 1, startTime: '08:00', endTime: '09:00',
          weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED, teacherId: 'teacher-1',
          subject: { name: 'Matematika' }, class: { name: '5-A' }, room: { name: '101' }, branch: { name: 'Chilonzor' },
        },
      ]);
      prisma.schedule.findUnique.mockResolvedValue({ teacherId: 'teacher-1', branchId: 'branch-1' });
      prisma.teacherSubstitution.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'sub-1', ...data }));

      const result = await service.proposeSubstitutions({
        leaveRequestId: 'leave-1',
        selections: [{ scheduleId: 'sched-1', date: '2026-05-04', substituteTeacherId: 'teacher-2' }],
      }, mockDirector);

      expect(result.count).toBe(1);
      expect(prisma.teacherSubstitution.create).toHaveBeenCalled();
    });

    it('should skip existing non-rejected substitutions', async () => {
      prisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave-1', schoolId: 'school-1', branchId: 'branch-1',
        requesterId: 'teacher-1', startDate: new Date('2026-05-04'), endDate: new Date('2026-05-04'),
        affectsSchedule: true,
      });
      prisma.user.findUnique.mockResolvedValue({ role: 'teacher', firstName: 'Ali', lastName: 'Valiyev' });
      prisma.teacherSubstitution.findMany.mockResolvedValue([
        { id: 'existing-sub', scheduleId: 'sched-1', date: new Date('2026-05-04'), status: 'proposed' },
      ]);
      prisma.teacherSubstitution.findFirst.mockResolvedValue(
        { id: 'existing-sub', scheduleId: 'sched-1', date: new Date('2026-05-04'), status: 'proposed' },
      );
      prisma.schedule.findMany.mockResolvedValue([
        {
          id: 'sched-1', dayOfWeek: 'monday', timeSlot: 1, startTime: '08:00', endTime: '09:00',
          weekType: WeekType.ALL, status: ScheduleStatus.PUBLISHED, teacherId: 'teacher-1',
          subject: { name: 'Matematika' }, class: { name: '5-A' }, room: { name: '101' }, branch: { name: 'Chilonzor' },
        },
      ]);

      const result = await service.proposeSubstitutions({
        leaveRequestId: 'leave-1',
        selections: [{ scheduleId: 'sched-1', date: '2026-05-04', substituteTeacherId: 'teacher-2' }],
      }, mockDirector);

      expect(result.count).toBe(0);
      expect(result.skipped.length).toBeGreaterThan(0);
    });
  });

  // ─── approve / reject / apply / cancel ─────────────────────────────────────

  describe('state transitions', () => {
    it('should approve proposed substitution', async () => {
      prisma.teacherSubstitution.findFirst.mockResolvedValue({
        id: 'sub-1', schoolId: 'school-1', branchId: 'branch-1',
        status: SubstitutionStatus.PROPOSED,
        originalTeacherId: 'teacher-1', substituteTeacherId: 'teacher-2',
      });
      prisma.teacherSubstitution.update.mockResolvedValue({ id: 'sub-1', status: 'approved' });

      const result = await service.approveSubstitution('sub-1', mockDirector);
      expect(result.status).toBe('approved');
    });

    it('should reject proposed substitution', async () => {
      prisma.teacherSubstitution.findFirst.mockResolvedValue({
        id: 'sub-1', schoolId: 'school-1', branchId: 'branch-1',
        status: SubstitutionStatus.PROPOSED,
        originalTeacherId: 'teacher-1', substituteTeacherId: 'teacher-2',
        notes: null,
      });
      prisma.teacherSubstitution.update.mockResolvedValue({ id: 'sub-1', status: 'rejected' });

      const result = await service.rejectSubstitution('sub-1', 'Boshqa reja', mockDirector);
      expect(result.status).toBe('rejected');
    });

    it('should apply approved substitution and write attendance', async () => {
      prisma.teacherSubstitution.findFirst.mockResolvedValue({
        id: 'sub-1', schoolId: 'school-1', branchId: 'branch-1',
        status: SubstitutionStatus.APPROVED,
        originalTeacherId: 'teacher-1', substituteTeacherId: 'teacher-2',
        scheduleId: 'sched-1', date: new Date('2026-05-04'),
        leaveRequestId: 'leave-1',
        schedule: { teacherId: 'teacher-1', subjectId: 'subj-1', branchId: 'branch-1', schoolId: 'school-1' },
        leaveRequest: { type: 'sick' },
      });
      prisma.teacherSubstitution.update.mockResolvedValue({ id: 'sub-1', status: 'applied' });
      prisma.teacherAttendance.upsert.mockResolvedValue({});
      prisma.teacherSubstitution.findUnique.mockResolvedValue({
        id: 'sub-1', status: 'applied',
        originalTeacher: { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev' },
        substituteTeacher: { id: 'teacher-2', firstName: 'Bob', lastName: 'Smith' },
        schedule: { dayOfWeek: 'monday', timeSlot: 1, subject: { name: 'Matematika' }, class: { name: '5-A' } },
      });

      const result = await service.applySubstitution('sub-1', mockDirector);
      expect(result!.status).toBe('applied');
      expect(prisma.teacherAttendance.upsert).toHaveBeenCalledTimes(2);
    });

    it('should cancel substitution and delete attendance', async () => {
      prisma.teacherSubstitution.findFirst.mockResolvedValue({
        id: 'sub-1', schoolId: 'school-1', branchId: 'branch-1',
        status: SubstitutionStatus.PROPOSED,
        originalTeacherId: 'teacher-1', substituteTeacherId: 'teacher-2',
        notes: null,
      });
      prisma.teacherSubstitution.update.mockResolvedValue({ id: 'sub-1', status: 'cancelled' });
      prisma.teacherAttendance.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.cancelSubstitution('sub-1', 'Reja o\'zgardi', mockDirector);
      expect(result.id).toBe('sub-1');
      expect(prisma.teacherAttendance.deleteMany).toHaveBeenCalledWith({ where: { substitutionId: 'sub-1' } });
    });
  });

  // ─── RBAC ──────────────────────────────────────────────────────────────────

  describe('RBAC', () => {
    it('should allow Director to approve', async () => {
      prisma.teacherSubstitution.findFirst.mockResolvedValue({
        id: 'sub-1', schoolId: 'school-1', branchId: 'branch-1',
        status: SubstitutionStatus.PROPOSED,
        originalTeacherId: 'teacher-1', substituteTeacherId: 'teacher-2',
      });
      prisma.teacherSubstitution.update.mockResolvedValue({ id: 'sub-1', status: 'approved' });

      const result = await service.approveSubstitution('sub-1', mockDirector);
      expect(result.status).toBe('approved');
    });

    it('should allow Branch Admin for own branch', async () => {
      prisma.teacherSubstitution.findFirst.mockResolvedValue({
        id: 'sub-1', schoolId: 'school-1', branchId: 'branch-1',
        status: SubstitutionStatus.PROPOSED,
        originalTeacherId: 'teacher-1', substituteTeacherId: 'teacher-2',
      });
      prisma.teacherSubstitution.update.mockResolvedValue({ id: 'sub-1', status: 'approved' });

      const result = await service.approveSubstitution('sub-1', mockBranchAdmin);
      expect(result.status).toBe('approved');
    });

    it('should reject Branch Admin for other branch', async () => {
      prisma.teacherSubstitution.findFirst.mockResolvedValue({
        id: 'sub-1', schoolId: 'school-1', branchId: 'branch-2',
        status: SubstitutionStatus.PROPOSED,
        originalTeacherId: 'teacher-1', substituteTeacherId: 'teacher-2',
      });

      await expect(service.approveSubstitution('sub-1', mockBranchAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('should reject Teacher from management actions', async () => {
      await expect(service.approveSubstitution('sub-1', mockTeacher)).rejects.toThrow(ForbiddenException);
      await expect(service.getCandidates('sched-1', '2026-05-01', mockTeacher)).rejects.toThrow(ForbiddenException);
    });

    it('should reject Student from all access', async () => {
      await expect(service.listSubstitutions(mockStudent)).rejects.toThrow(ForbiddenException);
    });

    it('should allow Teacher to view own substitutions', async () => {
      prisma.teacherSubstitution.findMany.mockResolvedValue([
        { id: 'sub-1', originalTeacherId: 'teacher-1', substituteTeacherId: 'teacher-2', status: 'proposed' },
      ]);
      prisma.teacherSubstitution.count.mockResolvedValue(1);

      const result = await service.listSubstitutions(mockTeacher);
      expect(result.items).toHaveLength(1);
      expect(prisma.teacherSubstitution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ originalTeacherId: 'teacher-1' }, { substituteTeacherId: 'teacher-1' }],
          }),
        }),
      );
    });
  });

  // ─── listSubstitutions ─────────────────────────────────────────────────────

  describe('listSubstitutions', () => {
    it('should return paginated results', async () => {
      prisma.teacherSubstitution.findMany.mockResolvedValue([
        { id: 'sub-1', status: 'proposed', originalTeacher: { id: 't1', firstName: 'Ali', lastName: 'Valiyev' }, substituteTeacher: { id: 't2', firstName: 'Bob', lastName: 'Smith' }, schedule: { dayOfWeek: 'monday', timeSlot: 1 }, branch: { id: 'b1', name: 'Chilonzor' } },
      ]);
      prisma.teacherSubstitution.count.mockResolvedValue(1);

      const result = await service.listSubstitutions(mockDirector, { status: 'proposed' });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
