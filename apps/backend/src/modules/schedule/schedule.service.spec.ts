import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { ConflictDetectorService } from '@/common/utils/conflict-detector';
import { PeriodsService } from '@/modules/periods/periods.service';
import { AuditService } from '@/common/audit/audit.service';
import { JwtPayload, UserRole, DayOfWeek, ScheduleStatus } from '@eduplatform/types';

const mockDirector: JwtPayload = {
  sub: 'user-1',
  email: 'director@test.com',
  role: UserRole.DIRECTOR,
  schoolId: 'school-1',
  branchId: null,
  isSuperAdmin: false,
};

const mockBranchAdmin: JwtPayload = {
  sub: 'user-2',
  email: 'branch@test.com',
  role: UserRole.BRANCH_ADMIN,
  schoolId: 'school-1',
  branchId: 'branch-1',
  isSuperAdmin: false,
};

const mockVP: JwtPayload = {
  sub: 'user-3',
  email: 'vp@test.com',
  role: UserRole.VICE_PRINCIPAL,
  schoolId: 'school-1',
  branchId: null,
  isSuperAdmin: false,
};

const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  getJson: jest.fn().mockResolvedValue(null),
  setJson: jest.fn().mockResolvedValue(undefined),
  keys: jest.fn().mockResolvedValue([]),
  del: jest.fn().mockResolvedValue(undefined),
};

const mockConflictDetector = {
  checkClash: jest.fn().mockResolvedValue([]),
  assertNoClash: jest.fn().mockResolvedValue(undefined),
};

const mockPeriodsService = {
  resolvePeriod: jest.fn().mockResolvedValue({ startTime: '08:00', endTime: '08:45' }),
};

const mockAuditService = {
  log: jest.fn().mockResolvedValue(undefined),
};

