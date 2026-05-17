import { describe, it, expect } from 'vitest';
import { getRoleLabel, getCompactRoleLabel, getAttendanceLabel, getGradeTypeLabel, formatCurrency } from './utils';
import { GRADE_LEVELS, MAX_GRADE, MIN_GRADE } from '@eduplatform/types';

describe('getRoleLabel', () => {
  it('maps director to Maktab direktori', () => {
    expect(getRoleLabel('director')).toBe('Maktab direktori');
  });

  it('maps vice_principal to Mudir o‘rinbosari', () => {
    expect(getRoleLabel('vice_principal')).toBe('Mudir o‘rinbosari');
  });

  it('maps teacher to O‘qituvchi', () => {
    expect(getRoleLabel('teacher')).toBe('O‘qituvchi');
  });

  it('maps student to O‘quvchi', () => {
    expect(getRoleLabel('student')).toBe('O‘quvchi');
  });

  it('maps parent to Ota-ona', () => {
    expect(getRoleLabel('parent')).toBe('Ota-ona');
  });

  it('maps class_teacher to Sinf rahbari', () => {
    expect(getRoleLabel('class_teacher')).toBe('Sinf rahbari');
  });

  it('maps accountant to Moliyachi', () => {
    expect(getRoleLabel('accountant')).toBe('Moliyachi');
  });

  it('maps librarian to Kutubxonachi', () => {
    expect(getRoleLabel('librarian')).toBe('Kutubxonachi');
  });

  it('maps branch_admin to Filial boshqaruvchisi', () => {
    expect(getRoleLabel('branch_admin')).toBe('Filial boshqaruvchisi');
  });

  it('maps super_admin to Super Admin', () => {
    expect(getRoleLabel('super_admin')).toBe('Super Admin');
  });

  it('falls back to raw role for unknown values', () => {
    expect(getRoleLabel('unknown_role')).toBe('unknown_role');
  });

  it('does not contain backslash escapes in any label', () => {
    const roles = [
      'director',
      'vice_principal',
      'teacher',
      'student',
      'parent',
      'class_teacher',
      'accountant',
      'librarian',
      'branch_admin',
      'super_admin',
    ];
    for (const role of roles) {
      const label = getRoleLabel(role);
      expect(label).not.toContain('\\');
    }
  });
});

describe('getCompactRoleLabel', () => {
  it('maps director to Direktor', () => {
    expect(getCompactRoleLabel('director')).toBe('Direktor');
  });

  it('maps vice_principal to O‘rinbosar', () => {
    expect(getCompactRoleLabel('vice_principal')).toBe('O‘rinbosar');
  });

  it('maps teacher to O‘qituvchi', () => {
    expect(getCompactRoleLabel('teacher')).toBe('O‘qituvchi');
  });

  it('maps student to O‘quvchi', () => {
    expect(getCompactRoleLabel('student')).toBe('O‘quvchi');
  });

  it('maps parent to Ota-ona', () => {
    expect(getCompactRoleLabel('parent')).toBe('Ota-ona');
  });

  it('maps class_teacher to Sinf rahbari', () => {
    expect(getCompactRoleLabel('class_teacher')).toBe('Sinf rahbari');
  });

  it('maps accountant to Buxgalter', () => {
    expect(getCompactRoleLabel('accountant')).toBe('Buxgalter');
  });

  it('maps librarian to Kutubxonachi', () => {
    expect(getCompactRoleLabel('librarian')).toBe('Kutubxonachi');
  });

  it('maps branch_admin to Filial admin', () => {
    expect(getCompactRoleLabel('branch_admin')).toBe('Filial admin');
  });

  it('maps super_admin to Super Admin', () => {
    expect(getCompactRoleLabel('super_admin')).toBe('Super Admin');
  });

  it('falls back to raw role for unknown values', () => {
    expect(getCompactRoleLabel('unknown_role')).toBe('unknown_role');
  });

  it('does not contain backslash escapes in any label', () => {
    const roles = [
      'director',
      'vice_principal',
      'teacher',
      'student',
      'parent',
      'class_teacher',
      'accountant',
      'librarian',
      'branch_admin',
      'super_admin',
    ];
    for (const role of roles) {
      const label = getCompactRoleLabel(role);
      expect(label).not.toContain('\\');
    }
  });
});

describe('getAttendanceLabel', () => {
  it('maps present to Keldi', () => {
    expect(getAttendanceLabel('present')).toBe('Keldi');
  });

  it('maps absent to Kelmadi', () => {
    expect(getAttendanceLabel('absent')).toBe('Kelmadi');
  });

  it('maps late to Kechikdi', () => {
    expect(getAttendanceLabel('late')).toBe('Kechikdi');
  });

  it('maps excused to Uzrli', () => {
    expect(getAttendanceLabel('excused')).toBe('Uzrli');
  });
});

describe('getGradeTypeLabel', () => {
  it('maps homework to Uy ishi', () => {
    expect(getGradeTypeLabel('homework')).toBe('Uy ishi');
  });

  it('maps exam to Imtihon', () => {
    expect(getGradeTypeLabel('exam')).toBe('Imtihon');
  });
});

describe('formatCurrency', () => {
  it('formats UZS with so‘m suffix', () => {
    const result = formatCurrency(150000);
    expect(result).toContain('so‘m');
    expect(result).not.toContain('\\');
  });
});


describe('GRADE_LEVELS constant', () => {
  it('contains exactly grades 1 through 11', () => {
    expect(GRADE_LEVELS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('does not contain 12', () => {
    expect(GRADE_LEVELS).not.toContain(12);
  });

  it('has MAX_GRADE equal to 11', () => {
    expect(MAX_GRADE).toBe(11);
  });

  it('has MIN_GRADE equal to 1', () => {
    expect(MIN_GRADE).toBe(1);
  });
});
