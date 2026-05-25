import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ParentService, RequestChildLeaveDto } from './parent.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { JwtPayload, UserRole, WeekType } from '@eduplatform/types';

jest.mock('@/common/utils/week-type.util', () => ({
  getCurrentWeekType: jest.fn().mockReturnValue('denominator'),
}));

const mockParent: JwtPayload = {
  sub: 'parent-1',
  email: 'parent@test.com',
  role: UserRole.PARENT,
  schoolId: 'school-1',
  branchId: 'branch-1',
  isSuperAdmin: false,
};

describe('ParentService', () => {
  let service: ParentService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      parentStudent: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      classStudent: {
        findFirst: jest.fn(),
      },
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      attendance: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      grade: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      payment: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      leaveRequest: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: {
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      coinTransaction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParentService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ParentService>(ParentService);
    jest.clearAllMocks();
  });

  describe('getChildSchedule', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({ id: 'student-1', schoolId: 'school-1', role: 'student' });
      prisma.parentStudent.findFirst.mockResolvedValue({ parentId: 'parent-1', studentId: 'student-1' });
      prisma.classStudent.findFirst.mockResolvedValue({ classId: 'class-1' });
    });

    it('should return empty array when no enrollment', async () => {
      prisma.classStudent.findFirst.mockResolvedValue(null);
      const result = await service.getChildSchedule('student-1', mockParent);
      expect(result).toEqual([]);
    });

    it('should filter schedules by current weekType (denominator)', async () => {
      await service.getChildSchedule('student-1', mockParent);
      const where = prisma.schedule.findMany.mock.calls[0][0].where;
      expect(where.weekType).toEqual({ in: ['all', 'denominator'] });
      expect(where.status).toBe('published');
    });
  });
});
