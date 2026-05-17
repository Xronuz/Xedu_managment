import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigService } from './system-config.service';
import { PrismaService } from '@/common/prisma/prisma.service';

const mockPrisma = {
  systemConfig: {
    findMany: jest.fn(),
    upsert: jest.fn(),
  },
};

describe('SystemConfigService', () => {
  let service: SystemConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
  });

  describe('getAll()', () => {
    it('returns default values when no config exists', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([]);

      const result = await service.getAll('school-1');

      expect(result.bhm).toBe(1155000);
      expect(result.academic_year).toBe('2025-2026');
      expect(result.school_name).toBe('');
    });

    it('returns stored config values', async () => {
      mockPrisma.systemConfig.findMany.mockResolvedValue([
        { key: 'bhm', value: 50000 },
        { key: 'academic_year', value: '2024-2025' },
      ]);

      const result = await service.getAll('school-1');

      expect(result.bhm).toBe(50000);
      expect(result.academic_year).toBe('2024-2025');
    });
  });
});
