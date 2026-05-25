import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { TeachingLoadService } from './teaching-load.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { JwtPayload, UserRole, TeachingLoadStatus, Semester, GroupType } from '@eduplatform/types';

const mockDirector: JwtPayload = {
  sub: 'user-director', email: 'd@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockBranchAdmin: JwtPayload = {
  sub: 'user-ba', email: 'ba@test.com', role: UserRole.BRANCH_ADMIN,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockTeacher: JwtPayload = {
  sub: 'user-teacher', email: 't@test.com', role: UserRole.TEACHER,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockStudent: JwtPayload = {
  sub: 'user-student', email: 's@test.com', role: UserRole.STUDENT,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

describe('TeachingLoadService', () => {
  let service: TeachingLoadService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      teachingLoad: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        findFirst: jest.fn(),
      },
      subject: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachingLoadService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();

    service = module.get<TeachingLoadService>(TeachingLoadService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return teaching loads for director', async () => {
      prisma.teachingLoad.findMany.mockResolvedValue([{ id: 'tl-1' }]);
      const result = await service.findAll(mockDirector, {});
      expect(result).toHaveLength(1);
    });

    it('should reject student access', async () => {
      await expect(service.findAll(mockStudent, {})).rejects.toThrow(ForbiddenException);
    });

    it('should allow teacher to view own loads only', async () => {
      prisma.teachingLoad.findMany.mockResolvedValue([]);
      await expect(service.findAll(mockTeacher, { teacherId: 'other-teacher' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow teacher to view own loads', async () => {
      prisma.teachingLoad.findMany.mockResolvedValue([{ id: 'tl-1' }]);
      const result = await service.findAll(mockTeacher, { teacherId: mockTeacher.sub });
      expect(result).toHaveLength(1);
    });
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.user.findFirst.mockResolvedValue({ id: 'teacher-1', branchId: 'branch-1' });
      prisma.subject.findFirst.mockResolvedValue({ id: 'subj-1', branchId: 'branch-1', classId: 'class-1', teacherId: 'teacher-1' });
      prisma.class.findFirst.mockResolvedValue({ id: 'class-1', branchId: 'branch-1' });
      prisma.teachingLoad.findFirst.mockResolvedValue(null);
      prisma.teachingLoad.create.mockResolvedValue({
        id: 'tl-new', schoolId: 'school-1', branchId: 'branch-1',
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        hoursPerWeek: 4, status: TeachingLoadStatus.DRAFT,
      });
    });

    it('should create a teaching load', async () => {
      const result = await service.create({
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1',
        hoursPerWeek: 4,
      }, mockDirector);
      expect(result.id).toBe('tl-new');
      expect(prisma.teachingLoad.create).toHaveBeenCalled();
    });

    it('should reject Branch Admin creating for another branch', async () => {
      prisma.subject.findFirst.mockResolvedValue({ id: 'subj-1', branchId: 'branch-2', classId: 'class-1', teacherId: 'teacher-1' });
      await expect(service.create({
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1', hoursPerWeek: 4,
      }, mockBranchAdmin)).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate active load', async () => {
      prisma.teachingLoad.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.create({
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1', hoursPerWeek: 4,
      }, mockDirector)).rejects.toThrow(ConflictException);
    });

    it('should reject teacher creating load', async () => {
      await expect(service.create({
        teacherId: 'teacher-1', subjectId: 'subj-1', classId: 'class-1', hoursPerWeek: 4,
      }, mockTeacher)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.teachingLoad.findFirst.mockResolvedValue({
        id: 'tl-1', schoolId: 'school-1', branchId: 'branch-1',
        status: TeachingLoadStatus.DRAFT, hoursPerWeek: 4,
      });
      prisma.teachingLoad.update.mockResolvedValue({
        id: 'tl-1', status: TeachingLoadStatus.APPROVED, hoursPerWeek: 4,
      });
    });

    it('should update hours and sync Subject', async () => {
      prisma.subject.findMany.mockResolvedValue([{ id: 'subj-1' }]);
      const result = await service.update('tl-1', { hoursPerWeek: 6 }, mockDirector);
      expect(result.id).toBe('tl-1');
    });

    it('should reject updating archived load', async () => {
      prisma.teachingLoad.findFirst.mockResolvedValue({
        id: 'tl-1', schoolId: 'school-1', branchId: 'branch-1', status: TeachingLoadStatus.ARCHIVED,
      });
      await expect(service.update('tl-1', { hoursPerWeek: 6 }, mockDirector))
        .rejects.toThrow(ConflictException);
    });

    it('should reject invalid status transition', async () => {
      await expect(service.update('tl-1', { status: TeachingLoadStatus.DRAFT }, mockDirector))
        .rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should archive a teaching load', async () => {
      prisma.teachingLoad.findFirst.mockResolvedValue({
        id: 'tl-1', schoolId: 'school-1', branchId: 'branch-1', status: TeachingLoadStatus.DRAFT,
      });
      prisma.teachingLoad.update.mockResolvedValue({ id: 'tl-1', status: TeachingLoadStatus.ARCHIVED });

      const result = await service.remove('tl-1', mockDirector);
      expect(result.message).toContain('arxivlandi');
    });
  });
});
