import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { OnlineExamService } from './online-exam.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EventsGateway } from '@/modules/gateway/events.gateway';
import { AuditService } from '@/common/audit/audit.service';
import { ExamEngagementService } from '@/modules/engagement/exam-engagement.service';
import { JwtPayload, UserRole } from '@eduplatform/types';

const SCHOOL_ID = 'school-1';
const EXAM_ID = 'exam-1';
const SESSION_ID = 'session-1';
const STUDENT_ID = 'student-1';
const TEACHER_ID = 'teacher-1';
const Q_ID = 'q-1';
const OPT_ID = 'opt-1';

const mockStudent: JwtPayload = {
  sub: STUDENT_ID,
  email: 'student@test.com',
  role: UserRole.STUDENT,
  schoolId: SCHOOL_ID,
  branchId: 'branch-1',
  isSuperAdmin: false,
};

const mockTeacher: JwtPayload = {
  sub: TEACHER_ID,
  email: 'teacher@test.com',
  role: UserRole.TEACHER,
  schoolId: SCHOOL_ID,
  branchId: 'branch-1',
  isSuperAdmin: false,
};

const mockExam = {
  id: EXAM_ID,
  schoolId: SCHOOL_ID,
  isPublished: true,
  scheduledAt: new Date('2026-05-20T10:00:00.000Z'),
  duration: 60,
  maxScore: 100,
  questions: [
    {
      id: Q_ID,
      type: 'multiple_choice',
      text: '2+2=?',
      points: 1,
      order: 0,
      options: [
        { id: OPT_ID, text: '4', isCorrect: true, order: 0 },
        { id: 'opt-2', text: '5', isCorrect: false, order: 1 },
      ],
    },
  ],
};

