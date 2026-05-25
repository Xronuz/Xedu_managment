import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeachingLoadService } from './teaching-load.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import { JwtPayload, UserRole, TeachingLoadStatus } from '@eduplatform/types';

const mockDirector: JwtPayload = {
  sub: 'user-director', email: 'd@test.com', role: UserRole.DIRECTOR,
  schoolId: 'school-1', branchId: null, isSuperAdmin: false,
};

const mockBranchAdmin: JwtPayload = {
  sub: 'user-ba', email: 'ba@test.com', role: UserRole.BRANCH_ADMIN,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockTeacher: JwtPayload = {
  sub: 'teacher-1', email: 't1@test.com', role: UserRole.TEACHER,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockTeacher2: JwtPayload = {
  sub: 'teacher-2', email: 't2@test.com', role: UserRole.TEACHER,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

const mockStudent: JwtPayload = {
  sub: 'student-1', email: 's@test.com', role: UserRole.STUDENT,
  schoolId: 'school-1', branchId: 'branch-1', isSuperAdmin: false,
};

describe('TeachingLoadService — Workload Aggregation', () => {
  let service: TeachingLoadService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      teachingLoad: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      staffSalary: { findMany: jest.fn().mockResolvedValue([]) },
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

  function makeTeachers() {
    return [
      { id: 'teacher-1', firstName: 'Ali', lastName: 'Valiyev', branchId: 'branch-1' },
      { id: 'teacher-2', firstName: 'Bobur', lastName: 'Karimov', branchId: 'branch-1' },
      { id: 'teacher-3', firstName: 'Sardor', lastName: 'Rahimov', branchId: 'branch-2' },
    ];
  }

  function makeLoads(): any[] {
    return [
      // teacher-1: 12 hours (contractual 18) → balanced
      { teacherId: 'teacher-1', classId: 'c1', subjectId: 's1', hoursPerWeek: 4, coefficient: 1, groupType: 'class', isSplitClass: false, branchId: 'branch-1', subject: { name: 'Matematika' }, class: { name: '5-A' }, branch: { name: 'Chilonzor' } },
      { teacherId: 'teacher-1', classId: 'c2', subjectId: 's2', hoursPerWeek: 4, coefficient: 1, groupType: 'class', isSplitClass: false, branchId: 'branch-1', subject: { name: 'Fizika' }, class: { name: '6-A' }, branch: { name: 'Chilonzor' } },
      { teacherId: 'teacher-1', classId: 'c3', subjectId: 's3', hoursPerWeek: 4, coefficient: 1.25, groupType: 'class', isSplitClass: true, branchId: 'branch-1', subject: { name: 'Kimyo' }, class: { name: '7-A' }, branch: { name: 'Chilonzor' } },
      // teacher-2: 6 hours (contractual 18) → underloaded
      { teacherId: 'teacher-2', classId: 'c1', subjectId: 's4', hoursPerWeek: 6, coefficient: 1, groupType: 'class', isSplitClass: false, branchId: 'branch-1', subject: { name: 'Biologiya' }, class: { name: '5-A' }, branch: { name: 'Chilonzor' } },
      // teacher-3: 22 hours (contractual 18) → overloaded, in branch-2
      { teacherId: 'teacher-3', classId: 'c4', subjectId: 's5', hoursPerWeek: 22, coefficient: 1, groupType: 'class', isSplitClass: false, branchId: 'branch-2', subject: { name: 'Ingliz tili' }, class: { name: '8-A' }, branch: { name: 'Yunusobod' } },
    ];
  }

  function makeSalaries() {
    return [
      { userId: 'teacher-1', weeklyLessonHours: 18 },
      { userId: 'teacher-2', weeklyLessonHours: 18 },
      { userId: 'teacher-3', weeklyLessonHours: 18 },
    ];
  }

  describe('getWorkloadSummary', () => {
    it('should calculate summary correctly for director', async () => {
      prisma.user.findMany.mockResolvedValue(makeTeachers());
      prisma.teachingLoad.findMany.mockResolvedValue(makeLoads());
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaries());

      const summary = await service.getWorkloadSummary(mockDirector);

      expect(summary.totalTeachers).toBe(3);
      expect(summary.totalPlannedHours).toBe(40); // 12 + 6 + 22
      expect(summary.balancedCount).toBe(0);
      expect(summary.underloadedCount).toBe(2);
      expect(summary.overloadedCount).toBe(1);
      expect(summary.missingContractCount).toBe(0);
      expect(summary.noLoadCount).toBe(0);
      expect(summary.alerts).toHaveLength(3); // 2 underloaded + 1 overloaded
    });

    it('should flag missing contract hours', async () => {
      const teachers = makeTeachers();
      prisma.user.findMany.mockResolvedValue(teachers);
      prisma.teachingLoad.findMany.mockResolvedValue(makeLoads());
      prisma.staffSalary.findMany.mockResolvedValue([]); // no salaries

      const summary = await service.getWorkloadSummary(mockDirector);

      expect(summary.missingContractCount).toBe(3);
      expect(summary.alerts.some(a => a.type === 'missingContractHours')).toBe(true);
    });

    it('should flag no approved loads', async () => {
      const teachers = makeTeachers();
      prisma.user.findMany.mockResolvedValue(teachers);
      prisma.teachingLoad.findMany.mockResolvedValue([]);
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaries());

      const summary = await service.getWorkloadSummary(mockDirector);

      expect(summary.noLoadCount).toBe(3);
      expect(summary.alerts.some(a => a.type === 'noApprovedTeachingLoad')).toBe(true);
    });

    it('should reject student access', async () => {
      await expect(service.getWorkloadSummary(mockStudent)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTeacherWorkloads', () => {
    it('should calculate utilization and status correctly', async () => {
      prisma.user.findMany.mockResolvedValue(makeTeachers());
      prisma.teachingLoad.findMany.mockResolvedValue(makeLoads());
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaries());

      const workloads = await service.getTeacherWorkloads(mockDirector);

      expect(workloads).toHaveLength(3);

      const w1 = workloads.find(w => w.teacherId === 'teacher-1')!;
      expect(w1.plannedWeeklyHours).toBe(12);
      expect(w1.contractualWeeklyHours).toBe(18);
      expect(w1.utilizationPercent).toBe(67);
      expect(w1.status).toBe('underloaded');

      const w2 = workloads.find(w => w.teacherId === 'teacher-2')!;
      expect(w2.plannedWeeklyHours).toBe(6);
      expect(w2.utilizationPercent).toBe(33);
      expect(w2.status).toBe('underloaded');

      const w3 = workloads.find(w => w.teacherId === 'teacher-3')!;
      expect(w3.plannedWeeklyHours).toBe(22);
      expect(w3.utilizationPercent).toBe(122);
      expect(w3.status).toBe('overloaded');
    });

    it('should compute counts correctly', async () => {
      prisma.user.findMany.mockResolvedValue(makeTeachers());
      prisma.teachingLoad.findMany.mockResolvedValue(makeLoads());
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaries());

      const workloads = await service.getTeacherWorkloads(mockDirector);
      const w1 = workloads.find(w => w.teacherId === 'teacher-1')!;

      expect(w1.classCount).toBe(3);
      expect(w1.subjectCount).toBe(3);
      expect(w1.splitClassCount).toBe(1);
      expect(w1.coefficientWeightedHours).toBeCloseTo(13, 0);
    });

    it('should scope Branch Admin to own branch', async () => {
      prisma.user.findMany.mockImplementation((args: any) => {
        // Verify branch filter is applied
        expect(args.where.branchId).toBe('branch-1');
        return Promise.resolve(makeTeachers().filter(t => t.branchId === 'branch-1'));
      });
      prisma.teachingLoad.findMany.mockResolvedValue(makeLoads().filter(l => l.branchId === 'branch-1'));
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaries().filter(s => ['teacher-1', 'teacher-2'].includes(s.userId)));

      const workloads = await service.getTeacherWorkloads(mockBranchAdmin);
      expect(workloads).toHaveLength(2);
      expect(workloads.every(w => ['teacher-1', 'teacher-2'].includes(w.teacherId))).toBe(true);
    });

    it('should allow teacher to view own workload only', async () => {
      prisma.user.findMany.mockResolvedValue(makeTeachers().filter(t => t.id === 'teacher-1'));
      prisma.teachingLoad.findMany.mockResolvedValue(makeLoads().filter(l => l.teacherId === 'teacher-1'));
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaries().filter(s => s.userId === 'teacher-1'));

      const workloads = await service.getTeacherWorkloads(mockTeacher);
      expect(workloads).toHaveLength(1);
      expect(workloads[0].teacherId).toBe('teacher-1');
    });

    it('should reject teacher viewing another teacher', async () => {
      await expect(service.getTeacherWorkloads(mockTeacher, 'teacher-2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTeacherWorkloadDetail', () => {
    it('should return detail for a specific teacher', async () => {
      prisma.user.findMany.mockResolvedValue(makeTeachers().filter(t => t.id === 'teacher-1'));
      prisma.teachingLoad.findMany.mockResolvedValue(makeLoads().filter(l => l.teacherId === 'teacher-1'));
      prisma.staffSalary.findMany.mockResolvedValue(makeSalaries().filter(s => s.userId === 'teacher-1'));

      const detail = await service.getTeacherWorkloadDetail('teacher-1', mockDirector);
      expect(detail.teacherId).toBe('teacher-1');
      expect(detail.loads).toHaveLength(3);
    });

    it('should throw NotFound for non-existent teacher', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.teachingLoad.findMany.mockResolvedValue([]);
      prisma.staffSalary.findMany.mockResolvedValue([]);

      await expect(service.getTeacherWorkloadDetail('unknown', mockDirector)).rejects.toThrow(NotFoundException);
    });
  });
});
