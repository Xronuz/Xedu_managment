import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ExportQueueService } from './export-queue.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { ExportEntity, ExportFormat, ExportJobStatus } from '@prisma/client';
import { JwtPayload, UserRole } from '@eduplatform/types';

const mockGuard: CanActivate = { canActivate: jest.fn(() => true) };

const mockDirector: JwtPayload = {
  sub: 'user-1', email: 'director@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockTeacher: JwtPayload = {
  sub: 'user-2', email: 'teacher@test.com', role: UserRole.TEACHER,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockBranchAdmin: JwtPayload = {
  sub: 'user-3', email: 'branch@test.com', role: UserRole.BRANCH_ADMIN,
  schoolId: 'school-1', branchId: 'branch-a', isSuperAdmin: false,
};

const mockPrisma = {
  exportJob: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  schedule: { findMany: jest.fn(), count: jest.fn() },
  teachingLoad: { findMany: jest.fn() },
  monthlyPayroll: { findMany: jest.fn() },
  user: { findMany: jest.fn(), count: jest.fn() },
  payment: { aggregate: jest.fn() },
  class: { count: jest.fn() },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

const mockAuditService = { log: jest.fn() };
const mockExportQueueService = { addExportJob: jest.fn() };

describe('ExportController', () => {
  let controller: ExportController;
  let exportService: ExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        ExportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: ExportQueueService, useValue: mockExportQueueService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ExportController>(ExportController);
    exportService = module.get<ExportService>(ExportService);
    jest.clearAllMocks();
  });

  describe('POST /exports', () => {
    it('should create and queue an export job', async () => {
      const job = {
        id: 'job-1',
        entity: ExportEntity.schedules,
        format: ExportFormat.csv,
        status: ExportJobStatus.queued,
        progress: 0,
        fileUrl: null,
        error: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
        createdBy: 'user-1',
      };

      mockPrisma.exportJob.create.mockResolvedValue(job);
      mockPrisma.exportJob.findUniqueOrThrow.mockResolvedValue(job);
      mockPrisma.exportJob.update.mockResolvedValue(job);

      const result = await controller.create(mockDirector, {
        entity: ExportEntity.schedules,
        format: ExportFormat.csv,
      });

      expect(result.entity).toBe(ExportEntity.schedules);
      expect(result.format).toBe(ExportFormat.csv);
      expect(result.status).toBe(ExportJobStatus.queued);
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(mockExportQueueService.addExportJob).toHaveBeenCalled();
    });
  });

  describe('GET /exports', () => {
    it('should return export jobs for the school', async () => {
      const jobs = [
        {
          id: 'job-1',
          entity: ExportEntity.users,
          format: ExportFormat.xlsx,
          status: ExportJobStatus.completed,
          progress: 100,
          fileUrl: null,
          error: null,
          createdAt: new Date(),
          startedAt: null,
          completedAt: null,
          createdBy: 'user-1',
        },
      ];

      mockPrisma.exportJob.findMany.mockResolvedValue(jobs);
      mockPrisma.exportJob.count.mockResolvedValue(1);

      const result = await controller.list(mockDirector);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('RBAC', () => {
    it('should reject payroll export for teacher', () => {
      expect(() => exportService.assertCanExport(mockTeacher, ExportEntity.payroll)).toThrow(ForbiddenException);
    });

    it('should allow schedule export for teacher', () => {
      expect(() => exportService.assertCanExport(mockTeacher, ExportEntity.schedules)).not.toThrow();
    });

    it('should enforce branch scope for branch_admin', () => {
      expect(() => exportService.applyBranchScope(mockBranchAdmin, 'branch-b')).toThrow(ForbiddenException);
    });
  });
});
