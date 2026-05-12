#!/usr/bin/env ts-node
/**
 * validate-demo.ts
 *
 * Validates that the demo school (slug: xedu-demo) has all expected data.
 * Exits with code 1 if any critical data is missing.
 *
 * Run: npx ts-node scripts/validate-demo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SCHOOL_SLUG = 'xedu-demo';

interface Check {
  name: string;
  min: number;
  fn: () => Promise<number>;
}

async function main() {
  const school = await prisma.school.findUnique({ where: { slug: SCHOOL_SLUG } });
  if (!school) {
    console.error(`\n❌ Demo school "${SCHOOL_SLUG}" not found. Run: pnpm db:seed:demo\n`);
    process.exit(1);
  }

  const schoolId = school.id;

  const checks: Check[] = [
    { name: 'Branches',        min: 3,  fn: () => prisma.branch.count({ where: { schoolId } }) },
    { name: 'Users',           min: 200, fn: () => prisma.user.count({ where: { schoolId } }) },
    { name: 'Students',        min: 180, fn: () => prisma.user.count({ where: { schoolId, role: 'student' } }) },
    { name: 'Parents',         min: 140, fn: () => prisma.user.count({ where: { schoolId, role: 'parent' } }) },
    { name: 'Teachers',        min: 10,  fn: () => prisma.user.count({ where: { schoolId, role: { in: ['teacher', 'class_teacher'] } } }) },
    { name: 'Classes',         min: 20,  fn: () => prisma.class.count({ where: { schoolId } }) },
    { name: 'Subjects',        min: 10,  fn: () => prisma.subject.count({ where: { schoolId } }) },
    { name: 'Schedules',       min: 500, fn: () => prisma.schedule.count({ where: { schoolId } }) },
    { name: 'Attendance',      min: 5000,fn: () => prisma.attendance.count({ where: { schoolId } }) },
    { name: 'Grades',          min: 400, fn: () => prisma.grade.count({ where: { schoolId } }) },
    { name: 'Fee structures',  min: 1,  fn: () => prisma.feeStructure.count({ where: { schoolId } }) },
    { name: 'Payments',        min: 50, fn: () => prisma.payment.count({ where: { schoolId } }) },
    { name: 'Discipline',      min: 5,  fn: () => prisma.disciplineIncident.count({ where: { schoolId } }) },
    { name: 'Leave requests',  min: 1,  fn: () => prisma.leaveRequest.count({ where: { schoolId } }) },
    { name: 'Announcements',   min: 1,  fn: () => prisma.announcement.count({ where: { schoolId } }) },
    { name: 'Library books',   min: 20, fn: () => prisma.libraryBook.count({ where: { schoolId } }) },
    { name: 'Library loans',   min: 10, fn: () => prisma.libraryLoan.count({ where: { schoolId } }) },
    { name: 'Exams',           min: 3,  fn: () => prisma.exam.count({ where: { schoolId } }) },
    { name: 'KPI metrics',     min: 3,  fn: () => prisma.kpiMetric.count({ where: { schoolId } }) },
    { name: 'KPI records',     min: 3,  fn: () => prisma.kpiRecord.count({ where: { metric: { schoolId } } }) },
  ];

  console.log(`\n🏫 Validating demo school: ${school.name} (${school.slug})\n`);

  let passCount = 0;
  let failCount = 0;

  for (const check of checks) {
    const count = await check.fn();
    const ok = count >= check.min;
    const icon = ok ? '✅' : '❌';
    const color = ok ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    console.log(`  ${color}${icon}${reset} ${check.name.padEnd(18)} ${String(count).padStart(5)} / ${check.min} ${ok ? '' : '← FAIL'}`);
    if (ok) passCount++; else failCount++;
  }

  console.log(`\n${passCount}/${checks.length} checks passed${failCount > 0 ? `, ${failCount} failed` : ''}\n`);

  await prisma.$disconnect();

  if (failCount > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
