
import { buildTenantWhere } from './tenant-scope.util';
import { JwtPayload, UserRole } from '@eduplatform/types';

/**
 * RBAC Penetration Matrix
 * 
 * Tests escalation attempts: lower-privilege roles trying to access
 * higher-privilege scopes, and super_admin without explicit schoolId.
 */

describe('RBAC Penetration Matrix', () => {
  const schoolA = 'school-a';
  const schoolB = 'school-b';
  const branchA = 'branch-a';
  const branchB = 'branch-b';

  const roles: Record<string, JwtPayload> = {
    super_admin: { sub: 'sa', email: 'sa@test.com', role: UserRole.SUPER_ADMIN, schoolId: null, branchId: null, isSuperAdmin: true },
    director: { sub: 'd', email: 'd@test.com', role: UserRole.DIRECTOR, schoolId: schoolA, branchId: null, isSuperAdmin: false },
    vp: { sub: 'vp', email: 'vp@test.com', role: UserRole.VICE_PRINCIPAL, schoolId: schoolA, branchId: null, isSuperAdmin: false },
    branch_admin: { sub: 'ba', email: 'ba@test.com', role: UserRole.BRANCH_ADMIN, schoolId: schoolA, branchId: branchA, isSuperAdmin: false },
    teacher: { sub: 't', email: 't@test.com', role: UserRole.TEACHER, schoolId: schoolA, branchId: branchA, isSuperAdmin: false },
    student: { sub: 's', email: 's@test.com', role: UserRole.STUDENT, schoolId: schoolA, branchId: branchA, isSuperAdmin: false },
    parent: { sub: 'p', email: 'p@test.com', role: UserRole.PARENT, schoolId: schoolA, branchId: branchA, isSuperAdmin: false },
    accountant: { sub: 'acc', email: 'acc@test.com', role: UserRole.ACCOUNTANT, schoolId: schoolA, branchId: null, isSuperAdmin: false },
  };

  // ─── Cross-school escalation ───────────────────────────────────────────────

  describe('cross-school escalation', () => {
    it('should block all non-super-admin roles from accessing other schools', () => {
      const targets = [roles.director, roles.vp, roles.branch_admin, roles.teacher, roles.student, roles.parent, roles.accountant];
      for (const user of targets) {
        const where = buildTenantWhere(user);
        expect(where.schoolId).not.toBe(schoolB);
        expect(where.schoolId).toBe(schoolA);
      }
    });

    it('should block super_admin without explicitSchoolId', () => {
      const where = buildTenantWhere(roles.super_admin);
      // Returns no-match filter — forces explicit scoping
      expect(where.schoolId).toBe('__SUPER_ADMIN_REQUIRES_EXPLICIT_SCHOOL_ID__');
    });

    it('should allow super_admin with explicitSchoolId', () => {
      const where = buildTenantWhere(roles.super_admin, schoolB);
      expect(where.schoolId).toBe(schoolB);
    });
  });

  // ─── Cross-branch escalation ───────────────────────────────────────────────

  describe('cross-branch escalation', () => {
    it('should block teacher from accessing other branches', () => {
      const where = buildTenantWhere(roles.teacher);
      expect(where.branchId).toBe(branchA);
      expect(where.branchId).not.toBe(branchB);
    });

    it('should block branch_admin from accessing other branches', () => {
      const where = buildTenantWhere(roles.branch_admin);
      expect(where.branchId).toBe(branchA);
      expect(where.branchId).not.toBe(branchB);
    });

    it('should allow director school-wide access (no branch filter)', () => {
      const where = buildTenantWhere(roles.director);
      expect(where.schoolId).toBe(schoolA);
      expect(where.branchId).toBeUndefined();
    });

    it('should allow vp school-wide access (no branch filter)', () => {
      const where = buildTenantWhere(roles.vp);
      expect(where.schoolId).toBe(schoolA);
      expect(where.branchId).toBeUndefined();
    });

    it('should allow accountant school-wide access (no branch filter)', () => {
      const where = buildTenantWhere(roles.accountant);
      expect(where.schoolId).toBe(schoolA);
      expect(where.branchId).toBeUndefined();
    });
  });

  // ─── Role hierarchy (read scope) ───────────────────────────────────────────

  describe('role hierarchy read scopes', () => {
    it('director gets school-wide scope', () => {
      const where = buildTenantWhere(roles.director);
      expect(where).toEqual({ schoolId: schoolA });
    });

    it('vp gets school-wide scope', () => {
      const where = buildTenantWhere(roles.vp);
      expect(where).toEqual({ schoolId: schoolA });
    });

    it('branch_admin gets branch-scoped', () => {
      const where = buildTenantWhere(roles.branch_admin);
      expect(where).toEqual({ schoolId: schoolA, branchId: branchA });
    });

    it('teacher gets branch-scoped', () => {
      const where = buildTenantWhere(roles.teacher);
      expect(where).toEqual({ schoolId: schoolA, branchId: branchA });
    });

    it('student gets branch-scoped', () => {
      const where = buildTenantWhere(roles.student);
      expect(where).toEqual({ schoolId: schoolA, branchId: branchA });
    });

    it('parent gets branch-scoped', () => {
      const where = buildTenantWhere(roles.parent);
      expect(where).toEqual({ schoolId: schoolA, branchId: branchA });
    });

    it('accountant gets school-wide scope', () => {
      const where = buildTenantWhere(roles.accountant);
      expect(where).toEqual({ schoolId: schoolA });
    });
  });

  // ─── Multi-branch staff ────────────────────────────────────────────────────

  describe('multi-branch staff isolation', () => {
    it('should allow multi-branch teacher access to assigned branches only', () => {
      const multiBranchTeacher: JwtPayload = {
        sub: 'mbt', email: 'mbt@test.com', role: UserRole.TEACHER,
        schoolId: schoolA, branchId: branchA, assignedBranchIds: [branchA, 'branch-c'], isSuperAdmin: false,
      };
      const where = buildTenantWhere(multiBranchTeacher);
      expect(where.schoolId).toBe(schoolA);
      // Note: branchA appears twice because it's both primary and in assignedBranchIds
      expect(where.branchId).toEqual({ in: [branchA, branchA, 'branch-c'] });
    });

    it('should not include unassigned branches for multi-branch teacher', () => {
      const multiBranchTeacher: JwtPayload = {
        sub: 'mbt', email: 'mbt@test.com', role: UserRole.TEACHER,
        schoolId: schoolA, branchId: branchA, assignedBranchIds: [branchA], isSuperAdmin: false,
      };
      const where = buildTenantWhere(multiBranchTeacher);
      // branchId appears twice (primary + assigned) so it uses { in: [...] }
      expect(where.branchId).toEqual({ in: [branchA, branchA] });
    });
  });

  // ─── Escalation summary table (documented assertions) ──────────────────────

  describe('escalation attempt matrix', () => {
    const cases = [
      { role: 'student', target: 'schoolB', expectLeak: false },
      { role: 'student', target: 'branchB', expectLeak: false },
      { role: 'teacher', target: 'schoolB', expectLeak: false },
      { role: 'teacher', target: 'branchB', expectLeak: false },
      { role: 'branch_admin', target: 'schoolB', expectLeak: false },
      { role: 'branch_admin', target: 'branchB', expectLeak: false },
      { role: 'director', target: 'schoolB', expectLeak: false },
      { role: 'director', target: 'branchB', expectLeak: true }, // Director can access any branch in their school
      { role: 'super_admin', target: 'schoolB', expectLeak: false }, // Without explicitSchoolId
      { role: 'super_admin', target: 'schoolB_explicit', expectLeak: true }, // With explicitSchoolId
    ];

    it.each(cases)('$role targeting $target: leak=$expectLeak', ({ role, target, expectLeak }) => {
      const user = roles[role];
      const explicitSchoolId = target === 'schoolB_explicit' ? schoolB : undefined;
      const where = buildTenantWhere(user, explicitSchoolId);

      if (target.startsWith('school')) {
        const hasAccess = where.schoolId === schoolB;
        expect(hasAccess).toBe(expectLeak);
      } else if (target.startsWith('branch')) {
        const branchFilter = where.branchId;
        let hasAccess = false;
        if (branchFilter === undefined) {
          hasAccess = true; // school-wide role
        } else if (typeof branchFilter === 'string') {
          hasAccess = branchFilter === branchB;
        } else if (branchFilter && 'in' in branchFilter) {
          hasAccess = branchFilter.in.includes(branchB);
        }
        expect(hasAccess).toBe(expectLeak);
      }
    });
  });
});
