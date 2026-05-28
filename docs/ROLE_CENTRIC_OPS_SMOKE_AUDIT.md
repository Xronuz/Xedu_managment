# Role-Centric Ops Smoke Audit

**Version:** 1.0  
**Date:** 2026-05-28  
**Scope:** Verify role-specific Ops dashboard behavior after ownership refactor.

---

## 1. Test Execution Results

| Test Suite | Result | Details |
|-----------|--------|---------|
| Frontend Build | ✅ PASS | All 80+ routes compiled, 0 errors |
| Frontend Tests | ✅ PASS | 75/75 Vitest tests passed |
| Backend Ops Tests | ✅ PASS | 30/30 Jest tests passed (ops-command-center + ops-dashboard + health) |
| Backend Type-Check | ✅ PASS | `tsc --noEmit` clean |

---

## 2. Role Access Matrix

### `/dashboard/ops` — Frontend Route Guard

| Role | ROUTE_PERMISSIONS | Navigation | Ops Page | Verdict |
|------|-------------------|-----------|----------|---------|
| **Director** | ✅ Allowed | ✅ `DIRECTOR_NAV` | ✅ Renders | PASS |
| **VP** | ✅ Allowed | ✅ `VICE_PRINCIPAL_NAV` | ✅ Renders | PASS |
| **Branch Admin** | ✅ Allowed | ✅ `BRANCH_ADMIN_NAV` | ✅ Renders | PASS |
| **Accountant** | ✅ Allowed | ✅ `ACCOUNTANT_NAV` | ✅ Renders | PASS |
| **Teacher** | ❌ Denied | ❌ `TEACHER_NAV` | ❌ Redirects to `/dashboard` | PASS |
| **Class Teacher** | ❌ Denied | ❌ `TEACHER_NAV` | ❌ Redirects to `/dashboard` | PASS |
| **Student** | ❌ Denied | ❌ `STUDENT_NAV` | ❌ Redirects to `/dashboard` | PASS |
| **Parent** | ❌ Denied | ❌ `PARENT_NAV` | ❌ Redirects to `/dashboard` | PASS |
| **Librarian** | ❌ Denied | ❌ `LIBRARIAN_NAV` | ❌ Redirects to `/dashboard` | PASS |
| **Super Admin** | ❌ Denied | ❌ `SUPER_ADMIN_NAV` | ❌ Redirects to `/dashboard` | PASS |

### `/api/ops/*` — Backend RBAC

| Endpoint | Director | VP | Branch Admin | Accountant | Teacher | Super Admin |
|----------|----------|-----|-------------|------------|---------|-------------|
| `GET /ops/dashboard` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `GET /ops/workflows` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `GET /ops/friction` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `GET /ops/today-summary` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `GET /ops/alerts` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `GET /schools/:id/readiness` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `GET /schools/:id/readiness/role` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

> **Note:** Before this audit, `SUPER_ADMIN` was allowed on `ops-dashboard.controller.ts` endpoints but blocked by frontend `ROUTE_PERMISSIONS` and `ops-command-center.controller.ts`. This inconsistency was **fixed** — `SUPER_ADMIN` removed from `ops-dashboard.controller.ts` `@Roles()`.

> **Note:** Before this audit, `TEACHER` and `CLASS_TEACHER` were allowed on `GET /ops/today-summary`. This inconsistency was **fixed** — removed from `@Roles()`.

---

## 3. Readiness Ownership Verification

### Readiness Checklist (8 Items)

| # | Task | Primary Owner | Secondary Owner | Visibility | Weight | Required |
|---|------|---------------|-----------------|------------|--------|----------|
| 1 | Maktab profili to'liq | **director** | vice_principal | director, vp, branch_admin | 10 | ✅ |
| 2 | Kamida 1 ta filial | **director** | vice_principal | director, vp, branch_admin | 10 | ✅ |
| 3 | Dars soatlari sozlangan | **branch_admin** | vice_principal | branch_admin, vp, director | 15 | ✅ |
| 4 | Kamida 1 ta xona | **branch_admin** | vice_principal | branch_admin, vp, director | 15 | ✅ |
| 5 | Kamida 1 ta sinf | **branch_admin** | vice_principal | branch_admin, vp, director | 15 | ✅ |
| 6 | Kamida 1 ta fan | **vice_principal** | branch_admin | vp, branch_admin, director | 15 | ✅ |
| 7 | Dars yuklari biriktirilgan | **vice_principal** | branch_admin | vp, branch_admin, director | 15 | ✅ |
| 8 | Jadval nashr etilgan | **vice_principal** | branch_admin | vp, branch_admin, director, teacher, class_teacher | 10 | ❌ |

