import { buildTenantWhere } from './tenant-scope.util';
import { JwtPayload, UserRole } from '@eduplatform/types';

describe('Tenant Isolation Verification', () => {
  const schoolA = 'school-a';
  const schoolB = 'school-b';
  const branchA1 = 'branch-a1';
  const branchA2 = 'branch-a2';
  const branchB1 = 'branch-b1';

  const directorA: JwtPayload = {
    sub: 'user-1', email: 'dir@a.com', role: UserRole.DIRECTOR,
    schoolId: schoolA, branchId: null, isSuperAdmin: false,
  };

  const vpA: JwtPayload = {
    sub: 'user-2', email: 'vp@a.com', role: UserRole.VICE_PRINCIPAL,
    schoolId: schoolA, branchId: null, isSuperAdmin: false,
  };

  const branchAdminA1: JwtPayload = {
    sub: 'user-3', email: 'ba@a1.com', role: UserRole.BRANCH_ADMIN,
    schoolId: schoolA, branchId: branchA1, isSuperAdmin: false,
  };

  const teacherA1: JwtPayload = {
    sub: 'user-4', email: 't@a1.com', role: UserRole.TEACHER,
    schoolId: schoolA, branchId: branchA1, isSuperAdmin: false,
  };

  const multiBranchTeacher: JwtPayload = {
    sub: 'user-5', email: 'mb@a.com', role: UserRole.TEACHER,
    schoolId: schoolA, branchId: branchA1, assignedBranchIds: [branchA2], isSuperAdmin: false,
  };

  const superAdmin: JwtPayload = {
    sub: 'user-6', email: 'sa@platform.com', role: UserRole.SUPER_ADMIN,
    schoolId: null, branchId: null, isSuperAdmin: true,
  };

  // ─── buildTenantWhere core behavior ────────────────────────────────────────

  describe('buildTenantWhere', () => {
    it('DIRECTOR: scopes by schoolId only (school-wide access)', () => {
      const where = buildTenantWhere(directorA);
      expect(where).toEqual({ schoolId: schoolA });
    });

    it('VICE_PRINCIPAL: scopes by schoolId only (school-wide access)', () => {
      const where = buildTenantWhere(vpA);
      expect(where).toEqual({ schoolId: schoolA });
    });

    it('BRANCH_ADMIN: scopes by schoolId + own branchId', () => {
      const where = buildTenantWhere(branchAdminA1);
      expect(where).toEqual({ schoolId: schoolA, branchId: branchA1 });
    });

    it('TEACHER: scopes by schoolId + own branchId', () => {
      const where = buildTenantWhere(teacherA1);
      expect(where).toEqual({ schoolId: schoolA, branchId: branchA1 });
    });

    it('MULTI_BRANCH_TEACHER: scopes by schoolId + branchId in assigned list', () => {
      const where = buildTenantWhere(multiBranchTeacher);
      expect(where.schoolId).toBe(schoolA);
      expect(where.branchId).toEqual({ in: [branchA1, branchA2] });
    });

    it('SUPER_ADMIN without explicitSchoolId: returns no-match filter', () => {
      const where = buildTenantWhere(superAdmin);
      expect(where.schoolId).toBe('__SUPER_ADMIN_REQUIRES_EXPLICIT_SCHOOL_ID__');
    });

    it('SUPER_ADMIN with explicitSchoolId: scopes by that schoolId', () => {
      const where = buildTenantWhere(superAdmin, schoolB);
      expect(where).toEqual({ schoolId: schoolB });
    });
  });

  // ─── Cross-tenant leakage prevention ───────────────────────────────────────

  describe('cross-tenant leakage prevention', () => {
    it('should never allow schoolA user to query schoolB data', () => {
      const whereA = buildTenantWhere(directorA);
      expect(whereA.schoolId).not.toBe(schoolB);
      expect(whereA.schoolId).toBe(schoolA);
    });

    it('should never allow branchA1 user to access branchA2 data (single branch)', () => {
      const where = buildTenantWhere(teacherA1);
      expect(where.branchId).not.toBe(branchA2);
      expect(where.branchId).toBe(branchA1);
    });

    it('should allow multi-branch user to access all assigned branches', () => {
      const where = buildTenantWhere(multiBranchTeacher);
      const branchFilter = where.branchId as { in: string[] };
      expect(branchFilter.in).toContain(branchA1);
      expect(branchFilter.in).toContain(branchA2);
    });

    it('should not include unassigned branches for multi-branch user', () => {
      const where = buildTenantWhere(multiBranchTeacher);
      const branchFilter = where.branchId as { in: string[] };
      expect(branchFilter.in).not.toContain(branchB1);
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should handle null schoolId gracefully (returns undefined schoolId)', () => {
      // This mimics a malformed JWT — buildTenantWhere returns { schoolId: null }
      // which Prisma will treat as a literal match (unlikely to leak data)
      const badUser: JwtPayload = {
        sub: 'bad', email: 'bad@test.com', role: UserRole.TEACHER,
        schoolId: null as any, branchId: 'branch-x', isSuperAdmin: false,
      };
      const where = buildTenantWhere(badUser);
      expect(where.schoolId).toBeNull();
      expect(where.branchId).toBe('branch-x');
    });

    it('should handle empty assignedBranchIds array', () => {
      const user: JwtPayload = {
        sub: 'u', email: 'u@test.com', role: UserRole.TEACHER,
        schoolId: schoolA, branchId: branchA1, assignedBranchIds: [], isSuperAdmin: false,
      };
      const where = buildTenantWhere(user);
      expect(where).toEqual({ schoolId: schoolA, branchId: branchA1 });
    });
  });
});