describe('ScheduleService', () => {
  let service: ScheduleService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      schedule: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
      },
      subject: {
        findFirst: jest.fn(),
      },
      school: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: ConflictDetectorService, useValue: mockConflictDetector },
        { provide: PeriodsService, useValue: mockPeriodsService },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
    jest.clearAllMocks();
    mockRedis.get.mockResolvedValue(null);
    mockRedis.getJson.mockResolvedValue(null);
    mockRedis.keys.mockResolvedValue([]);
    mockConflictDetector.checkClash.mockResolvedValue([]);
    mockConflictDetector.assertNoClash.mockResolvedValue(undefined);
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const baseCreateDto = {
    classId: 'class-1',
    subjectId: 'subject-1',
    teacherId: 'teacher-1',
    dayOfWeek: DayOfWeek.MONDAY,
    timeSlot: 1,
    startTime: '08:00',
    endTime: '08:45',
  };

  // ═════════════════════════════════════════════════════════════════════════════
  // checkConflict
  // ═════════════════════════════════════════════════════════════════════════════

  describe('checkConflict', () => {
    it('should delegate to ConflictDetectorService and return no conflicts', async () => {
      mockConflictDetector.checkClash.mockResolvedValue([]);

      const result = await service.checkConflict(mockDirector, {
        dayOfWeek: DayOfWeek.MONDAY,
        timeSlot: 1,
        teacherId: 'teacher-1',
        classId: 'class-1',
        branchId: 'branch-1',
      });

      expect(result.hasConflict).toBe(false);
      expect(result.conflicts).toHaveLength(0);
      expect(mockConflictDetector.checkClash).toHaveBeenCalled();
    });

    it('should return conflicts when detector finds them', async () => {
      mockConflictDetector.checkClash.mockResolvedValue([
        { type: 'teacher', message: 'Teacher busy', slotId: 's1' },
      ]);

      const result = await service.checkConflict(mockDirector, {
        dayOfWeek: DayOfWeek.MONDAY,
        timeSlot: 1,
        teacherId: 'teacher-1',
        branchId: 'branch-1',
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflicts[0].type).toBe('teacher');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // getToday
  // ═════════════════════════════════════════════════════════════════════════════

  describe('getToday', () => {
    it('should return cached data when available', async () => {
      const cached = [{ id: 'slot-1' }];
      mockRedis.getJson.mockResolvedValue(cached);

      const result = await service.getToday(mockDirector);

      expect(result).toEqual(cached);
      expect(prisma.schedule.findMany).not.toHaveBeenCalled();
    });

    it('should query DB and cache when no cache', async () => {
      prisma.schedule.findMany.mockResolvedValue([
        { id: 'slot-1', dayOfWeek: DayOfWeek.MONDAY },
      ]);

      const result = await service.getToday(mockDirector);

      expect(result).toHaveLength(1);
      expect(prisma.schedule.findMany).toHaveBeenCalled();
      expect(mockRedis.setJson).toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // getWeek
  // ═════════════════════════════════════════════════════════════════════════════

  describe('getWeek', () => {
    it('should return cached week data', async () => {
      const cached = [{ id: 'slot-1' }];
      mockRedis.getJson.mockResolvedValue(cached);

      const result = await service.getWeek(mockDirector);

      expect(result).toEqual(cached);
      expect(prisma.schedule.findMany).not.toHaveBeenCalled();
    });

    it('should add isCrossBranch flag for branch-scoped users', async () => {
      prisma.schedule.findMany.mockResolvedValue([
        { id: 'slot-1', branchId: 'branch-1' },
        { id: 'slot-2', branchId: 'branch-2' },
      ]);

      const result = await service.getWeek(mockBranchAdmin);

      expect(result[0].isCrossBranch).toBe(false);
      expect(result[1].isCrossBranch).toBe(true);
    });

    it('should not mark cross-branch for school-wide viewers', async () => {
      prisma.schedule.findMany.mockResolvedValue([
        { id: 'slot-1', branchId: 'branch-1' },
      ]);

      const result = await service.getWeek(mockDirector);

      expect(result[0].isCrossBranch).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // findByClass
  // ═════════════════════════════════════════════════════════════════════════════

  describe('findByClass', () => {
    it('should return schedule for a specific class', async () => {
      prisma.schedule.findMany.mockResolvedValue([
        { id: 'slot-1', classId: 'class-1' },
      ]);

      const result = await service.findByClass('class-1', mockDirector);

      expect(result).toHaveLength(1);
      expect(prisma.schedule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ classId: 'class-1', schoolId: 'school-1' }) }),
      );
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // create
  // ═════════════════════════════════════════════════════════════════════════════

  describe('create', () => {
    beforeEach(() => {
      prisma.class.findFirst.mockResolvedValue({ branchId: 'branch-1' });
      prisma.subject.findFirst.mockResolvedValue({ teacherId: 'teacher-1', name: 'Matematika' });
      prisma.schedule.create.mockResolvedValue({
        id: 'new-slot',
        schoolId: 'school-1',
        branchId: 'branch-1',
        ...baseCreateDto,
      });
      prisma.school.findUnique.mockResolvedValue({ timezone: 'Asia/Tashkent' });
    });

    it('should create a schedule slot successfully', async () => {
      const result = await service.create(baseCreateDto, mockDirector);

      expect(result.id).toBe('new-slot');
      expect(prisma.schedule.create).toHaveBeenCalled();
      expect(mockRedis.keys).toHaveBeenCalled();
    });

    it('should throw NotFoundException when class not found', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(service.create(baseCreateDto, mockDirector))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when subject not found', async () => {
      prisma.subject.findFirst.mockResolvedValue(null);

      await expect(service.create(baseCreateDto, mockDirector))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when teacher does not match subject', async () => {
      prisma.subject.findFirst.mockResolvedValue({ teacherId: 'other-teacher', name: 'Fizika' });

      await expect(service.create(baseCreateDto, mockDirector))
        .rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when conflict detector finds clash', async () => {
      mockConflictDetector.assertNoClash.mockRejectedValue(
        new ConflictException('Teacher busy'),
      );

      await expect(service.create(baseCreateDto, mockDirector))
        .rejects.toThrow(ConflictException);
    });

    // ── REGRESSION: Director branchId ─────────────────────────────────────────
    it('should save branchId from class, not from currentUser.branchId (Director)', async () => {
      const created = { id: 'slot-1', branchId: 'branch-from-class' };
      prisma.class.findFirst.mockResolvedValue({ branchId: 'branch-from-class' });
      prisma.subject.findFirst.mockResolvedValue({ teacherId: 'teacher-1', name: 'Matematika' });
      prisma.schedule.create.mockResolvedValue(created);

      await service.create(baseCreateDto, mockDirector);

      const createCall = prisma.schedule.create.mock.calls[0][0];
      expect(createCall.data.branchId).toBe('branch-from-class');
      expect(mockConflictDetector.assertNoClash).toHaveBeenCalledWith(
        expect.objectContaining({ branchId: 'branch-from-class' }),
      );
    });

    // ── REGRESSION: Branch Admin cross-branch guard ───────────────────────────
    it('should allow Branch Admin to create for their own branch', async () => {
      prisma.class.findFirst.mockResolvedValue({ branchId: 'branch-1' });

      const result = await service.create(baseCreateDto, mockBranchAdmin);

      expect(result.id).toBe('new-slot');
    });

    it('should reject Branch Admin creating schedule for another branch', async () => {
      prisma.class.findFirst.mockResolvedValue({ branchId: 'branch-2' });

      await expect(service.create(baseCreateDto, mockBranchAdmin))
        .rejects.toThrow(ForbiddenException);
      expect(prisma.schedule.create).not.toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // update
  // ═════════════════════════════════════════════════════════════════════════════

  describe('update', () => {
    beforeEach(() => {
      prisma.schedule.findFirst.mockResolvedValue({
        id: 'slot-1',
        subjectId: 'subject-1',
        teacherId: 'teacher-1',
        classId: 'class-1',
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '08:00',
        endTime: '08:45',
        roomId: null,
        class: { branchId: 'branch-1' },
      });
      prisma.subject.findFirst.mockResolvedValue({ teacherId: 'teacher-1', name: 'Matematika' });
      prisma.schedule.update.mockResolvedValue({ id: 'slot-1', dayOfWeek: DayOfWeek.TUESDAY });
      prisma.school.findUnique.mockResolvedValue({ timezone: 'Asia/Tashkent' });
    });

    it('should update a schedule slot', async () => {
      const result = await service.update('slot-1', { dayOfWeek: DayOfWeek.TUESDAY }, mockDirector);

      expect(result.id).toBe('slot-1');
      expect(prisma.schedule.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when slot not found', async () => {
      prisma.schedule.findFirst.mockResolvedValue(null);

      await expect(service.update('slot-1', {}, mockDirector))
        .rejects.toThrow(NotFoundException);
    });

    it('should validate teacher-subject match on update', async () => {
      prisma.subject.findFirst.mockResolvedValue({ teacherId: 'other-teacher', name: 'Fizika' });

      await expect(service.update('slot-1', { teacherId: 'teacher-1', subjectId: 'subject-1' }, mockDirector))
        .rejects.toThrow(ConflictException);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // remove
  // ═════════════════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should throw NotFoundException when slot not found', async () => {
      prisma.schedule.findFirst.mockResolvedValue(null);

      await expect(service.remove('non-existent', mockDirector))
        .rejects.toThrow(NotFoundException);
    });

    it('should delete and invalidate cache', async () => {
      prisma.schedule.findFirst.mockResolvedValue({ id: 'slot-1' });
      prisma.schedule.delete.mockResolvedValue({ id: 'slot-1' });
      mockRedis.keys.mockResolvedValue(['schedule:school-1:week:all']);

      const result = await service.remove('slot-1', mockDirector);

      expect(prisma.schedule.delete).toHaveBeenCalledWith({ where: { id: 'slot-1' } });
      expect(mockRedis.del).toHaveBeenCalledWith('schedule:school-1:week:all');
      expect(result.message).toContain('chirildi');
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // getTeacherCrossBranch
  // ═════════════════════════════════════════════════════════════════════════════

  describe('getTeacherCrossBranch', () => {
    it('should return teacher schedules with isCrossBranch flag', async () => {
      prisma.schedule.findMany.mockResolvedValue([
        { id: 'slot-1', branchId: 'branch-1' },
        { id: 'slot-2', branchId: 'branch-2' },
      ]);

      const result = await service.getTeacherCrossBranch('teacher-1', mockBranchAdmin, 'branch-1');

      expect(result).toHaveLength(2);
      expect(result[0].isCrossBranch).toBe(false);
      expect(result[1].isCrossBranch).toBe(true);
    });
  });
});
