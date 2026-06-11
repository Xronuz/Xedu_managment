import { describe, it, expect } from 'vitest';
import { DIRECTOR_NAV, getNavForRole, getFlatNavForRole } from './navigation';
import { OPS_REDIRECT_ROLES } from './permissions';
import { DIRECTOR_CMDK_ALLOWED } from '@/components/command-palette';

describe('Director Navigation (executive curation)', () => {
  const directorNav = getNavForRole('director');
  const flatItems = getFlatNavForRole('director');

  it('should be a single flat group (no section chaos)', () => {
    expect(directorNav).toHaveLength(1);
  });

  it('should contain exactly 8 sidebar items', () => {
    expect(flatItems).toHaveLength(8);
  });

  it('should contain only executive items', () => {
    const labels = flatItems.map(i => i.label);
    expect(labels).toEqual([
      'Dashboard',
      'Tasdiqlash inbox',
      'Ogohlantirishlar',
      'Xodimlar',
      'Akademik kalendar',
      'Hisobotlar',
      'Maktab ekrani',
      'Sozlamalar',
    ]);
  });

  it('should NOT contain hidden operational items', () => {
    const labels = flatItems.map(i => i.label);
    expect(labels).not.toContain('Maktab sozlash');
    expect(labels).not.toContain('Sinflar');
    expect(labels).not.toContain('Fanlar');
    expect(labels).not.toContain('Imtihonlar');
    expect(labels).not.toContain('Baholar');
    expect(labels).not.toContain('Davomat');
    expect(labels).not.toContain("To'garaklar");
    expect(labels).not.toContain('Intizom');
    expect(labels).not.toContain("O'quvchilar");
    expect(labels).not.toContain('CRM — Leadlar');
    expect(labels).not.toContain('Kommunikatsiya');
    expect(labels).not.toContain('Jadval analitikasi');
  });
});

describe('Director Command Palette Curation', () => {
  it('should have exactly 17 allowed Cmd+K items', () => {
    expect(DIRECTOR_CMDK_ALLOWED.size).toBe(17);
  });

  it('should include all executive routes', () => {
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/ops')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/approvals')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/alerts')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/branches')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/staff')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/users')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/schedule')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/grades')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/attendance')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/finance')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/payroll')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/reports')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/kpi')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/settings')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/audit-log')).toBe(true);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/profile')).toBe(true);
  });

  it('should NOT include hidden operational routes', () => {
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/setup')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/classes')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/subjects')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/exams')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/discipline')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/leave-requests')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/teacher-substitutions')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/students')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/crm')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/comms')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/notifications')).toBe(false);
    expect(DIRECTOR_CMDK_ALLOWED.has('/dashboard/export-center')).toBe(false);
  });
});

describe('Director Dashboard Redirect', () => {
  it('should NOT include director in OPS_REDIRECT_ROLES', () => {
    expect(OPS_REDIRECT_ROLES).not.toContain('director');
  });

  it('should still include VP, Branch Admin, Accountant', () => {
    expect(OPS_REDIRECT_ROLES).toContain('vice_principal');
    expect(OPS_REDIRECT_ROLES).toContain('branch_admin');
    expect(OPS_REDIRECT_ROLES).toContain('accountant');
  });
});

describe('Other roles are NOT affected by Director curation', () => {
  it('VP nav still contains academic items', () => {
    const vpNav = getFlatNavForRole('vice_principal');
    const labels = vpNav.map(i => i.label);
    expect(labels).toContain('Sinflar');
    expect(labels).toContain('Fanlar');
    expect(labels).toContain('Imtihonlar');
    expect(labels).toContain('Ta‘til so‘rovlar');
    expect(labels).toContain('Intizom');
  });

  it('Branch Admin nav still contains operational items', () => {
    const baNav = getFlatNavForRole('branch_admin');
    const labels = baNav.map(i => i.label);
    expect(labels).toContain('Sinflar');
    expect(labels).toContain('Intizom');
    expect(labels).toContain('O‘qituvchi almashtirish');
  });

  it('Accountant nav still contains finance items', () => {
    const accNav = getFlatNavForRole('accountant');
    const labels = accNav.map(i => i.label);
    expect(labels).toContain("To'lovlar");
    expect(labels).toContain('Tariflar');
    expect(labels).toContain('Ish haqi');
  });
});
