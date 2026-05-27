import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ExamsService, BulkResultsDto } from './exams.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { JwtPayload, UserRole } from '@eduplatform/types';

const SCHOOL_ID = 'school-1';
const BRANCH_ID = 'branch-1';
const CLASS_ID = 'class-1';
const SUBJ_ID = 'subj-1';
const EXAM_ID = 'exam-1';
const STUDENT_ID = 'student-1';
const PARENT_ID = 'parent-1';
const TEACHER_ID = 'teacher-1';

const mockExam = {
  id: EXAM_ID,
  schoolId: SCHOOL_ID,
  branchId: BRANCH_ID,
  classId: CLASS_ID,
  subjectId: SUBJ_ID,
  title: 'Choraklik',
  maxScore: 100,
  scheduledAt: new Date('2026-05-20T10:00:00.000Z'),
  isPublished: true,
};

const mockStudent: JwtPayload = {
  sub: STUDENT_ID,
  email: 'student@test.com',
  role: UserRole.STUDENT,
  schoolId: SCHOOL_ID,
  branchId: BRANCH_ID,
  isSuperAdmin: false,
};

const mockParent: JwtPayload = {
  sub: PARENT_ID,
  email: 'parent@test.com',
  role: UserRole.PARENT,
  schoolId: SCHOOL_ID,
  branchId: BRANCH_ID,
  isSuperAdmin: false,
};

const mockTeacher: JwtPayload = {
  sub: TEACHER_ID,
  email: 'teacher@test.com',
  role: UserRole.TEACHER,
  schoolId: SCHOOL_ID,
  branchId: BRANCH_ID,
  isSuperAdmin: false,
};

const mockDirector: JwtPayload = {
  sub: 'director-1',
  email: 'director@test.com',
  role: UserRole.DIRECTOR,
  schoolId: SCHOOL_ID,
  branchId: null,
  isSuperAdmin: false,
};

