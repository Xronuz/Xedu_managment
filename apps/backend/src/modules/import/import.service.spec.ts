import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ImportService } from './import.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { UsersService } from '@/modules/users/users.service';
import { ClassesService } from '@/modules/classes/classes.service';
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
  assertNoClash: jest.fn().mockResolvedValue(undefined),
};

describe('ImportService — Schedule', () => {
  let service: ImportService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      class: { findMany: jest.fn(), findUnique: jest.fn() },
      subject: { findMany: jest.fn(), findFirst: jest.fn() },
      period: { findMany: jest.fn(), findFirst: jest.fn() },
      room: { findMany: jest.fn(), findFirst: jest.fn() },
      schedule: { findMany: jest.fn(), create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      school: { findUnique: jest.fn().mockResolvedValue({ timezone: 'Asia/Tashkent' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: {} },
        { provide: ClassesService, useValue: { invalidateCache: jest.fn(() => Promise.resolve()) } },
        { provide: ConflictDetectorService, useValue: mockConflictDetector },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    mockConflictDetector.checkClash.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function makeBuffer(rows: (string | number)[][]): Buffer {
    // Simple mock: ImportService uses ExcelJS which reads real Excel buffers.
    // For unit tests, we can't easily create real Excel buffers without ExcelJS.
    // We'll test commitSchedule directly with parsed row data.
    return Buffer.from('');
  }

  function makeRow(overrides: Partial<Record<string, any>> = {}): any {
    return {
      row: 2,
      data: {
        classId: 'class-1',
        subjectId: 'subject-1',
        teacherId: 'teacher-1',
        dayOfWeek: DayOfWeek.MONDAY,
        timeSlot: 1,
        startTime: '08:00',
        endTime: '08:45',
        roomNumber: undefined,
        roomId: undefined,
        schoolId: 'school-1',
        ...overrides,
      },
      errors: [],
      valid: true,
    };
  }

  // ─── commitSchedule tests ──────────────────────────────────────────────────

  describe('commitSchedule', () => {
    beforeEach(() => {
      prisma.class.findUnique.mockResolvedValue({ id: 'class-1', branchId: 'branch-1', schoolId: 'school-1' });
      prisma.period.findFirst.mockResolvedValue({ id: 'period-1', periodNumber: 1, startTime: '08:00', endTime: '08:45' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subject-1', teacherId: 'teacher-1', name: 'Matematika' });
      prisma.room.findFirst.mockResolvedValue({ id: 'room-1', name: '101', branchId: 'branch-1' });
      prisma.schedule.findFirst.mockResolvedValue(null);
    });

    it('should create schedule with ConflictDetectorService', async () => {
      const result = await service.commitSchedule([makeRow()], mockDirector);
      expect(result.created).toBe(1);
      expect(mockConflictDetector.checkClash).toHaveBeenCalled();
      expect(prisma.schedule.create).toHaveBeenCalled();
      const createCall = prisma.schedule.create.mock.calls[0][0].data;
      expect(createCall.startDayMinUtc).toBeDefined();
      expect(createCall.endDayMinUtc).toBeDefined();
    });

    it('should reject cross-branch room', async () => {
      // Validation query returns null because room is in different branch
      prisma.room.findFirst.mockResolvedValueOnce(null);
      const result = await service.commitSchedule([makeRow({ roomId: 'room-2' })], mockDirector);
      expect(result.created).toBe(0);
      expect(result.errors[0]).toContain('filialga tegishli emas');
    });

    it('should reject missing period config', async () => {
      prisma.period.findFirst.mockResolvedValueOnce(null);
      const result = await service.commitSchedule([makeRow()], mockDirector);
      expect(result.created).toBe(0);
      expect(result.errors[0]).toContain('sozlangan vaqt topilmadi');
    });

    it('should skip when teacher is busy (conflict detector)', async () => {
      mockConflictDetector.checkClash.mockResolvedValueOnce([
        { type: 'teacher', message: "O'qituvchi band", slotId: 's1' },
      ]);
      const result = await service.commitSchedule([makeRow()], mockDirector);
      expect(result.created).toBe(0);
      expect(result.errors[0]).toContain('band');
    });

    it('should skip when class is busy (conflict detector)', async () => {
      mockConflictDetector.checkClash.mockResolvedValueOnce([
        { type: 'class', message: 'Sinf band', slotId: 's1' },
      ]);
      const result = await service.commitSchedule([makeRow()], mockDirector);
      expect(result.created).toBe(0);
      expect(result.errors[0]).toContain('Sinf');
    });

    it('should skip when room is busy (conflict detector)', async () => {
      mockConflictDetector.checkClash.mockResolvedValueOnce([
        { type: 'room', message: 'Xona band', slotId: 's1' },
      ]);
      const result = await service.commitSchedule([makeRow({ roomId: 'room-1' })], mockDirector);
      expect(result.created).toBe(0);
      expect(result.errors[0]).toContain('Xona');
    });

    it('should block existing slot when overwriteExisting is false', async () => {
      prisma.schedule.findFirst.mockResolvedValueOnce({ id: 'existing-1' });
      const result = await service.commitSchedule([makeRow()], mockDirector, null, false);
      expect(result.created).toBe(0);
      expect(result.errors[0]).toContain('allaqachon mavjud');
    });

    it('should overwrite existing slot when overwriteExisting is true', async () => {
      prisma.schedule.findFirst.mockResolvedValueOnce({ id: 'existing-1' });
      const result = await service.commitSchedule([makeRow()], mockDirector, null, true);
      expect(result.created).toBe(1);
      expect(prisma.schedule.delete).toHaveBeenCalledWith({ where: { id: 'existing-1' } });
    });

    it('should allow Branch Admin to import own branch', async () => {
      const result = await service.commitSchedule([makeRow()], mockBranchAdmin, 'branch-1');
      expect(result.created).toBe(1);
    });

    it('should reject Branch Admin importing another branch', async () => {
      await expect(
        service.commitSchedule([makeRow()], mockBranchAdmin, 'branch-2'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should resolve roomId from roomNumber via name lookup', async () => {
      prisma.room.findFirst.mockResolvedValueOnce({ id: 'room-1', name: '101', branchId: 'branch-1' });
      const result = await service.commitSchedule([makeRow({ roomNumber: '101', roomId: undefined })], mockDirector);
      expect(result.created).toBe(1);
      const createData = prisma.schedule.create.mock.calls[0][0].data;
      expect(createData.roomId).toBe('room-1');
    });
  });

  // ─── parseSchedule tests (using real Excel is hard; test logic via commit) ──

  describe('parseSchedule validation logic', () => {
    it('should throw for invalid Excel buffer', async () => {
      await expect(service.parseSchedule(Buffer.from('not-excel'), mockDirector))
        .rejects.toThrow();
    });
  });
});
