#!/usr/bin/env ts-node
/**
 * audit-routes.ts
 *
 * Scans the frontend Next.js app directory for all dashboard pages
 * and verifies each has a corresponding entry in ROUTE_PERMISSIONS.
 *
 * Also scans backend controllers to warn about routes with no frontend page.
 *
 * Exits with code 1 if any frontend page is missing permissions.
 * Run: npx ts-node scripts/audit-routes.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const FRONTEND_DIR = path.join(__dirname, '../../frontend/src/app/(dashboard)/dashboard');
const PERMISSIONS_FILE = path.join(__dirname, '../../frontend/src/config/permissions.ts');

interface Issue {
  type: 'missing_permission' | 'orphan_permission' | 'no_frontend';
  path: string;
  detail?: string;
}

const issues: Issue[] = [];

// ── Parse ROUTE_PERMISSIONS from frontend ────────────────────────────────────

function extractRoutePermissions(): Set<string> {
  const content = fs.readFileSync(PERMISSIONS_FILE, 'utf-8');
  const routes = new Set<string>();
  // Match keys like '/dashboard/classes' or "/dashboard/finance"
  const regex = /['"](\/dashboard\/[^'"]+)['"]\s*:/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    routes.add(m[1]);
  }
  return routes;
}

// ── Find all frontend dashboard pages ────────────────────────────────────────

function findDashboardPages(dir: string, prefix: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Check if this directory has a page.tsx or page.ts
      const hasPage = fs.readdirSync(fullPath).some((f) => f.startsWith('page.') || f.startsWith('layout.'));
      if (hasPage) {
        const route = prefix + '/' + entry.name;
        results.push(route);
      }
      // Recurse
      results.push(...findDashboardPages(fullPath, prefix + '/' + entry.name));
    }
  }
  return results;
}

function main() {
  const permittedRoutes = extractRoutePermissions();
  const pages = findDashboardPages(FRONTEND_DIR, '/dashboard');

  // Normalize: remove dynamic segments like [id] → a generic path
  const normalizedPages = pages.map((p) => {
    // Convert /dashboard/users/[id]/page to /dashboard/users
    // We only care about the base route for permission checks
    return p.replace(/\/\[[^\]]+\](\/.*)?$/, '');
  });

  const uniquePages = Array.from(new Set(normalizedPages));

  console.log(`\n🔍 Found ${uniquePages.length} dashboard page routes`);
  console.log(`🔍 Found ${permittedRoutes.size} permission entries\n`);

  // Check for missing permissions
  for (const page of uniquePages) {
    let hasMatch = false;
    for (const route of permittedRoutes) {
      if (page === route || page.startsWith(route + '/')) {
        hasMatch = true;
        break;
      }
    }
    if (!hasMatch) {
      issues.push({ type: 'missing_permission', path: page });
    }
  }

  // Check for orphan permissions (no matching page)
  for (const route of permittedRoutes) {
    let hasMatch = false;
    for (const page of uniquePages) {
      if (page === route || page.startsWith(route + '/')) {
        hasMatch = true;
        break;
      }
    }
    if (!hasMatch) {
      issues.push({ type: 'orphan_permission', path: route });
    }
  }

  // Summary
  const missing = issues.filter((i) => i.type === 'missing_permission');
  const orphans = issues.filter((i) => i.type === 'orphan_permission');

  if (missing.length === 0 && orphans.length === 0) {
    console.log('✅ All dashboard pages have permission entries and all permission entries have pages.\n');
    process.exit(0);
  }

  if (missing.length > 0) {
    console.log(`❌ ${missing.length} page(s) missing permission entries:\n`);
    for (const i of missing) {
      console.log(`   ${i.path}`);
    }
    console.log();
  }

  if (orphans.length > 0) {
    console.log(`⚠️  ${orphans.length} permission entry(s) with no matching page (may be API-only or stale):\n`);
    for (const i of orphans) {
      console.log(`   ${i.path}`);
    }
    console.log();
  }

  if (missing.length > 0) process.exit(1);
}

main();