### Director Setup Burden Reduction

| Before Refactor | After Refactor | Status |
|-----------------|----------------|--------|
| Director owned ALL 8 items | Director owns only 2 (schoolProfile, branches) | ✅ Reduced |
| Director execution-heavy | Director strategic-only | ✅ Reduced |

### Role-Based Readiness View (`GET /schools/:id/readiness/role`)

| Section | Description | Verified |
|---------|-------------|----------|
| `myActions` | Items where `primaryOwner === user.role` and not completed | ✅ |
| `delegatedActions` | Items where `secondaryOwner === user.role` and not completed | ✅ |
| `informationalBlockers` | Items visible to role but owned by someone else | ✅ |

---

## 4. Alert Actionability Verification

Every alert now has the required fields:

| Field | Present | Example |
|-------|---------|---------|
| `owner` | ✅ | `'branch_admin'` |
| `actionCta` | ✅ | `'Dars soatlarini sozlash'` |
| `route` | ✅ | `'/dashboard/periods'` |
| `severity` | ✅ | `'critical'` / `'warning'` / `'info'` |
| `resolutionState` | ✅ | `'open'` |

### Alert Ownership by Role

| Alert | Owner | Role Filtered |
|-------|-------|---------------|
| Dars soatlari sozlanmagan | **branch_admin** | ✅ Only ops roles see it |
| Xonalar ro'yxati bo'sh | **branch_admin** | ✅ |
| Sinflar yaratilmagan | **branch_admin** | ✅ |
| Fanlar kiritilmagan | **vice_principal** | ✅ |
| Dars yuklari biriktirilmagan | **vice_principal** | ✅ |
| Jadval nashr etilmagan | **vice_principal** | ✅ |
| O'rinbosarsiz o'qituvchi | **branch_admin** | ✅ |
| Ko'p sondagi ta'til so'rovi | **vice_principal** | ✅ |
| Ish haqi hisoblanmagan | **accountant** | ✅ Accountant sees it, VP does not |
| Davomat yozuvi yetishmayapti | **accountant** | ✅ Accountant sees it, VP does not |

---

## 5. VP Academic Execution Ownership

| Task | Owner | Verified |
|------|-------|----------|
| Fanlar (subjects) | **VP** ✅ | `primaryOwner: vice_principal` |
| Dars yuklari (teachingLoads) | **VP** ✅ | `primaryOwner: vice_principal` |
| Jadval nashri (publishedTimetable) | **VP** ✅ | `primaryOwner: vice_principal` |
| Ta'til so'rovlari (pendingLeaves) | **VP** ✅ | Alert owner: vice_principal |
| Baholash nazorati (draftGrades) | **VP** ✅ | Friction signal owner: vice_principal |

---

## 6. Branch Admin Branch Setup Ownership

| Task | Owner | Verified |
|------|-------|----------|
| Dars soatlari (periods) | **Branch Admin** ✅ | `primaryOwner: branch_admin` |
| Xonalar (rooms) | **Branch Admin** ✅ | `primaryOwner: branch_admin` |
| Sinflar (classes) | **Branch Admin** ✅ | `primaryOwner: branch_admin` |
| O'rinbosar (absentWithoutSub) | **Branch Admin** ✅ | Alert owner: branch_admin |

---

## 7. Accountant Finance/Payroll Ownership

| Task | Owner | Verified |
|------|-------|----------|
| Ish haqi (payroll:missing) | **Accountant** ✅ | Alert owner: accountant |
| Davomat yetishmasligi (payroll:missingAttendance) | **Accountant** ✅ | Alert owner: accountant |
| Eksport xatolari (failedExports) | **Accountant** ✅ | Friction signal owner: accountant |
| QuickActionsBar — Moliya | **Accountant** ✅ | `roles: [ACCOUNTANT]` |
| QuickActionsBar — To'lovlar | **Accountant** ✅ | `roles: [ACCOUNTANT]` |
| QuickActionsBar — Tariflar | **Accountant** ✅ | `roles: [ACCOUNTANT]` |
| QuickActionsBar — Hisobotlar | **Accountant** ✅ | `roles: [ACCOUNTANT]` |

---

## 8. Event Calendar Regression Verification

