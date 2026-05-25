import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DisplayService } from './display.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { WeekType } from '@eduplatform/types';

jest.mock('@/common/utils/week-type.util', () => ({
  getCurrentWeekType: jest.fn().mockReturnValue('numerator'),
}));

describe('DisplayService', () => {
  let service: DisplayService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      school: {
        findUnique: jest.fn(),
      },
      schedule: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisplayService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DisplayService>(DisplayService);
    jest.clearAllMocks();
  });

  describe('getTodaySchedule', () => {
    beforeEach(() => {
      prisma.school.findUnique.mockResolvedValue({
        id: 'school-1', name: 'Test School', slug: 'test', phone: '+998',
      });
    });

    it('should throw NotFoundException when school not found', async () => {
      prisma.school.findUnique.mockResolvedValue(null);
      await expect(service.getTodaySchedule('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should filter schedules by current weekType (numerator)', async () => {
      await service.getTodaySchedule('test');
      const where = prisma.schedule.findMany.mock.calls[0][0].where;
      expect(where.weekType).toEqual({ in: ['all', 'numerator'] });
      expect(where.status).toBe('published');
    });
  });
});
