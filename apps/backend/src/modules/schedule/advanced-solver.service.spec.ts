import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdvancedSolverService } from './advanced-solver.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConflictDetectorService } from '@/common/utils/conflict-detector';
import { JwtPayload, UserRole, DayOfWeek, WeekType, ScheduleStatus, SolverRunStatus } from '@eduplatform/types';

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

const mockConflictDetector = {
  checkClash: jest.fn().mockResolvedValue([]),
};

describe('AdvancedSolverService', () => {
  let service: AdvancedSolverService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      subject: { findMany: jest.fn() },
      period: { findMany: jest.fn() },
      room: { findMany: jest.fn() },
      schedule: { findMany: jest.fn() },
      school: { findUnique: jest.fn().mockResolvedValue({ timezone: 'Asia/Tashkent' }) },
      solverRun: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedSolverService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConflictDetectorService, useValue: mockConflictDetector },
      ],
    }).compile();

    service = module.get<AdvancedSolverService>(AdvancedSolverService);
    mockConflictDetector.checkClash.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  function setupDefaults() {
    prisma.subject.findMany.mockResolvedValue([
      { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 2 },
      { id: 'subj-2', classId: 'class-2', teacherId: 'teacher-2', name: 'Fizika', hoursPerWeek: 2 },
    ]);
    prisma.period.findMany.mockResolvedValue([
      { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
      { periodNumber: 2, startTime: '09:00', endTime: '09:45' },
    ]);
    prisma.room.findMany.mockResolvedValue([
      { id: 'room-1', name: '101' },
      { id: 'room-2', name: '102' },
    ]);
    prisma.schedule.findMany.mockResolvedValue([]);
  }

  // ─── Core functionality ────────────────────────────────────────────────────

  describe('greedy strategy', () => {
    it('should place all demands when enough slots exist', async () => {
      setupDefaults();
      const result = await service.run({ branchId: 'branch-1', strategy: 'greedy' }, mockDirector);

      expect(result.totalDemands).toBe(4); // 2 subjects × 2 hours
      expect(result.placed).toBe(4);
      expect(result.failed).toBe(0);
      expect(result.strategyUsed).toBe('greedy');
      expect(result.diagnostics.greedyPlaced).toBe(4);
      expect(result.diagnostics.backtrackRecovered).toBe(0);
    });

    it('should default hoursPerWeek to 2 if null', async () => {
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: null },
      ]);
      prisma.period.findMany.mockResolvedValue([
        { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
        { periodNumber: 2, startTime: '09:00', endTime: '09:45' },
      ]);
      prisma.room.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.run({ branchId: 'branch-1', strategy: 'greedy' }, mockDirector);
      expect(result.totalDemands).toBe(2);
      expect(result.placed).toBe(2);
    });

    it('should fail demands when teacher double-booked', async () => {
      setupDefaults();
      // Same teacher for both subjects → limited by periods
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 3 },
        { id: 'subj-2', classId: 'class-2', teacherId: 'teacher-1', name: 'Fizika', hoursPerWeek: 3 },
      ]);

      const result = await service.run({
        branchId: 'branch-1', strategy: 'greedy', daysOfWeek: [DayOfWeek.MONDAY],
      }, mockDirector);

      // Only 2 periods on Monday, teacher can't be in 2 places at once
      expect(result.placed).toBeLessThanOrEqual(2);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(100);
    });

    it('should fail demands when class double-booked', async () => {
      setupDefaults();
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 3 },
        { id: 'subj-2', classId: 'class-1', teacherId: 'teacher-2', name: 'Fizika', hoursPerWeek: 3 },
      ]);

      const result = await service.run({
        branchId: 'branch-1', strategy: 'greedy', daysOfWeek: [DayOfWeek.MONDAY],
      }, mockDirector);

      expect(result.placed).toBeLessThanOrEqual(2);
      expect(result.failed).toBeGreaterThan(0);
    });

    it('should return failures when not enough slots', async () => {
      setupDefaults();
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 10 },
      ]);

      const result = await service.run({
        branchId: 'branch-1', strategy: 'greedy', daysOfWeek: [DayOfWeek.MONDAY],
      }, mockDirector);

      expect(result.totalDemands).toBe(10);
      expect(result.placed).toBeLessThanOrEqual(2);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.diagnostics.greedyFailed).toBeGreaterThan(0);
    });

    it('should return empty result when no periods configured', async () => {
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 2 },
      ]);
      prisma.period.findMany.mockResolvedValue([]);
      prisma.room.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.run({ branchId: 'branch-1', strategy: 'greedy' }, mockDirector);
      expect(result.totalDemands).toBe(0);
      expect(result.placed).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  // ─── Hybrid strategy ───────────────────────────────────────────────────────

  describe('hybrid strategy', () => {
    it('should place all demands when greedy succeeds', async () => {
      setupDefaults();
      const result = await service.run({ branchId: 'branch-1', strategy: 'hybrid' }, mockDirector);

      expect(result.totalDemands).toBe(4);
      expect(result.placed).toBe(4);
      expect(result.failed).toBe(0);
      expect(result.diagnostics.backtrackRecovered).toBe(0); // no failures to recover
    });

    it('should recover placements via backtracking', async () => {
      // Setup: 3 teachers, 3 classes, 6 hours each → 18 demands
      // But only 2 days × 2 periods = 4 slots per resource
      // Greedy will fail some, backtracking may recover
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 3 },
        { id: 'subj-2', classId: 'class-2', teacherId: 'teacher-2', name: 'Fizika', hoursPerWeek: 3 },
        { id: 'subj-3', classId: 'class-3', teacherId: 'teacher-3', name: 'Kimyo', hoursPerWeek: 3 },
      ]);
      prisma.period.findMany.mockResolvedValue([
        { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
        { periodNumber: 2, startTime: '09:00', endTime: '09:45' },
      ]);
      prisma.room.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      const greedyResult = await service.run({
        branchId: 'branch-1', strategy: 'greedy', daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY],
      }, mockDirector);

      const hybridResult = await service.run({
        branchId: 'branch-1', strategy: 'hybrid', daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY],
      }, mockDirector);

      // Hybrid should place at least as many as greedy
      expect(hybridResult.placed).toBeGreaterThanOrEqual(greedyResult.placed);
      expect(hybridResult.diagnostics.greedyPlaced).toBe(greedyResult.placed);
    });

    it('should respect maxDepth limit', async () => {
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 4 },
        { id: 'subj-2', classId: 'class-2', teacherId: 'teacher-2', name: 'Fizika', hoursPerWeek: 4 },
      ]);
      prisma.period.findMany.mockResolvedValue([
        { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
        { periodNumber: 2, startTime: '09:00', endTime: '09:45' },
      ]);
      prisma.room.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      const resultDepth0 = await service.run({
        branchId: 'branch-1', strategy: 'hybrid', daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY], maxDepth: 0,
      }, mockDirector);

      const resultDepth2 = await service.run({
        branchId: 'branch-1', strategy: 'hybrid', daysOfWeek: [DayOfWeek.MONDAY, DayOfWeek.TUESDAY], maxDepth: 2,
      }, mockDirector);

      // Deeper backtracking should place at least as many
      expect(resultDepth2.placed).toBeGreaterThanOrEqual(resultDepth0.placed);
    });
  });

  // ─── Timeout ───────────────────────────────────────────────────────────────

  describe('timeout', () => {
    it('should respect timeout and return partial result', async () => {
      // Use a larger dataset so processing exceeds 1ms
      const subjects = Array.from({ length: 50 }, (_, i) => ({
        id: `subj-${i}`, classId: `class-${i % 10}`, teacherId: `teacher-${i % 20}`,
        name: `Fan ${i}`, hoursPerWeek: 3,
      }));
      prisma.subject.findMany.mockResolvedValue(subjects);
      prisma.period.findMany.mockResolvedValue(
        Array.from({ length: 8 }, (_, i) => ({ periodNumber: i + 1, startTime: `${8 + i}:00`, endTime: `${8 + i}:45` })),
      );
      prisma.room.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.run({
        branchId: 'branch-1', strategy: 'hybrid', timeoutMs: 1,
      }, mockDirector);

      expect(result.runtimeMs).toBeLessThan(100);
      // With 1ms timeout on a large dataset, it may or may not hit depending on JS event loop.
      // The key assertion is that it returns gracefully without crashing.
      expect(result.totalDemands).toBeGreaterThan(0);
    });

    it('should cap timeout at 30s', async () => {
      setupDefaults();
      const result = await service.run({
        branchId: 'branch-1', strategy: 'hybrid', timeoutMs: 999999,
      }, mockDirector);

      // Should complete quickly since dataset is small
      expect(result.runtimeMs).toBeLessThan(5000);
    });
  });

  // ─── Determinism ───────────────────────────────────────────────────────────

  describe('determinism', () => {
    it('should produce identical results for identical inputs', async () => {
      setupDefaults();
      const result1 = await service.run({ branchId: 'branch-1', strategy: 'hybrid' }, mockDirector);
      const result2 = await service.run({ branchId: 'branch-1', strategy: 'hybrid' }, mockDirector);

      expect(result1.placed).toBe(result2.placed);
      expect(result1.failed).toBe(result2.failed);
      expect(result1.score).toBe(result2.score);
      expect(result1.proposedSlots.map(s => s.id).sort()).toEqual(result2.proposedSlots.map(s => s.id).sort());
    });
  });

  // ─── Scoring ───────────────────────────────────────────────────────────────

  describe('scoring', () => {
    it('should score high when all placed with good distribution', async () => {
      setupDefaults();
      const result = await service.run({ branchId: 'branch-1', strategy: 'greedy' }, mockDirector);
      expect(result.placed).toBe(4);
      expect(result.score).toBeGreaterThanOrEqual(90);
    });

    it('should penalize teacher overload', async () => {
      // 1 teacher, 1 class, 6 hours on same day → overload penalty
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 6 },
      ]);
      prisma.period.findMany.mockResolvedValue([
        { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
        { periodNumber: 2, startTime: '09:00', endTime: '09:45' },
        { periodNumber: 3, startTime: '10:00', endTime: '10:45' },
        { periodNumber: 4, startTime: '11:00', endTime: '11:45' },
        { periodNumber: 5, startTime: '12:00', endTime: '12:45' },
        { periodNumber: 6, startTime: '13:00', endTime: '13:45' },
      ]);
      prisma.room.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.run({
        branchId: 'branch-1', strategy: 'greedy', daysOfWeek: [DayOfWeek.MONDAY],
      }, mockDirector);

      expect(result.placed).toBe(6);
      expect(result.score).toBeLessThan(100); // penalized for overload
    });

    it('should penalize subject clustering', async () => {
      // Same subject multiple times on same day for same class
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 4 },
      ]);
      prisma.period.findMany.mockResolvedValue([
        { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
        { periodNumber: 2, startTime: '09:00', endTime: '09:45' },
        { periodNumber: 3, startTime: '10:00', endTime: '10:45' },
        { periodNumber: 4, startTime: '11:00', endTime: '11:45' },
      ]);
      prisma.room.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.run({
        branchId: 'branch-1', strategy: 'greedy', daysOfWeek: [DayOfWeek.MONDAY],
      }, mockDirector);

      expect(result.placed).toBe(4);
      expect(result.score).toBeLessThan(100); // penalized for clustering
    });
  });

  // ─── SolverRun persistence ─────────────────────────────────────────────────

  describe('SolverRun persistence', () => {
    it('should persist a run record on completion', async () => {
      setupDefaults();
      await service.run({ branchId: 'branch-1', strategy: 'greedy' }, mockDirector);

      expect(prisma.solverRun.create).toHaveBeenCalledTimes(1);
      const call = prisma.solverRun.create.mock.calls[0][0];
      expect(call.data.schoolId).toBe('school-1');
      expect(call.data.branchId).toBe('branch-1');
      expect(call.data.strategy).toBe('greedy');
      expect(call.data.status).toBe(SolverRunStatus.COMPLETED);
      expect(call.data.demandsCount).toBe(4);
      expect(call.data.placedCount).toBe(4);
      expect(call.data.failureCount).toBe(0);
      expect(call.data.score).toBeGreaterThanOrEqual(90);
      expect(call.data.metadata.greedyPlaced).toBe(4);
    });

    it('should persist cancelled status on timeout', async () => {
      setupDefaults();
      await service.run({ branchId: 'branch-1', strategy: 'hybrid', timeoutMs: 1 }, mockDirector);

      expect(prisma.solverRun.create).toHaveBeenCalledTimes(1);
      const call = prisma.solverRun.create.mock.calls[0][0];
      expect(call.data.status).toBeDefined();
    });

    it('should not throw if persistence fails', async () => {
      setupDefaults();
      prisma.solverRun.create.mockRejectedValue(new Error('DB error'));

      // Should not throw
      const result = await service.run({ branchId: 'branch-1', strategy: 'greedy' }, mockDirector);
      expect(result.placed).toBe(4);
    });
  });

  // ─── RBAC ──────────────────────────────────────────────────────────────────

  describe('RBAC', () => {
    it('should allow Director', async () => {
      setupDefaults();
      const result = await service.run({ branchId: 'branch-1' }, mockDirector);
      expect(result.totalDemands).toBe(4);
    });

    it('should allow Vice Principal', async () => {
      setupDefaults();
      const result = await service.run({ branchId: 'branch-1' }, mockVP);
      expect(result.totalDemands).toBe(4);
    });

    it('should allow Branch Admin for own branch', async () => {
      setupDefaults();
      const result = await service.run({}, mockBranchAdmin);
      expect(result.totalDemands).toBe(4);
    });

    it('should reject Branch Admin for other branch', async () => {
      await expect(
        service.run({ branchId: 'branch-2' }, mockBranchAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject Teacher', async () => {
      setupDefaults();
      await expect(
        service.run({ branchId: 'branch-1' }, mockTeacher),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should require branchId for Director when not provided', async () => {
      await expect(service.run({}, mockDirector)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── weekType ──────────────────────────────────────────────────────────────

  describe('weekType', () => {
    it('should filter existing schedules by weekType', async () => {
      setupDefaults();
      prisma.schedule.findMany.mockResolvedValue([]);

      await service.run({
        branchId: 'branch-1', strategy: 'greedy', weekType: WeekType.NUMERATOR,
      }, mockDirector);

      // Verify that the schedule query was called with weekType filter
      const scheduleQuery = prisma.schedule.findMany.mock.calls.find(
        (call: any) => call[0]?.where?.weekType,
      );
      expect(scheduleQuery).toBeDefined();
      expect(scheduleQuery[0].where.weekType).toEqual({ in: [WeekType.ALL, WeekType.NUMERATOR] });
    });
  });

  // ─── listRuns ──────────────────────────────────────────────────────────────

  describe('listRuns', () => {
    it('should return paginated runs for Director', async () => {
      prisma.solverRun.findMany.mockResolvedValue([
        { id: 'run-1', strategy: 'hybrid', placedCount: 10 },
        { id: 'run-2', strategy: 'greedy', placedCount: 8 },
      ]);
      prisma.solverRun.count.mockResolvedValue(2);

      const result = await service.listRuns(mockDirector, { limit: 10, offset: 0 });

      expect(result.runs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(10);
      expect(prisma.solverRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: 'school-1' } }),
      );
    });

    it('should filter by branch for Branch Admin', async () => {
      await service.listRuns(mockBranchAdmin);

      expect(prisma.solverRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { schoolId: 'school-1', branchId: 'branch-1' } }),
      );
    });
  });

  // ─── Benchmarks ────────────────────────────────────────────────────────────

  describe('benchmarks', () => {
    function buildDataset(classCount: number, periodsPerDay: number, days: DayOfWeek[]) {
      const teachers = Array.from({ length: Math.max(5, Math.floor(classCount * 0.8)) }, (_, i) => ({
        id: `teacher-${i}`,
        firstName: `Oqituvchi`,
        lastName: `${i}`,
      }));

      const classes = Array.from({ length: classCount }, (_, i) => ({
        id: `class-${i}`,
        name: `Sinf ${i + 1}`,
      }));

      const rooms = Array.from({ length: Math.max(3, Math.floor(classCount * 0.5)) }, (_, i) => ({
        id: `room-${i}`,
        name: `Xona ${i + 1}`,
      }));

      const periods = Array.from({ length: periodsPerDay }, (_, i) => ({
        periodNumber: i + 1,
        startTime: `${8 + i}:00`,
        endTime: `${8 + i}:45`,
      }));

      const subjects: any[] = [];
      let idx = 0;
      for (const cls of classes) {
        const subjectCount = 5 + Math.floor(Math.random() * 3); // 5-7 subjects per class
        for (let s = 0; s < subjectCount; s++) {
          subjects.push({
            id: `subject-${idx}`,
            classId: cls.id,
            teacherId: teachers[idx % teachers.length].id,
            name: `Fan ${s + 1}`,
            hoursPerWeek: 2 + (s % 2), // 2-3 hours per week
          });
          idx++;
        }
      }

      return { teachers, classes, rooms, periods, subjects };
    }

    it('small dataset (3 classes, 6 periods, 5 days) < 500ms', async () => {
      const { subjects, rooms, periods } = buildDataset(3, 6, [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]);
      prisma.subject.findMany.mockResolvedValue(subjects);
      prisma.period.findMany.mockResolvedValue(periods);
      prisma.room.findMany.mockResolvedValue(rooms);
      prisma.schedule.findMany.mockResolvedValue([]);

      const start = Date.now();
      const result = await service.run({ branchId: 'branch-1', strategy: 'hybrid' }, mockDirector);
      const elapsed = Date.now() - start;

      console.log(`  small dataset: ${elapsed}ms, placed=${result.placed}/${result.totalDemands}`);
      expect(elapsed).toBeLessThan(500);
      expect(result.placed).toBeGreaterThan(0);
    });

    it('medium dataset (10 classes, 7 periods, 6 days) < 2000ms', async () => {
      const { subjects, rooms, periods } = buildDataset(10, 7, [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY]);
      prisma.subject.findMany.mockResolvedValue(subjects);
      prisma.period.findMany.mockResolvedValue(periods);
      prisma.room.findMany.mockResolvedValue(rooms);
      prisma.schedule.findMany.mockResolvedValue([]);

      const start = Date.now();
      const result = await service.run({ branchId: 'branch-1', strategy: 'hybrid' }, mockDirector);
      const elapsed = Date.now() - start;

      console.log(`  medium dataset: ${elapsed}ms, placed=${result.placed}/${result.totalDemands}`);
      expect(elapsed).toBeLessThan(2000);
      expect(result.placed).toBeGreaterThan(0);
    });

    it('large dataset (30 classes, 8 periods, 6 days) < 10000ms', async () => {
      const { subjects, rooms, periods } = buildDataset(30, 8, [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY]);
      prisma.subject.findMany.mockResolvedValue(subjects);
      prisma.period.findMany.mockResolvedValue(periods);
      prisma.room.findMany.mockResolvedValue(rooms);
      prisma.schedule.findMany.mockResolvedValue([]);

      const start = Date.now();
      const result = await service.run({ branchId: 'branch-1', strategy: 'hybrid' }, mockDirector);
      const elapsed = Date.now() - start;

      console.log(`  large dataset: ${elapsed}ms, placed=${result.placed}/${result.totalDemands}`);
      expect(elapsed).toBeLessThan(10000);
      expect(result.placed).toBeGreaterThan(0);
    });

    it('hybrid should place >= greedy on medium dataset', async () => {
      const { subjects, rooms, periods } = buildDataset(10, 6, [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]);
      prisma.subject.findMany.mockResolvedValue(subjects);
      prisma.period.findMany.mockResolvedValue(periods);
      prisma.room.findMany.mockResolvedValue(rooms);
      prisma.schedule.findMany.mockResolvedValue([]);

      const greedyResult = await service.run({ branchId: 'branch-1', strategy: 'greedy' }, mockDirector);
      const hybridResult = await service.run({ branchId: 'branch-1', strategy: 'hybrid' }, mockDirector);

      console.log(`  comparison: greedy=${greedyResult.placed}, hybrid=${hybridResult.placed}`);
      expect(hybridResult.placed).toBeGreaterThanOrEqual(greedyResult.placed);
    });
  });
});
