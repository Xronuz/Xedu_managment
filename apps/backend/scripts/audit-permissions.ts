#!/usr/bin/env ts-node
/**
 * audit-permissions.ts
 *
 * Scans all NestJS controller files and verifies every route handler
 * has an explicit authorization decorator, either at class level or method level:
 *   - @Roles(...)          → role-based access
 *   - @AnyAuthenticated()  → any logged-in user
 *   - @Public()            → unauthenticated (intentional)
 *   - @UseGuards(...)      → custom guard (assumed intentional)
 *
 * Controllers in EXCLUDED_CONTROLLERS are skipped entirely.
 *
 * Exits with code 1 if any route is missing authorization.
 * Run: npx ts-node scripts/audit-permissions.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '../src');
const EXCLUDED_CONTROLLERS = [
  'auth.controller.ts',
  'health.controller.ts',
  'super-admin.controller.ts',
];

const AUTH_DECORATORS = new Set(['Roles', 'AnyAuthenticated', 'Public', 'UseGuards']);

interface Violation {
  file: string;
  line: number;
  method: string;
  classDecorators: string[];
  methodDecorators: string[];
}

const violations: Violation[] = [];

function findControllerFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findControllerFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractDecoratorName(line: string): string | null {
  const m = line.match(/^\s*@(\w+)/);
  return m ? m[1] : null;
}

function isMethodDefinition(line: string): { name: string; isAsync: boolean } | null {
  // Match: async foo( or foo(
  const m = line.match(/^\s*(?:async\s+)?(\w+)\s*\(/);
  if (!m) return null;
  const name = m[1];
  if (name === 'constructor') return null;
  // Skip control flow statements that look like method calls
  if (['if', 'switch', 'while', 'for', 'catch'].includes(name)) return null;
  return { name, isAsync: line.trim().startsWith('async') };
}

function scanFile(filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const baseName = path.basename(filePath);
  if (EXCLUDED_CONTROLLERS.includes(baseName)) return;

  let classDecorators: string[] = [];
  let insideClass = false;
  let braceDepth = 0;
  let pendingMethodDecorators: string[] = [];
  let inMethod = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Count braces for scope tracking
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    // Detect class start
    if (!insideClass && /\bclass\s+\w+Controller\b/.test(line)) {
      insideClass = true;
      braceDepth = 0; // will count the class opening brace below
    }

    if (!insideClass) {
      // Before class: decorators belong to class
      const dec = extractDecoratorName(line);
      if (dec) classDecorators.push(dec);
      braceDepth += openBraces - closeBraces;
      continue;
    }

    // Inside class body
    braceDepth += openBraces - closeBraces;

    // Detect decorators right before a method definition
    const dec = extractDecoratorName(line);
    if (dec && !inMethod) {
      pendingMethodDecorators.push(dec);
      continue;
    }

    // Detect method definition
    const method = isMethodDefinition(line);
    if (method && !inMethod) {
      const classHasAuth = classDecorators.some((d) => AUTH_DECORATORS.has(d));
      const methodHasAuth = pendingMethodDecorators.some((d) => AUTH_DECORATORS.has(d));

      if (!classHasAuth && !methodHasAuth) {
        violations.push({
          file: path.relative(SRC_DIR, filePath),
          line: i + 1,
          method: method.name,
          classDecorators: [...classDecorators],
          methodDecorators: [...pendingMethodDecorators],
        });
      }

      inMethod = true;
      pendingMethodDecorators = [];
      continue;
    }

    // Property assignments, getters, setters can reset pending decorators
    if (/^\s*(?:readonly\s+)?\w+\s*[:=!?]/.test(line) && !inMethod) {
      pendingMethodDecorators = [];
    }

    // When we return to class body depth, method ended
    if (inMethod && braceDepth <= 1) {
      inMethod = false;
    }

    // Class ended
    if (braceDepth <= 0 && insideClass) {
      insideClass = false;
      classDecorators = [];
      inMethod = false;
      pendingMethodDecorators = [];
    }
  }
}

function main() {
  const files = findControllerFiles(SRC_DIR);
  for (const file of files) {
    scanFile(file);
  }

  console.log(`\n🔍 Scanned ${files.length} controller files\n`);

  if (violations.length === 0) {
    console.log('✅ All routes have explicit authorization decorators (class or method level).\n');
    process.exit(0);
  }

  console.log(`❌ Found ${violations.length} route(s) missing authorization:\n`);
  for (const v of violations) {
    const cls = v.classDecorators.length ? `[${v.classDecorators.join(', ')}]` : 'none';
    const mtd = v.methodDecorators.length ? `[${v.methodDecorators.join(', ')}]` : 'none';
    console.log(`  ${v.file}:${v.line}  ${v.method}()`);
    console.log(`           class decorators: ${cls}  |  method decorators: ${mtd}`);
  }
  console.log();
  process.exit(1);
}

main();
