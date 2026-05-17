import { Test, TestingModule } from '@nestjs/testing';
import { CanActivate, ValidationPipe, BadRequestException } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
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
};

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('ClassesController', () => {
  let controller: ClassesController;
  let validationPipe: ValidationPipe;

  const directorUser = {
    sub: 'user-1',
    email: 'dir@test.uz',
    role: UserRole.DIRECTOR,
    schoolId: 'school-1',
    branchId: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassesController],
      providers: [
        { provide: ClassesService, useValue: mockService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true } as CanActivate)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true } as CanActivate)
      .compile();

    controller = module.get<ClassesController>(ClassesController);
    validationPipe = new ValidationPipe({ whitelist: true, transform: true });
  });

  // ── Grade level validation (BUG 1 regression) ───────────────────────────

  describe('create() DTO validation', () => {
    it('rejects gradeLevel > 11 with validation error', async () => {
      const dto = {
        name: '12-A',
        gradeLevel: 12,
        academicYear: '2025-2026',
      };

      await expect(
        validationPipe.transform(dto, { type: 'body', metatype: CreateClassDto }),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts gradeLevel = 11', async () => {
      const dto = {
        name: '11-A',
        gradeLevel: 11,
        academicYear: '2025-2026',
      };

      mockService.create.mockResolvedValue({ id: 'class-1', ...dto });

      const result = await controller.create(dto as any, directorUser as any);

      expect(mockService.create).toHaveBeenCalled();
      expect(result.name).toBe('11-A');
    });

    it('rejects gradeLevel = 0', async () => {
      const dto = {
        name: '0-A',
        gradeLevel: 0,
        academicYear: '2025-2026',
      };

      await expect(
        validationPipe.transform(dto, { type: 'body', metatype: CreateClassDto }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