describe('ExamsService', () => {
  let service: ExamsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      exam: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      grade: {
        findMany: jest.fn().mockResolvedValue([]),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
      class: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      subject: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      classStudent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      parentStudent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      notification: {
        create: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
      },
      school: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops.map((op: any) => op))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: EventsGateway, useValue: { emitToUser: jest.fn(), emitToSchool: jest.fn() } },
      ],
    }).compile();

    service = module.get<ExamsService>(ExamsService);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET RESULTS — Privacy Isolation
  // ────────────────────────────────────────────────────────────────────────────

  describe('getResults', () => {
    const mockGrades = [
      { id: 'g1', studentId: STUDENT_ID, score: 85, maxScore: 100, student: { id: STUDENT_ID, firstName: 'Ali', lastName: 'Valiyev' } },
      { id: 'g2', studentId: 'st-2', score: 92, maxScore: 100, student: { id: 'st-2', firstName: 'Bek', lastName: 'Karimov' } },
    ];

    beforeEach(() => {
      prisma.exam.findFirst.mockResolvedValue(mockExam);
    });

    it('STUDENT: should only see own grade', async () => {
      prisma.grade.findMany.mockResolvedValue([mockGrades[0]]);

      const result = await service.getResults(EXAM_ID, mockStudent);

      expect(prisma.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ studentId: STUDENT_ID }),
        }),
      );
      expect(result.grades).toHaveLength(1);
      expect(result.grades[0].studentId).toBe(STUDENT_ID);
    });

    it('PARENT: should only see linked child grades', async () => {
      prisma.parentStudent.findMany.mockResolvedValue([{ studentId: STUDENT_ID }]);
      prisma.grade.findMany.mockResolvedValue([mockGrades[0]]);

      const result = await service.getResults(EXAM_ID, mockParent);

      expect(prisma.parentStudent.findMany).toHaveBeenCalledWith({
        where: { parentId: PARENT_ID },
        select: { studentId: true },
      });
      expect(prisma.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ studentId: { in: [STUDENT_ID] } }),
        }),
      );
      expect(result.grades).toHaveLength(1);
      expect(result.grades[0].studentId).toBe(STUDENT_ID);
    });

    it('TEACHER: should see all grades', async () => {
      prisma.grade.findMany.mockResolvedValue(mockGrades);

      const result = await service.getResults(EXAM_ID, mockTeacher);

      expect(prisma.grade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ studentId: expect.anything() }),
        }),
      );
      expect(result.grades).toHaveLength(2);
    });

    it('DIRECTOR: should see all grades', async () => {
      prisma.grade.findMany.mockResolvedValue(mockGrades);

      const result = await service.getResults(EXAM_ID, mockDirector);

      expect(result.grades).toHaveLength(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // SUBMIT BULK RESULTS — Director branch crash fix
  // ────────────────────────────────────────────────────────────────────────────

  describe('submitBulkResults', () => {
    it('should use exam.branchId instead of currentUser.branchId for notifications', async () => {
      prisma.exam.findFirst.mockResolvedValue(mockExam);
      prisma.grade.updateMany.mockResolvedValue({ count: 0 });
      prisma.grade.createMany.mockResolvedValue({ count: 1 });
      prisma.exam.findUnique.mockResolvedValue(mockExam);
      prisma.school.findUnique.mockResolvedValue({ name: 'Test School' });
      prisma.parentStudent.findMany.mockResolvedValue([]);

      const dto: BulkResultsDto = {
        results: [{ studentId: STUDENT_ID, score: 85 }],
      };

      const result = await service.submitBulkResults(EXAM_ID, dto, mockDirector);

      expect(result.saved).toBe(1);
      // Verify notification batch uses exam.branchId, not director's null branchId
      expect(prisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ branchId: BRANCH_ID }),
          ]),
        }),
      );
    });

    it('should throw NotFoundException when exam not found', async () => {
      prisma.exam.findFirst.mockResolvedValue(null);

      await expect(
        service.submitBulkResults(EXAM_ID, { results: [] }, mockTeacher),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET UPCOMING — Branch scope fix
  // ────────────────────────────────────────────────────────────────────────────

  describe('getUpcoming', () => {
    it('should use buildTenantWhere for branch scoping', async () => {
      prisma.exam.findMany.mockResolvedValue([mockExam]);

      const result = await service.getUpcoming(mockTeacher, 7);

      expect(prisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: SCHOOL_ID,
            branchId: BRANCH_ID,
          }),
        }),
      );
      expect(result).toEqual([mockExam]);
    });

    it('DIRECTOR: should scope by schoolId only (no branch filter)', async () => {
      prisma.exam.findMany.mockResolvedValue([mockExam]);

      const result = await service.getUpcoming(mockDirector, 7);

      expect(prisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: SCHOOL_ID,
          }),
        }),
      );
      expect(result).toEqual([mockExam]);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // FIND ALL — Role scoping
  // ────────────────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('STUDENT: should only see published exams for enrolled classes', async () => {
      prisma.classStudent.findMany.mockResolvedValue([{ classId: CLASS_ID }]);
      prisma.exam.findMany.mockResolvedValue([mockExam]);

      const result = await service.findAll(mockStudent);

      expect(prisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            classId: { in: [CLASS_ID] },
            isPublished: true,
          }),
        }),
      );
      expect(result).toEqual([mockExam]);
    });

    it('TEACHER: should only see exams for taught classes', async () => {
      prisma.subject.findMany.mockResolvedValue([{ classId: CLASS_ID }]);
      prisma.exam.findMany.mockResolvedValue([mockExam]);

      const result = await service.findAll(mockTeacher);

      expect(prisma.subject.findMany).toHaveBeenCalledWith({
        where: { schoolId: SCHOOL_ID, teacherId: TEACHER_ID, branchId: BRANCH_ID },
        select: { classId: true },
      });
      expect(result).toEqual([mockExam]);
    });
  });
});
