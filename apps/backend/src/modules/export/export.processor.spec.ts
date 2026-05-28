import { Test, TestingModule } from '@nestjs/testing';
import { ExportProcessor } from './export.processor';
import { ExportService } from './export.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ExportJobStatus } from '@prisma/client';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockUser: JwtPayload = {
  sub: 'user-1', email: 'test@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockExportService = {
  processJob: jest.fn(),
};

describe('ExportProcessor — failure simulation', () => {
  let processor: ExportProcessor;
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
        ExportProcessor,
        { provide: PrismaService, useValue: prisma },
        { provide: ExportService, useValue: mockExportService },
        { provide: ConfigService, useValue: { get: jest.fn((key: string, def: any) => def) } },
      ],
    }).compile();

    processor = module.get<ExportProcessor>(ExportProcessor);
    jest.clearAllMocks();
  });

  // Helper to access private handleJob
  async function handleJob(jobData: any) {
    return (processor as any).handleJob({
      id: 'bull-job-1',
      name: 'process_export',
      data: jobData,
    });
  }

  it('should process a normal job successfully', async () => {
    const job = {
      id: 'job-1', status: ExportJobStatus.queued, entity: 'schedules', format: 'csv',
    };
    prisma.exportJob.findUnique.mockResolvedValue(job);
    mockExportService.processJob.mockResolvedValue(undefined);

    await handleJob({ jobId: 'job-1', user: mockUser, filters: {} });

    expect(mockExportService.processJob).toHaveBeenCalledWith(job, mockUser, {});
    expect(prisma.exportJob.update).not.toHaveBeenCalled();
  });

  it('should skip cancelled job without processing', async () => {
    prisma.exportJob.findUnique.mockResolvedValue({
      id: 'job-1', status: ExportJobStatus.cancelled,
    });

    await handleJob({ jobId: 'job-1', user: mockUser, filters: {} });

    expect(mockExportService.processJob).not.toHaveBeenCalled();
  });

  it('should mark job as failed when processJob throws', async () => {
    prisma.exportJob.findUnique.mockResolvedValue({
      id: 'job-1', status: ExportJobStatus.queued,
    });
    mockExportService.processJob.mockRejectedValue(new Error('DB connection lost'));

    await handleJob({ jobId: 'job-1', user: mockUser, filters: {} });

    expect(prisma.exportJob.update).toHaveBeenCalledWith({
      where: { id: 'job-1' },
      data: { status: ExportJobStatus.failed, error: 'DB connection lost' },
    });
  });

  it('should silently ignore missing job record', async () => {
    prisma.exportJob.findUnique.mockResolvedValue(null);

    await handleJob({ jobId: 'missing-job', user: mockUser, filters: {} });

    expect(mockExportService.processJob).not.toHaveBeenCalled();
    expect(prisma.exportJob.update).not.toHaveBeenCalled();
  });

  it('should ignore unknown job types', async () => {
    await (processor as any).handleJob({
      id: 'bull-job-1',
      name: 'unknown_type',
      data: {},
    });

    expect(prisma.exportJob.findUnique).not.toHaveBeenCalled();
  });

  it('should handle job cancelled DURING processing race condition', async () => {
    prisma.exportJob.findUnique.mockResolvedValue({
      id: 'job-1', status: ExportJobStatus.queued,
    });
    mockExportService.processJob.mockImplementation(async () => {
      prisma.exportJob.findUnique.mockResolvedValue({
        id: 'job-1', status: ExportJobStatus.cancelled,
      });
    });

    await handleJob({ jobId: 'job-1', user: mockUser, filters: {} });

    expect(mockExportService.processJob).toHaveBeenCalled();
  });
});
