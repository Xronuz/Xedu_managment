/**
 * Cleanup script: Fix classes with empty/null/invalid branchId values.
 *
 * Context:
 *   Previously the frontend "Yangi sinf qo'shish" modal had a virtual
 *   "Joriy filial (avtomatik)" option. When selected it sent an empty
 *   string as branchId. The backend fell back to currentUser.branchId
 *   at runtime, but some edge-case records may have been stored with
 *   empty strings or mismatched branchIds.
 *
 * This script:
 *   1. Finds classes whose branchId does not match any existing Branch.
 *   2. For each school, picks the first active branch as the fallback.
 *   3. Updates the class and all related denormalized tables.
 *
 * Usage:
 *   npx ts-node scripts/cleanup-class-branchid.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Scanning classes with invalid branchId...\n');

  // 1. Find classes with branchId that does not exist in Branch table
  const invalidClasses = await prisma.$queryRaw<
    Array<{ id: string; name: string; schoolId: string; branchId: string }>
  >`
    SELECT c.id, c.name, c."schoolId", c."branchId"
    FROM "classes" c
    LEFT JOIN "branches" b ON c."branchId" = b.id
    WHERE b.id IS NULL
  `;

  if (invalidClasses.length === 0) {
    console.log('✅ No invalid branchId records found.');
    return;
  }

  console.log(`⚠️  Found ${invalidClasses.length} class(es) with invalid branchId:\n`);
  for (const cls of invalidClasses) {
    console.log(`   - ${cls.name} (id=${cls.id}, branchId=${cls.branchId})`);
  }

  // 2. For each affected school, find the fallback branch (first active one)
  const affectedSchoolIds = [...new Set(invalidClasses.map((c) => c.schoolId))];
  const fallbackBranches = await prisma.branch.findMany({
    where: {
      schoolId: { in: affectedSchoolIds },
      isActive: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const fallbackMap = new Map<string, string>();
  for (const schoolId of affectedSchoolIds) {
    const fb = fallbackBranches.find((b) => b.schoolId === schoolId);
    if (fb) {
      fallbackMap.set(schoolId, fb.id);
    }
  }

  // 3. Update each invalid class and related denormalized tables
  let updated = 0;
  for (const cls of invalidClasses) {
    const fallbackBranchId = fallbackMap.get(cls.schoolId);
    if (!fallbackBranchId) {
      console.warn(`   ⚠️  No active branch found for school ${cls.schoolId}, skipping class ${cls.id}`);
      continue;
    }

    await prisma.$transaction([
      prisma.class.update({
        where: { id: cls.id },
        data: { branchId: fallbackBranchId },
      }),
      prisma.attendance.updateMany({
        where: { classId: cls.id },
        data: { branchId: fallbackBranchId },
      }),
      prisma.grade.updateMany({
        where: { classId: cls.id },
        data: { branchId: fallbackBranchId },
      }),
      prisma.schedule.updateMany({
        where: { classId: cls.id },
        data: { branchId: fallbackBranchId },
      }),
      prisma.exam.updateMany({
        where: { classId: cls.id },
        data: { branchId: fallbackBranchId },
      }),
      prisma.homework.updateMany({
        where: { classId: cls.id },
        data: { branchId: fallbackBranchId },
      }),
    ]);

    console.log(`   ✅ ${cls.name} → branchId updated to ${fallbackBranchId}`);
    updated++;
  }

  console.log(`\n🎉 Cleanup complete. ${updated} class(es) fixed.`);
}

main()
  .catch((e) => {
    console.error('❌ Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
