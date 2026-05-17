import { Test, TestingModule } from '@nestjs/testing';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { AuthService } from '@/modules/auth/auth.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@eduplatform/types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockSuperAdminService = {
  getSchools: jest.fn(),
  getSchool: jest.fn(),
  createSchool: jest.fn(),
  updateSchool: jest.fn(),
  deleteSchool: jest.fn(),
  getModules: jest.fn(),
  toggleModule: jest.fn(),
  getPlatformStats: jest.fn(),
};

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('SuperAdminController', () => {
  let controller: SuperAdminController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuperAdminController],
      providers: [
        { provide: SuperAdminService, useValue: mockSuperAdminService },
        { provide: PrismaService, useValue: {} },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: AuthService, useValue: { logoutAll: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SuperAdminController>(SuperAdminController);
  });

  // ── deleteSchool ───────────────────────────────────────────────────────────

  describe('deleteSchool', () => {
    const superAdminUser = { sub: 'admin-1', role: UserRole.SUPER_ADMIN };
    const directorUser = { sub: 'dir-1', role: UserRole.DIRECTOR };

    it('allows Super Admin to delete a school', async () => {
      mockSuperAdminService.deleteSchool.mockResolvedValueOnce({
        message: "Maktab muvaffaqiyatli o‘chirildi",
        schoolId: 'school-1',
      });

      const result = await controller.deleteSchool('school-1', superAdminUser);

      expect(mockSuperAdminService.deleteSchool).toHaveBeenCalledWith('school-1', superAdminUser);
      expect(result.schoolId).toBe('school-1');
    });

    it('passes current user to service', async () => {
      mockSuperAdminService.deleteSchool.mockResolvedValueOnce({ message: 'ok', schoolId: 'school-2' });

      await controller.deleteSchool('school-2', superAdminUser);

      expect(mockSuperAdminService.deleteSchool).toHaveBeenCalledWith('school-2', superAdminUser);
    });

    it('returns proper response structure on success', async () => {
      mockSuperAdminService.deleteSchool.mockResolvedValueOnce({
        message: "Maktab muvaffaqiyatli o‘chirildi. Barcha foydalanuvchilar bloklandi.",
        schoolId: 'school-3',
      });

      const result = await controller.deleteSchool('school-3', superAdminUser);

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('schoolId');
    });
  });
});