| Check | Status | Evidence |
|-------|--------|----------|
| Page exists | ✅ | `/dashboard/academic-calendar/page.tsx` (346 lines) |
| Route permission | ✅ | `ROUTE_PERMISSIONS['/dashboard/academic-calendar']` allows director, vp, teacher, class_teacher, branch_admin |
| Sidebar navigation — Director | ✅ | `DIRECTOR_NAV` line 65 |
| Sidebar navigation — VP | ✅ | `VICE_PRINCIPAL_NAV` line 220 |
| Sidebar navigation — Branch Admin | ✅ | `BRANCH_ADMIN_NAV` line 151 |
| Command palette | ✅ | `components/command-palette.tsx` line 99 |
| RBAC (create/delete) | ✅ | `canManage = ['director', 'vice_principal'].includes(role)` |

---

## 9. Link Verification

| Component | Links Checked | Status |
|-----------|---------------|--------|
| **QuickActionsBar** | `/dashboard/schedule`, `/dashboard/teacher-substitutions`, `/dashboard/attendance`, `/dashboard/payroll`, `/dashboard/setup`, `/dashboard/finance`, `/dashboard/payments`, `/dashboard/fee-structures`, `/dashboard/reports`, `/dashboard/export-center` | ✅ All routes exist in `ROUTE_PERMISSIONS` |
| **OpsAlertsPanel** | `/dashboard/periods`, `/dashboard/rooms`, `/dashboard/classes`, `/dashboard/subjects`, `/dashboard/teaching-loads`, `/dashboard/schedule`, `/dashboard/teacher-substitutions`, `/dashboard/leave-requests`, `/dashboard/payroll`, `/dashboard/teacher-attendance` | ✅ All routes exist in `ROUTE_PERMISSIONS` |
| **ReadinessScoreCard** | Links rendered from API `link` field — no hardcoded broken links | ✅ |

---

## 10. Bugs Found & Fixed

### Bug #1 — SUPER_ADMIN Role Mismatch (FIXED)

| Layer | Before | After |
|-------|--------|-------|
| Frontend `ROUTE_PERMISSIONS` | ❌ Blocked super_admin | ❌ Blocked super_admin (no change) |
| `ops-command-center.controller.ts` | ❌ Blocked super_admin | ❌ Blocked super_admin (no change) |
| `ops-dashboard.controller.ts` | ✅ Allowed super_admin | ❌ **Fixed: removed super_admin** |

**Fix:** Removed `UserRole.SUPER_ADMIN` from `@Roles()` on all 3 `ops-dashboard.controller.ts` endpoints.

### Bug #2 — TEACHER/CLASS_TEACHER on today-summary (FIXED)

| Endpoint | Before | After |
|----------|--------|-------|
| `GET /ops/today-summary` | Allowed TEACHER, CLASS_TEACHER | **Fixed: removed** |
| `GET /ops/alerts` | Blocked TEACHER, CLASS_TEACHER | No change |
| `GET /ops/dashboard` | Blocked TEACHER, CLASS_TEACHER | No change |

**Fix:** Removed `UserRole.TEACHER` and `UserRole.CLASS_TEACHER` from `today-summary` `@Roles()` decorator.

### Cosmetic — Duplicate OWNER_LABELS (NOT FIXED)

Both `ops-alerts-panel.tsx` and `readiness-score-card.tsx` define identical `OWNER_LABELS` objects. This is a DRY violation but does not affect functionality. Deferred to future cleanup.

### Architectural — Controller Missing `path` (NOT FIXED)

`ops-command-center.controller.ts` uses `@Controller({ version: '1' })` without a `path` property. This is an architectural inconsistency but all routes resolve correctly. Deferred to future refactor.

---

## 11. Summary

| Category | Count |
|----------|-------|
| Critical Bugs Found | 0 |
| Moderate Bugs Found | 0 |
| Low Bugs Fixed | 2 |
| Cosmetic / Architectural (deferred) | 2 |
| Frontend Build | ✅ Pass |
| Frontend Tests | ✅ 75/75 |
| Backend Ops Tests | ✅ 30/30 |
| Backend Type-Check | ✅ Clean |

**Verdict:** Role-centric ops refactor is **production-ready**. All role scoping, ownership assignment, and actionability requirements are met. Director overload is reduced. VP, Branch Admin, and Accountant each own their domain. Disallowed roles (Teacher, Student, Parent, Librarian, Super Admin) are properly blocked at all layers.

---

> **Last Updated:** 2026-05-28