describe('OnlineExamService', () => {
  let service: OnlineExamService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      exam: {
        findFirst: jest.fn(),
      },
      examQuestion: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({ _max: { order: 0 } }),
      },
      examOption: {
        findFirst: jest.fn(),
      },
      examSession: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      studentAnswer: {
        upsert: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      grade: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      coinTransaction: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops.map((op: any) => op))),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnlineExamService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventsGateway, useValue: { emitToSchool: jest.fn(), emitToUser: jest.fn() } },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: ExamEngagementService, useValue: { evaluateExamResult: jest.fn().mockResolvedValue({ action: 'reward' }) } },
      ],
    }).compile();

    service = module.get<OnlineExamService>(OnlineExamService);
  });

  // ────────────────────────────────────────────────────────────────────────────
  // START SESSION — Time-window enforcement
  // ────────────────────────────────────────────────────────────────────────────

  describe('startSession', () => {
    beforeEach(() => {
      prisma.examSession.findUnique.mockResolvedValue(null);
      prisma.examSession.create.mockResolvedValue({
        id: SESSION_ID, examId: EXAM_ID, studentId: STUDENT_ID, status: 'in_progress',
      });
    });

    it('should reject if exam has not started yet', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      prisma.exam.findFirst.mockResolvedValue({
        ...mockExam,
        scheduledAt: future,
        duration: 60,
      });

      await expect(service.startSession(EXAM_ID, mockStudent)).rejects.toThrow(ForbiddenException);
    });

    it('should reject if exam time window has expired', async () => {
      const past = new Date();
      past.setHours(past.getHours() - 2);
      prisma.exam.findFirst.mockResolvedValue({
        ...mockExam,
        scheduledAt: past,
        duration: 60,
      });

      await expect(service.startSession(EXAM_ID, mockStudent)).rejects.toThrow(ForbiddenException);
    });

    it('should allow start during valid time window', async () => {
      const recent = new Date();
      recent.setMinutes(recent.getMinutes() - 30);
      prisma.exam.findFirst.mockResolvedValue({
        ...mockExam,
        scheduledAt: recent,
        duration: 60,
      });

      const result = await service.startSession(EXAM_ID, mockStudent);

      expect(result.session.id).toBe(SESSION_ID);
    });

    it('should allow start for on-demand exams (no scheduledAt)', async () => {
      prisma.exam.findFirst.mockResolvedValue({
        ...mockExam,
        scheduledAt: null,
        duration: null,
      });

      const result = await service.startSession(EXAM_ID, mockStudent);

      expect(result.session.id).toBe(SESSION_ID);
    });

    it('should reject if exam not published', async () => {
      prisma.exam.findFirst.mockResolvedValue(null);

      await expect(service.startSession(EXAM_ID, mockStudent)).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // SAVE ANSWER — Option ownership validation
  // ────────────────────────────────────────────────────────────────────────────

  describe('saveAnswer', () => {
    beforeEach(() => {
      prisma.examSession.findFirst.mockResolvedValue({
        id: SESSION_ID, studentId: STUDENT_ID, status: 'in_progress',
      });
    });

    it('should accept valid optionId for the question', async () => {
      prisma.examOption.findFirst.mockResolvedValue({ id: OPT_ID, questionId: Q_ID });
      prisma.studentAnswer.upsert.mockResolvedValue({});

      await service.saveAnswer(SESSION_ID, { questionId: Q_ID, selectedOptionId: OPT_ID }, mockStudent);

      expect(prisma.examOption.findFirst).toHaveBeenCalledWith({
        where: { id: OPT_ID, questionId: Q_ID },
      });
      expect(prisma.studentAnswer.upsert).toHaveBeenCalled();
    });

    it('should reject optionId that does not belong to the question', async () => {
      prisma.examOption.findFirst.mockResolvedValue(null);

      await expect(
        service.saveAnswer(SESSION_ID, { questionId: Q_ID, selectedOptionId: 'wrong-opt' }, mockStudent),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow textAnswer without optionId', async () => {
      prisma.studentAnswer.upsert.mockResolvedValue({});

      await service.saveAnswer(SESSION_ID, { questionId: Q_ID, textAnswer: 'Javob matni' }, mockStudent);

      expect(prisma.examOption.findFirst).not.toHaveBeenCalled();
      expect(prisma.studentAnswer.upsert).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // GET SESSION RESULT — Correct answer stripping
  // ────────────────────────────────────────────────────────────────────────────

  describe('getSessionResult', () => {
    const mockSession = {
      id: SESSION_ID,
      examId: EXAM_ID,
      studentId: STUDENT_ID,
      status: 'submitted',
      score: 1,
      percentage: 100,
      answers: [
        {
          id: 'a1',
          questionId: Q_ID,
          selectedOptionId: OPT_ID,
          isCorrect: true,
          pointsEarned: 1,
          question: {
            id: Q_ID,
            text: '2+2=?',
            options: [
              { id: OPT_ID, text: '4', isCorrect: true, order: 0 },
              { id: 'opt-2', text: '5', isCorrect: false, order: 1 },
            ],
          },
          selectedOption: { id: OPT_ID, text: '4' },
        },
      ],
      student: { id: STUDENT_ID, firstName: 'Ali', lastName: 'Valiyev' },
      exam: { id: EXAM_ID, title: 'Test', maxScore: 100 },
    };

    it('STUDENT: should strip isCorrect from options', async () => {
      prisma.examSession.findFirst.mockResolvedValue(JSON.parse(JSON.stringify(mockSession)));

      const result = await service.getSessionResult(SESSION_ID, mockStudent);

      const option = result.answers[0].question.options[0];
      expect(option).toHaveProperty('id');
      expect(option).toHaveProperty('text');
      expect(option).toHaveProperty('order');
      expect(option).not.toHaveProperty('isCorrect');
    });

    it('TEACHER: should reveal isCorrect in options', async () => {
      prisma.examSession.findFirst.mockResolvedValue(JSON.parse(JSON.stringify(mockSession)));

      const result = await service.getSessionResult(SESSION_ID, mockTeacher);

      const option = result.answers[0].question.options[0];
      expect(option).toHaveProperty('isCorrect', true);
    });

    it('STUDENT: should only access own session', async () => {
      prisma.examSession.findFirst.mockResolvedValue(null);

      await expect(service.getSessionResult(SESSION_ID, mockStudent)).rejects.toThrow(NotFoundException);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // SUBMIT SESSION — Grade bridge
  // ────────────────────────────────────────────────────────────────────────────

  describe('submitSession', () => {
    const mockSessionInProgress = {
      id: SESSION_ID,
      examId: EXAM_ID,
      studentId: STUDENT_ID,
      schoolId: SCHOOL_ID,
      status: 'in_progress',
      answers: [
        {
          id: 'a1',
          questionId: Q_ID,
          selectedOptionId: OPT_ID,
          isCorrect: null,
          pointsEarned: 0,
        },
      ],
      exam: {
        ...mockExam,
        classId: 'class-1',
        subjectId: 'subj-1',
        branchId: 'branch-1',
        questions: [
          {
            id: Q_ID,
            type: 'multiple_choice',
            text: '2+2=?',
            points: 1,
            options: [
              { id: OPT_ID, text: '4', isCorrect: true },
              { id: 'opt-2', text: '5', isCorrect: false },
            ],
          },
        ],
      },
    };

    beforeEach(() => {
      prisma.examSession.findFirst.mockResolvedValue(mockSessionInProgress);
      prisma.examSession.update.mockResolvedValue({
        ...mockSessionInProgress,
        status: 'submitted',
        score: 1,
        percentage: 100,
      });
      prisma.studentAnswer.update.mockResolvedValue({});
    });

    it('should create a Grade record when submitting exam for the first time', async () => {
      prisma.grade.findFirst.mockResolvedValue(null);
      prisma.grade.create.mockResolvedValue({ id: 'grade-1' });

      await service.submitSession(SESSION_ID, mockStudent);

      expect(prisma.grade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            examId: EXAM_ID,
            studentId: STUDENT_ID,
            subjectId: 'subj-1',
            classId: 'class-1',
            score: 1,
            maxScore: 100,
            source: 'exam',
            isPublished: true,
            type: 'exam',
          }),
        }),
      );
    });

    it('should update existing Grade record on resubmission, not duplicate', async () => {
      prisma.grade.findFirst.mockResolvedValue({ id: 'grade-1', score: 0 });
      prisma.grade.update.mockResolvedValue({ id: 'grade-1', score: 1 });

      await service.submitSession(SESSION_ID, mockStudent);

      expect(prisma.grade.create).not.toHaveBeenCalled();
      expect(prisma.grade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'grade-1' },
          data: expect.objectContaining({ score: 1, maxScore: 100 }),
        }),
      );
    });

    it('should call evaluateExamResult after successful submission', async () => {
      prisma.grade.findFirst.mockResolvedValue(null);
      prisma.grade.create.mockResolvedValue({ id: 'grade-1' });
      prisma.coinTransaction.findFirst.mockResolvedValue(null);

      const examEngagementService = (service as any).examEngagementService;
      expect(examEngagementService).toBeDefined();

      await service.submitSession(SESSION_ID, mockStudent);

      expect(examEngagementService.evaluateExamResult).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: STUDENT_ID,
          schoolId: SCHOOL_ID,
          examId: EXAM_ID,
          score: 1,
          maxScore: 1,
          sessionId: SESSION_ID,
        }),
      );
    });

    it('should skip evaluateExamResult if already evaluated for this session', async () => {
      prisma.grade.findFirst.mockResolvedValue(null);
      prisma.grade.create.mockResolvedValue({ id: 'grade-1' });
      prisma.coinTransaction.findFirst.mockResolvedValue({ id: 'tx-1' }); // already evaluated

      const examEngagementService = (service as any).examEngagementService;
      await service.submitSession(SESSION_ID, mockStudent);

      expect(examEngagementService.evaluateExamResult).not.toHaveBeenCalled();
    });
  });
});
