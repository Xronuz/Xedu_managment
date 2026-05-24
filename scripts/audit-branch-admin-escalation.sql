-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT: Branch Admin privilege escalation investigation
-- Run against production PostgreSQL database
-- DO NOT DELETE — report only for manual review
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Users created by branch_admin with forbidden (equal-or-higher) roles
SELECT
  u.id,
  u.email,
  u.role AS user_role,
  u.branchId AS user_branch,
  u.schoolId,
  u.createdAt,
  creator.id AS creator_id,
  creator.email AS creator_email,
  creator.role AS creator_role,
  creator.branchId AS creator_branch
FROM "User" u
JOIN "AuditLog" al ON al."entityId" = u.id AND al."entity" = 'User' AND al.action = 'create'
JOIN "User" creator ON creator.id = al."userId"
WHERE creator.role = 'branch_admin'
  AND u.role IN ('super_admin', 'director', 'vice_principal', 'branch_admin')
ORDER BY u."createdAt" DESC;

-- 2. Users created by branch_admin whose branchId differs from creator's branchId
SELECT
  u.id,
  u.email,
  u.role AS user_role,
  u.branchId AS user_branch,
  u.schoolId,
  u.createdAt,
  creator.id AS creator_id,
  creator.email AS creator_email,
  creator.role AS creator_role,
  creator.branchId AS creator_branch
FROM "User" u
JOIN "AuditLog" al ON al."entityId" = u.id AND al."entity" = 'User' AND al.action = 'create'
JOIN "User" creator ON creator.id = al."userId"
WHERE creator.role = 'branch_admin'
  AND u."branchId" <> creator."branchId"
ORDER BY u."createdAt" DESC;

-- 3. Summary counts
SELECT
  'forbidden_role_created_by_branch_admin' AS check_name,
  COUNT(*) AS count
FROM "User" u
JOIN "AuditLog" al ON al."entityId" = u.id AND al."entity" = 'User' AND al.action = 'create'
JOIN "User" creator ON creator.id = al."userId"
WHERE creator.role = 'branch_admin'
  AND u.role IN ('super_admin', 'director', 'vice_principal', 'branch_admin')
UNION ALL
SELECT
  'cross_branch_created_by_branch_admin' AS check_name,
  COUNT(*) AS count
FROM "User" u
JOIN "AuditLog" al ON al."entityId" = u.id AND al."entity" = 'User' AND al.action = 'create'
JOIN "User" creator ON creator.id = al."userId"
WHERE creator.role = 'branch_admin'
  AND u."branchId" <> creator."branchId";
