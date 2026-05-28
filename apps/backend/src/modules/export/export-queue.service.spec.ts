import { Test, TestingModule } from '@nestjs/testing';
import { ExportQueueService } from './export-queue.service';
import { ExportService } from './export.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EXPORT_QUEUE } from '@/common/queue/queue.constants';
import { ExportJobStatus } from '@prisma/client';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockUser: JwtPayload = {
  sub: 'user-1', email: 'test@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockExportService = {
  processJob: jest.fn(),
};

describe('ExportQueueService — Redis-down fallback & resilience', () => {
  let service: ExportQueueService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      exportJob: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportQueueService,
        { provide: PrismaService, useValue: prisma },
        { provide: ExportService, useValue: mockExportService },
        { provide: EXPORT_QUEUE, useValue: null }, // Redis unavailable
      ],
    }).compile();

    service = module.get<ExportQueueService>(ExportQueueService);
    jest.clearAllMocks();
  });

  it('should fall back to sync processing when Redis is down', async () => {
    prisma.exportJob.findUnique.mockResolvedValue({
      id: 'job-1', status: ExportJobStatus.queued, entity: 'schedules', format: 'csv',
    });
    mockExportService.processJob.mockResolvedValue(undefined);

    await service.addExportJob('job-1', mockUser, {});

    expect(prisma.exportJob.findUnique).toHaveBeenCalledWith({ where: { id: 'job-1' } });
    expect(mockExportService.processJob).toHaveBeenCalled();
  });

  it('should mark job failed when sync fallback throws', async () => {
    prisma.exportJob.findUnique.mockResolvedValue({
      id: 'job-1', status: ExportJobStatus.queued,
    });
    mockExportService.processJob.mockRejectedValue(new Error('Disk full'));

    await service.addExportJob('job-1', mockUser, {});

    expect(prisma.exportJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: ExportJobStatus.failed, error: 'Disk full' },
    });
  });

  it('should silently skip when job record missing during fallback', async () => {
    prisma.exportJob.findUnique.mockResolvedValue(null);

    await service.addExportJob('missing-job', mockUser, {});

    expect(mockExportService.processJob).not.toHaveBeenCalled();
    expect(prisma.exportJob.update).not.toHaveBeenCalled();
  });
});
