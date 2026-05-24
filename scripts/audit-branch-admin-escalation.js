#!/usr/bin/env node
/**
 * Audit script: Detect potential Branch Admin privilege escalation
 *
 * Checks:
 * 1. Users created by branch_admin with forbidden roles (director, vp, branch_admin, super_admin)
 * 2. Users created by branch_admin assigned to a different branch
 *
 * Usage:
 *   npx ts-node scripts/audit-branch-admin-escalation.js
 *   # or with DATABASE_URL set:
 *   DATABASE_URL=postgres://... node scripts/audit-branch-admin-escalation.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const FORBIDDEN_ROLES = ['super_admin', 'director', 'vice_principal', 'branch_admin'];

async function main() {
  console.log('\n🔍 Branch Admin Privilege Escalation Audit\n');

  // 1. Forbidden roles created by branch_admin
  const forbiddenRoleUsers = await prisma.$queryRaw`
    SELECT
      u.id,
      u.email,
      u.role AS "userRole",
      u."branchId" AS "userBranch",
      u."schoolId",
      u."createdAt",
      creator.id AS "creatorId",
      creator.email AS "creatorEmail",
      creator.role AS "creatorRole",
      creator."branchId" AS "creatorBranch"
    FROM "User" u
    JOIN "AuditLog" al ON al."entityId" = u.id AND al."entity" = 'User' AND al.action = 'create'
    JOIN "User" creator ON creator.id = al."userId"
    WHERE creator.role = 'branch_admin'
      AND u.role = ANY(${FORBIDDEN_ROLES}::text[])
    ORDER BY u."createdAt" DESC
  `;

  console.log(`❌ Forbidden roles created by Branch Admin: ${forbiddenRoleUsers.length} record(s)`);
  if (forbiddenRoleUsers.length > 0) {
    console.table(forbiddenRoleUsers);
  }

  // 2. Cross-branch creations by branch_admin
  const crossBranchUsers = await prisma.$queryRaw`
    SELECT
      u.id,
      u.email,
      u.role AS "userRole",
      u."branchId" AS "userBranch",
      u."schoolId",
      u."createdAt",
      creator.id AS "creatorId",
      creator.email AS "creatorEmail",
      creator.role AS "creatorRole",
      creator."branchId" AS "creatorBranch"
    FROM "User" u
    JOIN "AuditLog" al ON al."entityId" = u.id AND al."entity" = 'User' AND al.action = 'create'
    JOIN "User" creator ON creator.id = al."userId"
    WHERE creator.role = 'branch_admin'
      AND u."branchId" <> creator."branchId"
    ORDER BY u."createdAt" DESC
  `;

  console.log(`\n❌ Cross-branch users created by Branch Admin: ${crossBranchUsers.length} record(s)`);
  if (crossBranchUsers.length > 0) {
    console.table(crossBranchUsers);
  }

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   - Forbidden role creations: ${forbiddenRoleUsers.length}`);
  console.log(`   - Cross-branch creations:   ${crossBranchUsers.length}`);
  console.log(`   - Total suspicious:         ${forbiddenRoleUsers.length + crossBranchUsers.length}`);

  if (forbiddenRoleUsers.length === 0 && crossBranchUsers.length === 0) {
    console.log('\n✅ No suspicious records found.');
  } else {
    console.log('\n⚠️  Review the records above MANUALLY. Do NOT auto-delete.');
    console.log('   Recommended actions:');
    console.log('   - Verify if these users were created intentionally by a Director/VP');
    console.log('   - If confirmed unauthorized, block the created users and notify security team');
    console.log('   - Review the creating branch_admin account for compromise');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
