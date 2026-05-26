import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScheduleGeneratorService } from './schedule-generator.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { ConflictDetectorService } from '@/common/utils/conflict-detector';
import { JwtPayload, UserRole, DayOfWeek } from '@eduplatform/types';

const mockDirector: JwtPayload = {
  sub: 'user-1', email: 'director@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockBranchAdmin: JwtPayload = {
  sub: 'user-2', email: 'branch@test.com', role: UserRole.BRANCH_ADMIN,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockConflictDetector = {
  checkClash: jest.fn().mockResolvedValue([]),
};

const mockRedisService = {
  scan: jest.fn().mockResolvedValue(['0', []]),
  del: jest.fn().mockResolvedValue(0),
};

describe('ScheduleGeneratorService', () => {
  let service: ScheduleGeneratorService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      subject: { findMany: jest.fn() },
      period: { findMany: jest.fn() },
      room: { findMany: jest.fn() },
      schedule: { findMany: jest.fn(), create: jest.fn(), delete: jest.fn(), findFirst: jest.fn() },
      school: { findUnique: jest.fn().mockResolvedValue({ timezone: 'Asia/Tashkent' }) },
      class: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleGeneratorService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConflictDetectorService, useValue: mockConflictDetector },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<ScheduleGeneratorService>(ScheduleGeneratorService);
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

  // ─── generate ──────────────────────────────────────────────────────────────

  describe('generate', () => {
    it('should create demands from subject hoursPerWeek', async () => {
      setupDefaults();
      const result = await service.generate({ branchId: 'branch-1' }, mockDirector);
      // 2 subjects × 2 hours = 4 demands
      expect(result.totalDemands).toBe(4);
      expect(result.placed).toBe(4);
      expect(result.failed).toBe(0);
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

      const result = await service.generate({ branchId: 'branch-1' }, mockDirector);
      expect(result.totalDemands).toBe(2);
    });

    it('should avoid teacher double booking', async () => {
      setupDefaults();
      // Same teacher for both subjects → only 2 slots available per day × 1 day = limited
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 3 },
        { id: 'subj-2', classId: 'class-2', teacherId: 'teacher-1', name: 'Fizika', hoursPerWeek: 3 },
      ]);

      const result = await service.generate({ branchId: 'branch-1', daysOfWeek: [DayOfWeek.MONDAY] }, mockDirector);
      // Only 2 periods on Monday, teacher can't be in 2 places at once
      expect(result.placed).toBeLessThanOrEqual(2);
      expect(result.failed).toBeGreaterThan(0);
    });

    it('should avoid class double booking', async () => {
      setupDefaults();
      // Same class with 2 subjects, but more hours than slots
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 3 },
        { id: 'subj-2', classId: 'class-1', teacherId: 'teacher-2', name: 'Fizika', hoursPerWeek: 3 },
      ]);

      const result = await service.generate({ branchId: 'branch-1', daysOfWeek: [DayOfWeek.MONDAY] }, mockDirector);
      expect(result.placed).toBeLessThanOrEqual(2);
      expect(result.failed).toBeGreaterThan(0);
    });

    it('should avoid room double booking', async () => {
      setupDefaults();
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 2 },
        { id: 'subj-2', classId: 'class-2', teacherId: 'teacher-2', name: 'Fizika', hoursPerWeek: 2 },
      ]);
      // Force room conflict by mocking conflict detector to return room conflict for 2nd placement
      let callCount = 0;
      mockConflictDetector.checkClash.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve([{ type: 'room', message: 'Xona band', slotId: 's1' }]);
        }
        return Promise.resolve([]);
      });

      const result = await service.generate({ branchId: 'branch-1', daysOfWeek: [DayOfWeek.MONDAY] }, mockDirector);
      expect(result.placed + result.failed).toBe(result.totalDemands);
    });

    it('should return failures when not enough slots', async () => {
      setupDefaults();
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 10 },
      ]);

      const result = await service.generate({ branchId: 'branch-1', daysOfWeek: [DayOfWeek.MONDAY] }, mockDirector);
      expect(result.totalDemands).toBe(10);
      expect(result.placed).toBeLessThanOrEqual(2); // only 2 periods on Monday
      expect(result.failed).toBeGreaterThan(0);
      expect(result.stats.byReason).toBeDefined();
    });

    it('should enforce branch scope for Branch Admin', async () => {
      await expect(
        service.generate({ branchId: 'branch-2' }, mockBranchAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should use Branch Admin own branch when branchId omitted', async () => {
      setupDefaults();
      const result = await service.generate({}, mockBranchAdmin);
      expect(result.totalDemands).toBe(4);
    });

    it('should require branchId for Director when not provided', async () => {
      await expect(service.generate({}, mockDirector)).rejects.toThrow(NotFoundException);
    });

    it('should return empty report when no periods configured', async () => {
      prisma.subject.findMany.mockResolvedValue([
        { id: 'subj-1', classId: 'class-1', teacherId: 'teacher-1', name: 'Matematika', hoursPerWeek: 2 },
      ]);
      prisma.period.findMany.mockResolvedValue([]);
      prisma.room.findMany.mockResolvedValue([]);
      prisma.schedule.findMany.mockResolvedValue([]);

      const result = await service.generate({ branchId: 'branch-1' }, mockDirector);
      expect(result.totalDemands).toBe(0);
      expect(result.placed).toBe(0);
    });
  });

  // ─── commitProposed ────────────────────────────────────────────────────────

  describe('commitProposed', () => {
    it('should save proposed slots', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: 'class-1', branchId: 'branch-1', schoolId: 'school-1' });
      prisma.schedule.findFirst.mockResolvedValue(null);

      const result = await service.commitProposed([
        { id: 'draft-1', classId: 'class-1', subjectId: 'subj-1', teacherId: 'teacher-1',
          dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1, startTime: '08:00', endTime: '08:45' },
      ], mockDirector);

      expect(result.created).toBe(1);
      expect(prisma.schedule.create).toHaveBeenCalled();
    });

    it('should validate branch scope on commit', async () => {
      prisma.class.findUnique.mockResolvedValue({ id: 'class-1', branchId: 'branch-2', schoolId: 'school-1' });

      const result = await service.commitProposed([
        { id: 'draft-1', classId: 'class-1', subjectId: 'subj-1', teacherId: 'teacher-1',
          dayOfWeek: DayOfWeek.MONDAY, timeSlot: 1, startTime: '08:00', endTime: '08:45' },
      ], mockBranchAdmin);

      expect(result.created).toBe(0);
      expect(result.errors[0]).toContain('boshqa filial');
    });
  });
});
