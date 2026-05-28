import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { HomeworkService } from './homework.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { AchievementService } from '@/modules/engagement/achievement.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

const SCHOOL_ID = 'school-1';
const BRANCH_ID = 'branch-1';
const CLASS_ID = 'class-1';
const STUDENT_ID = 'student-1';
const PARENT_ID = 'parent-1';
const TEACHER_ID = 'teacher-1';
const HW_ID = 'hw-1';

const mockHomework = {
  id: HW_ID,
  schoolId: SCHOOL_ID,
  branchId: BRANCH_ID,
  classId: CLASS_ID,
  subjectId: 'subj-1',
  title: 'Matematika vazifasi',
  description: 'Boblarni yechish',
  dueDate: new Date('2026-06-30'),
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

describe('HomeworkService', () => {
  let service: HomeworkService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      homework: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      classStudent: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      parentStudent: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      subject: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      homeworkSubmission: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        create: jest.fn(),
      },
      class: {
        findFirst: jest.fn(),
      },
      grade: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops.map((op: any) => op))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeworkService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: { createInApp: jest.fn().mockResolvedValue(undefined) } },
        { provide: AchievementService, useValue: { checkAndProgress: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get<HomeworkService>(HomeworkService);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // FIND ALL — Privacy Isolation
  // ────────────────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('STUDENT: should only see homework for enrolled classes', async () => {
      prisma.classStudent.findMany.mockResolvedValue([{ classId: CLASS_ID }]);
      prisma.homework.findMany.mockResolvedValue([mockHomework]);

      const result = await service.findAll(mockStudent);

      expect(prisma.classStudent.findMany).toHaveBeenCalledWith({
        where: { studentId: STUDENT_ID },
        select: { classId: true },
      });
      expect(prisma.homework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: SCHOOL_ID,
            branchId: BRANCH_ID,
            classId: { in: [CLASS_ID] },
          }),
        }),
      );
      expect(result).toEqual([mockHomework]);
    });

    it('STUDENT: should return empty if querying unrelated classId', async () => {
      prisma.classStudent.findMany.mockResolvedValue([{ classId: CLASS_ID }]);

      const result = await service.findAll(mockStudent, 'other-class');

      expect(prisma.homework.findMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('PARENT: should only see homework for linked children classes', async () => {
      prisma.parentStudent.findMany.mockResolvedValue([{ studentId: STUDENT_ID }]);
      prisma.classStudent.findMany.mockResolvedValue([{ classId: CLASS_ID }]);
      prisma.homework.findMany.mockResolvedValue([mockHomework]);

      const result = await service.findAll(mockParent);

      expect(prisma.parentStudent.findMany).toHaveBeenCalledWith({
        where: { parentId: PARENT_ID },
        select: { studentId: true },
      });
      expect(prisma.homework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: SCHOOL_ID,
            branchId: BRANCH_ID,
            classId: { in: [CLASS_ID] },
          }),
        }),
      );
      expect(result).toEqual([mockHomework]);
    });

    it('TEACHER: should only see homework for taught classes', async () => {
      prisma.subject.findMany.mockResolvedValue([{ classId: CLASS_ID }]);
      prisma.homework.findMany.mockResolvedValue([mockHomework]);

      const result = await service.findAll(mockTeacher);

      expect(prisma.subject.findMany).toHaveBeenCalledWith({
        where: { schoolId: SCHOOL_ID, teacherId: TEACHER_ID, branchId: BRANCH_ID },
        select: { classId: true },
      });
      expect(prisma.homework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            schoolId: SCHOOL_ID,
            branchId: BRANCH_ID,
            classId: { in: [CLASS_ID] },
          }),
        }),
      );
      expect(result).toEqual([mockHomework]);
    });

    it('DIRECTOR: should see all school homework', async () => {
      prisma.homework.findMany.mockResolvedValue([mockHomework]);

      const result = await service.findAll(mockDirector);

      expect(prisma.homework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ schoolId: SCHOOL_ID }),
        }),
      );
      expect(result).toEqual([mockHomework]);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // FIND ONE — Submission Privacy
  // ────────────────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('STUDENT: should only see own submission', async () => {
      prisma.homework.findFirst.mockResolvedValue({
        ...mockHomework,
        submissions: [
          { studentId: STUDENT_ID, student: { id: STUDENT_ID, firstName: 'Ali', lastName: 'Valiyev' } },
          { studentId: 'other-student', student: { id: 'other-student', firstName: 'Bek', lastName: 'Karimov' } },
        ],
      });

      const result = await service.findOne(HW_ID, mockStudent);

      expect(result.submissions).toHaveLength(1);
      expect(result.submissions[0].studentId).toBe(STUDENT_ID);
    });

    it('PARENT: should only see linked child submissions', async () => {
      prisma.homework.findFirst.mockResolvedValue({
        ...mockHomework,
        submissions: [
          { studentId: STUDENT_ID, student: { id: STUDENT_ID, firstName: 'Ali', lastName: 'Valiyev' } },
          { studentId: 'other-student', student: { id: 'other-student', firstName: 'Bek', lastName: 'Karimov' } },
        ],
      });
      prisma.parentStudent.findMany.mockResolvedValue([{ studentId: STUDENT_ID }]);

      const result = await service.findOne(HW_ID, mockParent);

      expect(result.submissions).toHaveLength(1);
      expect(result.submissions[0].studentId).toBe(STUDENT_ID);
    });

    it('TEACHER: should see all submissions', async () => {
      prisma.homework.findFirst.mockResolvedValue({
        ...mockHomework,
        submissions: [
          { studentId: STUDENT_ID, student: { id: STUDENT_ID, firstName: 'Ali', lastName: 'Valiyev' } },
          { studentId: 'other-student', student: { id: 'other-student', firstName: 'Bek', lastName: 'Karimov' } },
        ],
      });

      const result = await service.findOne(HW_ID, mockTeacher);

      expect(result.submissions).toHaveLength(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // SUBMIT — Enrollment Check
  // ────────────────────────────────────────────────────────────────────────────

  describe('submit', () => {
    it('should allow submission when student is enrolled', async () => {
      prisma.homework.findFirst.mockResolvedValue(mockHomework);
      prisma.classStudent.findFirst.mockResolvedValue({ id: 'cs-1' });
      prisma.homeworkSubmission.findFirst.mockResolvedValue(null);
      prisma.homeworkSubmission.create.mockResolvedValue({
        id: 'sub-1', homeworkId: HW_ID, studentId: STUDENT_ID, content: 'Javob',
      });

      const result = await service.submit(HW_ID, { content: 'Javob' }, mockStudent);

      expect(prisma.classStudent.findFirst).toHaveBeenCalledWith({
        where: { classId: CLASS_ID, studentId: STUDENT_ID },
      });
      expect(result.studentId).toBe(STUDENT_ID);
    });

    it('should trigger achievement check on new submission', async () => {
      prisma.homework.findFirst.mockResolvedValue(mockHomework);
      prisma.classStudent.findFirst.mockResolvedValue({ id: 'cs-1' });
      prisma.homeworkSubmission.findFirst.mockResolvedValue(null); // new submission
      prisma.homeworkSubmission.create.mockResolvedValue({
        id: 'sub-1', homeworkId: HW_ID, studentId: STUDENT_ID, content: 'Javob',
      });

      const achievementService = (service as any).achievementService;
      await service.submit(HW_ID, { content: 'Javob' }, mockStudent);

      expect(achievementService.checkAndProgress).toHaveBeenCalledWith(
        STUDENT_ID, SCHOOL_ID, 'homework_streak',
      );
      expect(achievementService.checkAndProgress).toHaveBeenCalledWith(
        STUDENT_ID, SCHOOL_ID, 'homework_count',
      );
    });

    it('should NOT trigger achievement check on resubmission', async () => {
      prisma.homework.findFirst.mockResolvedValue(mockHomework);
      prisma.classStudent.findFirst.mockResolvedValue({ id: 'cs-1' });
      prisma.homeworkSubmission.findFirst.mockResolvedValue({ id: 'sub-1' }); // existing
      prisma.homeworkSubmission.update.mockResolvedValue({
        id: 'sub-1', homeworkId: HW_ID, studentId: STUDENT_ID, content: 'Yangilangan',
      });

      const achievementService = (service as any).achievementService;
      await service.submit(HW_ID, { content: 'Yangilangan' }, mockStudent);

      expect(achievementService.checkAndProgress).not.toHaveBeenCalled();
    });

    it('should reject submission when student is not enrolled', async () => {
      prisma.homework.findFirst.mockResolvedValue(mockHomework);
      prisma.classStudent.findFirst.mockResolvedValue(null);

      await expect(
        service.submit(HW_ID, { content: 'Javob' }, mockStudent),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CREATE — Safe branchId resolution
  // ────────────────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw NotFoundException when classId is invalid', async () => {
      prisma.class.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { classId: 'invalid-class', subjectId: 'subj-1', title: 'Test', dueDate: '2026-06-30T23:59:00.000Z' },
          mockTeacher,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create homework with resolved branchId', async () => {
      prisma.class.findFirst.mockResolvedValue({ branchId: BRANCH_ID });
      prisma.homework.create.mockResolvedValue(mockHomework);

      const result = await service.create(
        { classId: CLASS_ID, subjectId: 'subj-1', title: 'Test', dueDate: '2026-06-30T23:59:00.000Z' },
        mockTeacher,
      );

      expect(prisma.homework.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ branchId: BRANCH_ID }),
        }),
      );
      expect(result).toEqual(mockHomework);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GRADE — Bridge to Grade journal
  // ────────────────────────────────────────────────────────────────────────────

  describe('grade', () => {
    const mockSubmission = {
      id: 'sub-1',
      homeworkId: HW_ID,
      studentId: STUDENT_ID,
      content: 'Javob',
      score: null,
    };

    beforeEach(() => {
      prisma.homework.findFirst.mockResolvedValue(mockHomework);
      prisma.homeworkSubmission.findFirst.mockResolvedValue(mockSubmission);
      prisma.homeworkSubmission.update.mockResolvedValue({ ...mockSubmission, score: 85 });
    });

    it('should create a Grade record when grading a submission for the first time', async () => {
      prisma.grade.findFirst.mockResolvedValue(null);
      prisma.grade.create.mockResolvedValue({ id: 'grade-1' });

      await service.grade(HW_ID, 'sub-1', { score: 85 }, mockTeacher);

      expect(prisma.grade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            homeworkId: HW_ID,
            studentId: STUDENT_ID,
            subjectId: mockHomework.subjectId,
            classId: mockHomework.classId,
            score: 85,
            source: 'homework',
            isPublished: true,
          }),
        }),
      );
    });

    it('should update existing Grade record on regrade, not create duplicate', async () => {
      prisma.grade.findFirst.mockResolvedValue({ id: 'grade-1', score: 70 });
      prisma.grade.update.mockResolvedValue({ id: 'grade-1', score: 90 });

      await service.grade(HW_ID, 'sub-1', { score: 90 }, mockTeacher);

      expect(prisma.grade.create).not.toHaveBeenCalled();
      expect(prisma.grade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'grade-1' },
          data: expect.objectContaining({ score: 90 }),
        }),
      );
    });

    it('should not create Grade when score is null (ungrading)', async () => {
      prisma.grade.findFirst.mockResolvedValue(null);

      await service.grade(HW_ID, 'sub-1', { score: null as any }, mockTeacher);

      expect(prisma.grade.create).not.toHaveBeenCalled();
    });
  });
});
