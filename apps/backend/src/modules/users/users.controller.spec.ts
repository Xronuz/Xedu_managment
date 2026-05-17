import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UploadService } from '@/modules/upload/upload.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@eduplatform/types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  restore: jest.fn(),
  resetPassword: jest.fn(),
  hardDelete: jest.fn(),
};

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('UsersController', () => {
  let controller: UsersController;

  const superAdmin = {
    sub: 'sa-1',
    email: 'sa@xedu.uz',
    role: UserRole.SUPER_ADMIN,
    schoolId: null,
    branchId: null,
  };

  const director = {
    sub: 'dir-1',
    email: 'dir@school.uz',
    role: UserRole.DIRECTOR,
    schoolId: 'school-1',
    branchId: null,
  };

  const branchAdmin = {
    sub: 'ba-1',
    email: 'ba@school.uz',
    role: UserRole.BRANCH_ADMIN,
    schoolId: 'school-1',
    branchId: 'branch-1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockService },
        { provide: UploadService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true } as CanActivate)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true } as CanActivate)
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  // ── Password reset permissions ───────────────────────────────────────────

  describe('resetPassword()', () => {
    it('Super Admin can reset Director password', async () => {
      mockService.resetPassword.mockResolvedValue({
        temporaryPassword: 'Ab3xK9mPqR2',
        message: "Vaqtinchalik parol yaratildi.",
      });

      const result = await controller.resetPassword('dir-2', superAdmin as any);

      expect(mockService.resetPassword).toHaveBeenCalledWith('dir-2', superAdmin);
      expect(result.temporaryPassword).toBe('Ab3xK9mPqR2');
    });

    it('Super Admin cannot reset Teacher password', async () => {
      mockService.resetPassword.mockRejectedValue(
        new Error('Super Admin faqat Director parolini tiklay oladi'),
      );

      await expect(controller.resetPassword('tch-1', superAdmin as any))
        .rejects.toThrow('Super Admin faqat Director parolini tiklay oladi');
    });

    it('Director can reset staff in own school', async () => {
      mockService.resetPassword.mockResolvedValue({
        temporaryPassword: 'Xy7zW2qL8vN',
        message: "Vaqtinchalik parol yaratildi.",
      });

      const result = await controller.resetPassword('acc-1', director as any);

      expect(mockService.resetPassword).toHaveBeenCalledWith('acc-1', director);
      expect(result.temporaryPassword).toBe('Xy7zW2qL8vN');
    });

    it('Director cannot reset staff from another school', async () => {
      mockService.resetPassword.mockRejectedValue(
        new Error('Boshqa maktab foydalanuvchisiga ruxsat yo‘q'),
      );

      await expect(controller.resetPassword('tch-other', director as any))
        .rejects.toThrow('Boshqa maktab foydalanuvchisiga ruxsat yo‘q');
    });

    it('Director cannot reset another Director', async () => {
      mockService.resetPassword.mockRejectedValue(
        new Error('"director" "director" rolidagi foydalanuvchini boshqara olmaydi'),
      );

      await expect(controller.resetPassword('dir-2', director as any))
        .rejects.toThrow('boshqara olmaydi');
    });

    it('cannot reset self', async () => {
      mockService.resetPassword.mockRejectedValue(
        new Error("O'zingizga nisbatan bu amalni bajara olmaysiz"),
      );

      await expect(controller.resetPassword(director.sub, director as any))
        .rejects.toThrow("O'zingizga nisbatan bu amalni bajara olmaysiz");
    });

    it('Branch Admin can reset own-branch staff', async () => {
      mockService.resetPassword.mockResolvedValue({
        temporaryPassword: 'Bn4yH6jKtQ1',
        message: "Vaqtinchalik parol yaratildi.",
      });

      const result = await controller.resetPassword('tch-1', branchAdmin as any);

      expect(mockService.resetPassword).toHaveBeenCalledWith('tch-1', branchAdmin);
      expect(result.temporaryPassword).toBe('Bn4yH6jKtQ1');
    });

    it('Branch Admin cannot reset other-branch staff', async () => {
      mockService.resetPassword.mockRejectedValue(
        new Error('Boshqa filial foydalanuvchisiga ruxsat yo‘q'),
      );

      await expect(controller.resetPassword('tch-other-branch', branchAdmin as any))
        .rejects.toThrow('Boshqa filial foydalanuvchisiga ruxsat yo‘q');
    });
  });
});
