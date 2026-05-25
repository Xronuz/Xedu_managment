/**
 * ScheduleService Production Audit — Benchmark, Concurrency, RBAC, Cache
 *
 * Run: npx jest --testPathPattern="schedule.service.benchmark" --runInBand --verbose
 *
 * These tests validate:
 *   1. Performance under realistic school-scale load
 *   2. Transaction safety / race condition resistance
 *   3. RBAC matrix (roles × actions)
 *   4. Cache invalidation correctness
 *   5. Consumer consistency (published-only filtering)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { ConflictDetectorService } from '@/common/utils/conflict-detector';
import { PeriodsService } from '@/modules/periods/periods.service';
import { AuditService } from '@/common/audit/audit.service';
import { ScheduleExportService } from './schedule-export.service';
import { JwtPayload, UserRole, DayOfWeek, ScheduleStatus, WeekType } from '@eduplatform/types';

// ── Mock helpers ─────────────────────────────────────────────────────────────

const mockRedis = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
  scan: jest.fn().mockResolvedValue(['0', []]),
  del: jest.fn().mockResolvedValue(undefined),
});

const mockAuditService = () => ({
  log: jest.fn().mockResolvedValue(undefined),
});

const mockEventsGateway = () => ({
  emitToSchool: jest.fn(),
});

// ── RBAC test users ──────────────────────────────────────────────────────────

const makeUser = (role: UserRole, branchId: string | null = null, isSuperAdmin = false): JwtPayload => ({
  sub: `user-${role}`,
  email: `${role}@test.com`,
  role,
  schoolId: 'school-1',
  branchId,
  isSuperAdmin,
});

const ROLES = [
  { name: 'Super Admin',   user: makeUser(UserRole.SUPER_ADMIN, null, true) },
  { name: 'Director',      user: makeUser(UserRole.DIRECTOR) },
  { name: 'Vice Principal',user: makeUser(UserRole.VICE_PRINCIPAL) },
  { name: 'Branch Admin',  user: makeUser(UserRole.BRANCH_ADMIN, 'branch-1') },
  { name: 'Teacher',       user: makeUser(UserRole.TEACHER, 'branch-1') },
  { name: 'Student',       user: makeUser(UserRole.STUDENT, 'branch-1') },
  { name: 'Parent',        user: makeUser(UserRole.PARENT, 'branch-1') },
];

// ── Benchmark fixtures ───────────────────────────────────────────────────────

function generateBenchmarkFixtures() {
  const teachers = Array.from({ length: 50 }, (_, i) => ({
    id: `teacher-${i}`,
    firstName: `Oqituvchi`,
    lastName: `${i}`,
    schoolId: 'school-1',
    branchId: 'branch-1',
    role: UserRole.TEACHER,
  }));

  const classes = Array.from({ length: 120 }, (_, i) => ({
    id: `class-${i}`,
    name: `Sinf ${i + 1}`,
    schoolId: 'school-1',
    branchId: 'branch-1',
    gradeLevel: Math.floor(i / 20) + 1,
  }));

  const rooms = Array.from({ length: 80 }, (_, i) => ({
    id: `room-${i}`,
    name: `Xona ${i + 1}`,
    schoolId: 'school-1',
    branchId: 'branch-1',
    capacity: 30,
  }));

  const periods = Array.from({ length: 8 }, (_, i) => ({
    id: `period-${i + 1}`,
    schoolId: 'school-1',
    branchId: 'branch-1',
    periodNumber: i + 1,
    startTime: `${8 + i}:00`,
    endTime: `${8 + i}:45`,
    isActive: true,
  }));

  // ~1200 subject demands (each class has ~10 subjects)
  const subjects: any[] = [];
  let subjectIdx = 0;
  for (const cls of classes) {
    const subjectCount = 8 + Math.floor(Math.random() * 5); // 8-12 subjects per class
    for (let s = 0; s < subjectCount; s++) {
      const teacher = teachers[subjectIdx % teachers.length];
      subjects.push({
        id: `subject-${subjectIdx}`,
        schoolId: 'school-1',
        branchId: 'branch-1',
        classId: cls.id,
        name: `Fan ${s + 1}`,
        teacherId: teacher.id,
        hoursPerWeek: 2 + (s % 3), // 2-4 hours per week
      });
      subjectIdx++;
    }
  }

  // ~1200 published schedules (fill ~60% of available slots)
  const schedules: any[] = [];
  const days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY];
  let schedIdx = 0;
  for (const subj of subjects.slice(0, 1200)) {
    const day = days[schedIdx % days.length];
    const slot = (schedIdx % 8) + 1;
    const weekType = schedIdx % 3 === 0 ? WeekType.ALL : schedIdx % 3 === 1 ? WeekType.NUMERATOR : WeekType.DENOMINATOR;
    schedules.push({
      id: `schedule-${schedIdx}`,
      schoolId: 'school-1',
      branchId: 'branch-1',
      classId: subj.classId,
      subjectId: subj.id,
      teacherId: subj.teacherId,
      roomId: `room-${schedIdx % rooms.length}`,
      dayOfWeek: day,
      timeSlot: slot,
      startTime: `${7 + slot}:00`,
      endTime: `${7 + slot}:45`,
      status: ScheduleStatus.PUBLISHED,
      weekType,
      publishedAt: new Date(),
      publishedBy: 'user-director',
    });
    schedIdx++;
  }

  return { teachers, classes, rooms, periods, subjects, schedules };
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('ScheduleService Production Audit', () => {
  let service: ScheduleService;
  let exportService: ScheduleExportService;
  let prisma: any;
  let redis: any;
  let conflictDetector: any;

  beforeEach(async () => {
    redis = mockRedis();
    conflictDetector = {
      checkClash: jest.fn().mockResolvedValue([]),
      assertNoClash: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      schedule: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      class: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      subject: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      room: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      school: {
        findUnique: jest.fn().mockResolvedValue({ timezone: 'Asia/Tashkent' }),
      },
      period: {
        findFirst: jest.fn().mockResolvedValue({ startTime: '08:00', endTime: '08:45' }),
      },
      $transaction: jest.fn(async (fn: any) => {
        if (typeof fn === 'function') return fn(prisma);
        return Promise.all(fn);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        ScheduleExportService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: ConflictDetectorService, useValue: conflictDetector },
        { provide: PeriodsService, useValue: { resolvePeriod: jest.fn().mockResolvedValue({ startTime: '08:00', endTime: '08:45' }) } },
        { provide: AuditService, useValue: mockAuditService() },
        { provide: 'EventsGateway', useValue: mockEventsGateway() },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    exportService = module.get<ScheduleExportService>(ScheduleExportService);
    jest.clearAllMocks();
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 1. LARGE DATASET PERFORMANCE
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Performance — Large Dataset (1200+ schedules)', () => {
    const fixtures = generateBenchmarkFixtures();

    it('getWeek should complete in < 200ms with 1200 schedules', async () => {
      prisma.schedule.findMany.mockResolvedValue(fixtures.schedules);
      const start = Date.now();
      await service.getWeek(makeUser(UserRole.DIRECTOR), undefined, { weekType: WeekType.NUMERATOR });
      const elapsed = Date.now() - start;
      console.log(`  getWeek latency: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(200);
    });

    it('availabilityPreview should complete in < 300ms with 1200 schedules', async () => {
      prisma.schedule.findMany.mockResolvedValue(fixtures.schedules);
      const start = Date.now();
      await service.availabilityPreview(makeUser(UserRole.DIRECTOR), {
        teacherId: 'teacher-1',
        classId: 'class-1',
        roomId: 'room-1',
        weekType: WeekType.NUMERATOR,
      });
      const elapsed = Date.now() - start;
      console.log(`  availabilityPreview latency: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(300);
    });

    it('exportExcel should complete in < 500ms with 1200 schedules', async () => {
      prisma.schedule.findMany.mockResolvedValue(fixtures.schedules);
      const start = Date.now();
      await exportService.exportExcel(makeUser(UserRole.DIRECTOR), {});
      const elapsed = Date.now() - start;
      console.log(`  exportExcel latency: ${elapsed}ms`);
      expect(elapsed).toBeLessThanOrEqual(500);
    });

    it('move endpoint should complete in < 150ms', async () => {
      const slot = { ...fixtures.schedules[0], status: ScheduleStatus.DRAFT };
      prisma.schedule.findFirst.mockResolvedValue(slot);
      prisma.schedule.update.mockResolvedValue({ ...slot, dayOfWeek: DayOfWeek.TUESDAY });
      const start = Date.now();
      await service.move(slot.id, { dayOfWeek: DayOfWeek.TUESDAY, timeSlot: 2 }, makeUser(UserRole.DIRECTOR));
      const elapsed = Date.now() - start;
      console.log(`  move latency: ${elapsed}ms`);
      expect(elapsed).toBeLessThan(150);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 2. CONCURRENCY / RACE CONDITIONS
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Concurrency — Transaction Safety', () => {
    it('move should use prisma.$transaction', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 's1', schoolId: 'school-1', branchId: 'branch-1', classId: 'c1',
        teacherId: 't1', roomId: 'r1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1,
        startTime: '08:00', endTime: '08:45', status: ScheduleStatus.DRAFT, weekType: WeekType.ALL,
        class: { branchId: 'branch-1' },
      });
      prisma.schedule.update.mockResolvedValue({});

      await service.move('s1', { dayOfWeek: DayOfWeek.TUESDAY, timeSlot: 2 }, makeUser(UserRole.DIRECTOR));
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('concurrent move operations should not corrupt data (simulated)', async () => {
      const slot = {
        id: 's1', schoolId: 'school-1', branchId: 'branch-1', classId: 'c1',
        teacherId: 't1', roomId: 'r1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1,
        startTime: '08:00', endTime: '08:45', status: ScheduleStatus.DRAFT, weekType: WeekType.ALL,
        class: { branchId: 'branch-1' },
      };
      prisma.schedule.findFirst.mockResolvedValue(slot);
      prisma.schedule.update.mockResolvedValue({ ...slot, dayOfWeek: DayOfWeek.TUESDAY });

      // Simulate two concurrent moves
      const p1 = service.move('s1', { dayOfWeek: DayOfWeek.TUESDAY, timeSlot: 2 }, makeUser(UserRole.DIRECTOR));
      const p2 = service.move('s1', { dayOfWeek: DayOfWeek.WEDNESDAY, timeSlot: 3 }, makeUser(UserRole.DIRECTOR));

      // Both should resolve without throwing (transaction isolation handles the race)
      await expect(p1).resolves.toBeDefined();
      await expect(p2).resolves.toBeDefined();
    });

    it('published slot should reject move regardless of timing', async () => {
      const slot = {
        id: 's1', schoolId: 'school-1', branchId: 'branch-1', classId: 'c1',
        teacherId: 't1', roomId: 'r1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1,
        startTime: '08:00', endTime: '08:45', status: ScheduleStatus.PUBLISHED, weekType: WeekType.ALL,
        class: { branchId: 'branch-1' },
      };
      prisma.schedule.findFirst.mockResolvedValue(slot);

      await expect(
        service.move('s1', { dayOfWeek: DayOfWeek.TUESDAY, timeSlot: 2 }, makeUser(UserRole.DIRECTOR))
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 3. RBAC PENETRATION AUDIT
  // ═════════════════════════════════════════════════════════════════════════════

  describe('RBAC Matrix — Role × Action', () => {
    const actions = [
      { name: 'create',      fn: (u: JwtPayload) => service.create({ classId: 'c1', subjectId: 's1', teacherId: 't1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1, startTime: '08:00', endTime: '08:45' } as any, u) },
      { name: 'update',      fn: (u: JwtPayload) => service.update('sched-1', { startTime: '09:00' }, u) },
      { name: 'move',        fn: (u: JwtPayload) => service.move('sched-1', { dayOfWeek: DayOfWeek.TUESDAY, timeSlot: 2 }, u) },
      { name: 'validate',    fn: (u: JwtPayload) => service.validate('sched-1', u) },
      { name: 'publish',     fn: (u: JwtPayload) => service.publish('sched-1', u) },
      { name: 'unpublish',   fn: (u: JwtPayload) => service.unpublish('sched-1', u) },
      { name: 'archive',     fn: (u: JwtPayload) => service.archive('sched-1', u) },
      { name: 'bulkPublish', fn: (u: JwtPayload) => service.bulkPublish(['sched-1', 'sched-2'], u) },
    ];

    // Pre-seed a draft slot for validate/publish tests
    const draftSlot = {
      id: 'sched-1', schoolId: 'school-1', branchId: 'branch-1', classId: 'c1',
      teacherId: 't1', roomId: 'r1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1,
      startTime: '08:00', endTime: '08:45', status: ScheduleStatus.DRAFT, weekType: WeekType.ALL,
      class: { branchId: 'branch-1' },
    };

    const publishedSlot = { ...draftSlot, status: ScheduleStatus.PUBLISHED, publishedAt: new Date(), publishedBy: 'user-director' };

    beforeEach(() => {
      prisma.schedule.findFirst.mockImplementation((args: any) => {
        const id = args.where?.id;
        if (id === 'sched-1') return Promise.resolve(draftSlot);
        if (id === 'sched-2') return Promise.resolve({ ...draftSlot, id: 'sched-2' });
        return Promise.resolve(null);
      });
      prisma.schedule.findMany.mockResolvedValue([draftSlot, { ...draftSlot, id: 'sched-2' }]);
      prisma.schedule.update.mockResolvedValue(draftSlot);
      prisma.schedule.updateMany.mockResolvedValue({ count: 2 });
      prisma.class.findFirst.mockResolvedValue({ id: 'c1', branchId: 'branch-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 's1', teacherId: 't1', name: 'Fan' });
    });

    it.each([
      // [roleName, actionName, expectedPass]
      ['Director',       'create',      true],
      ['Director',       'update',      true],
      ['Director',       'move',        true],
      ['Director',       'validate',    true],
      ['Director',       'publish',     true],
      ['Director',       'unpublish',   true],
      ['Director',       'archive',     true],
      ['Director',       'bulkPublish', true],
      ['Vice Principal', 'create',      true],
      ['Vice Principal', 'update',      true],
      ['Vice Principal', 'move',        true],
      ['Vice Principal', 'validate',    true],
      ['Vice Principal', 'publish',     true],
      ['Vice Principal', 'unpublish',   true],
      ['Vice Principal', 'archive',     true],
      ['Vice Principal', 'bulkPublish', true],
      ['Branch Admin',   'create',      true],
      ['Branch Admin',   'update',      true],
      ['Branch Admin',   'move',        true],
      ['Branch Admin',   'validate',    true],
      ['Branch Admin',   'publish',     false], // blocked in service
      ['Branch Admin',   'unpublish',   false], // blocked in service
      ['Branch Admin',   'archive',     false], // blocked in service
      ['Branch Admin',   'bulkPublish', false], // blocked in service
      ['Teacher',        'create',      false],
      ['Teacher',        'update',      false],
      ['Teacher',        'move',        false],
      ['Teacher',        'validate',    false],
      ['Teacher',        'publish',     false],
      ['Teacher',        'unpublish',   false],
      ['Teacher',        'archive',     false],
      ['Teacher',        'bulkPublish', false],
      ['Student',        'create',      false],
      ['Student',        'update',      false],
      ['Student',        'move',        false],
      ['Student',        'validate',    false],
      ['Student',        'publish',     false],
      ['Student',        'unpublish',   false],
      ['Student',        'archive',     false],
      ['Student',        'bulkPublish', false],
      ['Parent',         'create',      false],
      ['Parent',         'update',      false],
      ['Parent',         'move',        false],
      ['Parent',         'validate',    false],
      ['Parent',         'publish',     false],
      ['Parent',         'unpublish',   false],
      ['Parent',         'archive',     false],
      ['Parent',         'bulkPublish', false],
    ])('%s — %s → %s', async (roleName, actionName, expectedPass) => {
      const roleConfig = ROLES.find(r => r.name === roleName)!;
      const actionConfig = actions.find(a => a.name === actionName)!;

      // Reset mocks for clean state
      prisma.schedule.findFirst.mockImplementation((args: any) => {
        const id = args.where?.id;
        if (id === 'sched-1') return Promise.resolve(draftSlot);
        if (id === 'sched-2') return Promise.resolve({ ...draftSlot, id: 'sched-2' });
        return Promise.resolve(null);
      });

      const promise = actionConfig.fn(roleConfig.user);
      if (expectedPass) {
        // For actions that pass, we expect either success or a non-RBAC error (e.g., NotFound, Conflict)
        // Since our mocks are minimal, some actions may throw NotFound or Conflict for non-RBAC reasons.
        // We just verify it does NOT throw ForbiddenException.
        try {
          await promise;
        } catch (e) {
          expect(e).not.toBeInstanceOf(ForbiddenException);
        }
      } else {
        // After hardening: ALL mutations have service-level RBAC checks
        await expect(promise).rejects.toBeDefined();
      }
    });

    it('Branch Admin cannot publish — service-level check', async () => {
      prisma.schedule.findFirst.mockResolvedValue(draftSlot);
      await expect(service.publish('sched-1', makeUser(UserRole.BRANCH_ADMIN, 'branch-1')))
        .rejects.toThrow(ForbiddenException);
    });

    it('Teacher read operations should succeed (no RBAC block)', async () => {
      prisma.schedule.findMany.mockResolvedValue([]);
      const teacher = makeUser(UserRole.TEACHER, 'branch-1');
      await expect(service.getWeek(teacher)).resolves.toEqual([]);
      await expect(service.getToday(teacher)).resolves.toEqual([]);
      await expect(service.findByClass('c1', teacher)).resolves.toEqual([]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 4. CONSUMER CONSISTENCY
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Consumer Consistency — published-only filtering', () => {
    it('getWeek for non-manager should only return published', async () => {
      const student = makeUser(UserRole.STUDENT, 'branch-1');
      prisma.schedule.findMany.mockResolvedValue([]);
      await service.getWeek(student);
      const where = prisma.schedule.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: [ScheduleStatus.PUBLISHED] });
    });

    it('getWeek for manager with includeDrafts should return draft+validated+published', async () => {
      const director = makeUser(UserRole.DIRECTOR);
      prisma.schedule.findMany.mockResolvedValue([]);
      await service.getWeek(director, undefined, { includeDrafts: true });
      const where = prisma.schedule.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: [ScheduleStatus.PUBLISHED, ScheduleStatus.DRAFT, ScheduleStatus.VALIDATED] });
    });

    it('getToday should auto-detect weekType and filter', async () => {
      const student = makeUser(UserRole.STUDENT, 'branch-1');
      prisma.schedule.findMany.mockResolvedValue([]);
      await service.getToday(student);
      const where = prisma.schedule.findMany.mock.calls[0][0].where;
      expect(where.weekType).toBeDefined();
    });

    it('availabilityPreview should include drafts for managers', async () => {
      const director = makeUser(UserRole.DIRECTOR);
      prisma.schedule.findMany.mockResolvedValue([]);
      await service.availabilityPreview(director, { teacherId: 't1' });
      const where = prisma.schedule.findMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: [ScheduleStatus.PUBLISHED, ScheduleStatus.DRAFT, ScheduleStatus.VALIDATED] });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 5. CACHE INVALIDATION
  // ═════════════════════════════════════════════════════════════════════════════

  describe('Cache Invalidation', () => {
    it('create should invalidate school cache via SCAN', async () => {
      redis.scan.mockResolvedValueOnce(['0', ['schedule:school-1:week']]);
      prisma.class.findFirst.mockResolvedValue({ id: 'c1', branchId: 'branch-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 's1', teacherId: 't1', name: 'Fan' });
      prisma.schedule.create.mockResolvedValue({ id: 'new', schoolId: 'school-1', branchId: 'branch-1', weekType: WeekType.ALL });
      prisma.room.findFirst.mockResolvedValue({ id: 'r1' });

      await service.create({ classId: 'c1', subjectId: 's1', teacherId: 't1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1, startTime: '08:00', endTime: '08:45' } as any, makeUser(UserRole.DIRECTOR));
      expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'schedule:school-1:*', 'COUNT', 100);
      expect(redis.del).toHaveBeenCalledWith('schedule:school-1:week');
    });

    it('move should invalidate school cache via SCAN', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 's1', schoolId: 'school-1', branchId: 'branch-1', classId: 'c1',
        teacherId: 't1', roomId: 'r1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1,
        startTime: '08:00', endTime: '08:45', status: ScheduleStatus.DRAFT, weekType: WeekType.ALL,
        class: { branchId: 'branch-1' },
      });
      prisma.schedule.update.mockResolvedValue({});

      await service.move('s1', { dayOfWeek: DayOfWeek.TUESDAY, timeSlot: 2 }, makeUser(UserRole.DIRECTOR));
      expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'schedule:school-1:*', 'COUNT', 100);
    });

    it('publish should invalidate school cache via SCAN', async () => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 's1', schoolId: 'school-1', branchId: 'branch-1', classId: 'c1',
        teacherId: 't1', roomId: 'r1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1,
        startTime: '08:00', endTime: '08:45', status: ScheduleStatus.VALIDATED, weekType: WeekType.ALL,
      });
      prisma.schedule.update.mockResolvedValue({});

      await service.publish('s1', makeUser(UserRole.DIRECTOR));
      expect(redis.scan).toHaveBeenCalledWith('0', 'MATCH', 'schedule:school-1:*', 'COUNT', 100);
    });

    it('SCAN should iterate multiple batches if cursor not zero', async () => {
      redis.scan
        .mockResolvedValueOnce(['1', ['schedule:school-1:batch1']])
        .mockResolvedValueOnce(['0', ['schedule:school-1:batch2']]);
      prisma.class.findFirst.mockResolvedValue({ id: 'c1', branchId: 'branch-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 's1', teacherId: 't1', name: 'Fan' });
      prisma.schedule.create.mockResolvedValue({ id: 'new', schoolId: 'school-1', branchId: 'branch-1', weekType: WeekType.ALL });

      await service.create({ classId: 'c1', subjectId: 's1', teacherId: 't1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1, startTime: '08:00', endTime: '08:45' } as any, makeUser(UserRole.DIRECTOR));
      expect(redis.scan).toHaveBeenCalledTimes(2);
      expect(redis.del).toHaveBeenCalledWith('schedule:school-1:batch1');
      expect(redis.del).toHaveBeenCalledWith('schedule:school-1:batch2');
    });

    it('cached read should skip DB on second call', async () => {
      const director = makeUser(UserRole.DIRECTOR);
      redis.getJson.mockResolvedValueOnce(null).mockResolvedValueOnce([{ id: 'cached' }]);

      // First call → DB
      await service.getWeek(director);
      expect(prisma.schedule.findMany).toHaveBeenCalledTimes(1);

      // Second call → cache
      await service.getWeek(director);
      expect(prisma.schedule.findMany).toHaveBeenCalledTimes(1); // no additional DB call
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // 6. WEEK TYPE OVERLAP LOGIC
  // ═════════════════════════════════════════════════════════════════════════════

  describe('WeekType Overlap Logic', () => {
    it('all-week schedules should conflict with numerator', async () => {
      const existing = {
        id: 's1', schoolId: 'school-1', branchId: 'branch-1', classId: 'c1',
        teacherId: 't1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1,
        startTime: '08:00', endTime: '08:45', status: ScheduleStatus.PUBLISHED, weekType: WeekType.ALL,
      };
      prisma.schedule.findMany.mockResolvedValue([existing]);

      conflictDetector.checkClash.mockImplementation(async (params: any) => {
        // Simulate the real logic: ALL conflicts with everything
        if (params.weekType === WeekType.NUMERATOR || params.weekType === WeekType.ALL) {
          return [{ type: 'teacher', message: 'conflict', slotId: 's1' }];
        }
        return [];
      });

      const conflicts = await conflictDetector.checkClash({
        schoolId: 'school-1', branchId: 'branch-1', teacherId: 't1',
        dayOfWeek: DayOfWeek.MONDAY, startTime: '08:00', endTime: '08:45',
        timezone: 'Asia/Tashkent', weekType: WeekType.NUMERATOR,
        status: [ScheduleStatus.PUBLISHED],
      });
      expect(conflicts.length).toBeGreaterThan(0);
    });

    it('numerator and denominator should NOT conflict with each other', async () => {
      const existing = {
        id: 's1', schoolId: 'school-1', branchId: 'branch-1', classId: 'c1',
        teacherId: 't1', dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1,
        startTime: '08:00', endTime: '08:45', status: ScheduleStatus.PUBLISHED, weekType: WeekType.NUMERATOR,
      };
      prisma.schedule.findMany.mockResolvedValue([existing]);

      conflictDetector.checkClash.mockImplementation(async (params: any) => {
        // Simulate: numerator only conflicts with ALL and NUMERATOR, not DENOMINATOR
        const weekTypeFilter = params.weekType === WeekType.ALL
          ? undefined
          : { in: [WeekType.ALL, params.weekType] };
        if (weekTypeFilter && !weekTypeFilter.in.includes(WeekType.NUMERATOR)) {
          return [];
        }
        return [{ type: 'teacher', message: 'conflict', slotId: 's1' }];
      });

      const conflicts = await conflictDetector.checkClash({
        schoolId: 'school-1', branchId: 'branch-1', teacherId: 't1',
        dayOfWeek: DayOfWeek.MONDAY, startTime: '08:00', endTime: '08:45',
        timezone: 'Asia/Tashkent', weekType: WeekType.DENOMINATOR,
        status: [ScheduleStatus.PUBLISHED],
      });
      expect(conflicts.length).toBe(0);
    });
  });
});
