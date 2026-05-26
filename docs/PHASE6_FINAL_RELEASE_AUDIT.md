# Phase 6 Final Release Audit

**Date:** 2026-05-21
**Scope:** Phase 6A (Enterprise Foundation) + Phase 6B (Export Package, Help UX, Operational Polish)
**Status:** ✅ PASSED — 1 broken route fixed during audit

---

## 1. Build & Test Baseline

| Check | Result | Notes |
|-------|--------|-------|
| Frontend `next build` | ✅ Pass | Clean compile, 80+ routes generated |
| Frontend Vitest | ✅ 44/44 pass | `setup-validator` (9) + `utils` (35) |
| Backend `tsc --noEmit` | ✅ Pass | No type errors |
| Backend relevant tests | ✅ 412/434 pass | Export (5/5), schedule, teaching-load, class, room, period, user tests green |
| Pre-existing failures | ⚠️ 22 failures | `grades.service.spec.ts` DI issues — unchanged since before Phase 6 |

---

## 2. Manager Journey

**Path:** Login → `/dashboard/ops` → readiness → setup → schedule → export → help

### 2.1 Login → Ops
- `ROLE_HOME` maps `director`/`vice_principal`/`branch_admin`/`accountant` → `/dashboard`.
- Ops sidebar entry visible to `director`, `vice_principal`, `branch_admin`, `accountant`.
- Route guard in `ops/page.tsx` redirects unauthorized roles to `/dashboard`.

### 2.2 Readiness Score
- `ReadinessScoreCard` fetches readiness data via `opsCommandCenterApi.getReadiness()`.
- Displays score %, progress bar, expandable checklist with `not_started`/`in_progress`/`ready`/`operational` states.
- Recalculate button refreshes score via mutation.

### 2.3 Setup Link
- `QuickActionsBar` contains "Tayyorlikni tekshirish" → `/dashboard/setup` for `director`/`vice_principal`/`branch_admin`.
- `ReadinessScoreCard` checklist items are display-only (no direct links); setup access is via Quick Actions or sidebar.

### 2.4 Setup Wizard
- 7 steps: Maktab & Filial → Dars davrlari → Xonalar → Sinflar → Fanlar & Yuklamalar → Generatsiya → Tekshirish & Nashr.
- `SetupStepper` shows progress; completed steps clickable; next step accessible.
- `ReadinessSidebar` shows live validation status per step.
- Completion screen offers links to `/dashboard/schedule` and `/dashboard/ops`.

### 2.5 Schedule
- Empty state: "Dars davrlari sozlanmagan" with CTA to `/dashboard/setup`.
- `StudentScheduleView` shows read-only weekly schedule with class selector and "Bugun" highlight.
- Staff sees full `ScheduleWorkspace` with drag-drop editor.

### 2.6 Export Center
- Accessible from sidebar (Analitika group) for Director, VP, Branch Admin, Accountant.
- Command palette entry present.
- Create → filter → history → detail drawer → download/retry flow verified.

### 2.7 Help
- Floating `HelpButton` visible on ops, setup, schedule, export-center pages.
- Contextual articles auto-detected per page.

---

## 3. New School Journey

**Path:** Zero data → `/dashboard/setup` → periods → rooms → classes → teaching loads → generate → publish

### 3.1 Zero Data Entry
- New school starts with empty database.
- Director/VP/Branch Admin sees `Maktab sozlash` in sidebar.
- `/dashboard/ops` readiness score shows low % with required checklist items.

### 3.2 Step 1: Maktab & Filial
- `StepSchoolBranch` validates branch creation.
- Backend `onboardingStep` persisted via `systemConfigApi`.

### 3.3 Step 2: Dars Davrlari
- `StepPeriods` creates bell schedule (dars davrlari).
- Required for schedule generation.

### 3.4 Step 3: Xonalar
- `StepRooms` creates rooms.
- Validated by setup validator.

### 3.5 Step 4: Sinflar
- `StepClasses` creates classes.
- Required for teaching loads and schedule.

### 3.6 Step 5: Fanlar & O'qituvchi Yuklamalari
- `StepTeachingLoads` creates teaching loads.
- Required for schedule generation.

### 3.7 Step 6: Jadval Generatsiya
- `StepGenerate` triggers schedule generation.
- Validates prerequisites (periods, rooms, classes, teaching loads).

### 3.8 Step 7: Tekshirish & Nashr
- `StepPublish` publishes schedule.
- Sets `onboardingCompleted = true`.
- Completion screen links to schedule and ops.

### 3.9 Empty State Chain
- `/dashboard/schedule` shows empty state if no periods → CTA to setup.
- `/dashboard/teaching-loads` shows empty state if no classes/subjects/teachers → CTA to setup.
- All empty states use `StandardEmptyState` with icon, title, description, and primary/secondary actions.

---

## 4. Enterprise Export Journey

**Path:** Create export → job history → detail drawer → download → retry failed

### 4.1 Create Export
- `ExportCreateModal` with 14 entities, 3 formats (CSV/XLSX/JSON).
- Entity-aware conditional filters: `branchId`, `dateFrom`/`dateTo`, `status`, `weekType`.
- Submit calls `POST /exports` with filters.
- Toast confirmation on success; list refreshes.

### 4.2 Job History
- `ExportHistoryTable` with status badges, progress bars, format icons.
- Client-side filters: status, entity, date range.
- Filter count badge and clear button.
- Result count: `filtered / total`.

### 4.3 Detail Drawer
- `ExportJobDetail` Sheet shows: status badge, progress bar, error message (if failed), ID with CopyButton, format, created/completed dates, creator ID.

### 4.4 Download
- Available only for `completed` jobs with `fileUrl`.
- Opens `window.open(url, '_blank')` to backend download endpoint.

### 4.5 Retry Failed
- Available only for `failed` jobs.
- Calls `retryExport(job)` which POSTs `/exports` with `{entity, format, branchId}`.
- Toast confirmation; list refreshes.

### 4.6 RBAC
- `ROUTE_PERMISSIONS['/dashboard/export-center']` allows: `director`, `vice_principal`, `branch_admin`, `accountant`, `teacher`, `class_teacher`.
- Sidebar shows to Director, VP, Branch Admin, Accountant.
- Teachers/class_teachers can access via direct URL or command palette.

---

## 5. Help Journey

### 5.1 Contextual Help
- `HelpButton` floating button visible on 11 pages.
- Auto-detects article from `PAGE_ARTICLES[pathname]` mapping.
- Verified contextual articles for ops, setup, schedule, teaching-loads, teacher-substitutions, payroll, attendance, leave-requests, analytics, timetable-analytics, workload-dashboard, export-center, users-rbac.

### 5.2 Search
- Real-time search across article `title`, `content`, and `faq.q`/`faq.a`.
- Clear button (×) resets query.
- Empty state: "Maqolalar topilmadi" with search icon.

### 5.3 Category Filter
- Dynamic tabs from unique categories in `content.articles`.
- Labels: `ops→Operatsiya`, `setup→Sozlash`, `education→Ta'lim`, `finance→Moliya`, `reports→Hisobotlar`.
- Color-coded badges on article list items.

### 5.4 Recently Viewed
- Persisted to `localStorage` key `xedu-help-recent` (max 5).
- Updates on every article open.
- Hidden when search or category filter is active.

### 5.5 Keyboard Shortcut
- `Cmd/Ctrl + Shift + ?` toggles drawer.
- Cross-platform: checks `e.metaKey || e.ctrlKey`.
- `e.preventDefault()` prevents browser default.

---

## 6. Role Matrix

| Feature | Director | VP | Branch Admin | Accountant | Teacher | Class Teacher | Student | Parent |
|---------|----------|-----|--------------|------------|---------|---------------|---------|--------|
| **Ops** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Setup Wizard** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Schedule (full)** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Schedule (read-only)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Teaching Loads** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Substitutions** | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Leave Requests** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Export Center** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Payroll** | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Finance** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Users** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Reports** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Workload** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Timetable Analytics** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Help System** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Bulk Actions** | ✅ | ✅ | ✅* | ❌ | ✅* | ✅* | ❌ | ❌ |

*Branch Admin bulk actions depend on page-level RBAC. Teachers/Class Teachers have bulk actions on teaching-loads and teacher-substitutions where applicable.

---

## 7. Navigation Audit

### 7.1 Sidebar
- **All nav hrefs have `page.tsx`:** ✅ Verified via script — 0 missing.
- **All nav hrefs have `ROUTE_PERMISSIONS`:** ✅ Verified via script — 0 missing.
- **No duplicate entries** within a single role's nav.

### 7.2 Command Palette
- **All 40 NAV_ITEMS have `page.tsx`:** ✅ Verified — 0 missing.
- **All NAV_ITEMS have `ROUTE_PERMISSIONS`:** ✅ Verified — 0 missing.
- **Export center** entry present with correct roles filter.

### 7.3 Education Routes
- `/dashboard/education` is a tabbed container (classes/schedule/calendar/subjects) accessible via command palette.
- Not in sidebar nav to avoid duplication with individual route entries.
- No confusing overlap — sidebar shows granular routes; command palette shows both granular and container.

### 🐛 Bug Found & Fixed
**File:** `apps/frontend/src/config/permissions.ts`
**Issue:** `/dashboard/kpi/metrics` had no corresponding `page.tsx` (only `/dashboard/kpi/metrics/new` exists).
**Fix:** Changed permission key to `/dashboard/kpi/metrics/new` with same roles.

---

## 8. UX Consistency

### 8.1 Empty States
- `StandardEmptyState` used on: schedule, teaching-loads, teacher-substitutions, leave-requests, users, analytics/timetable, reports/workload, export-center.
- `EmptyState` (dashboard variant) used on: ops-alerts-panel.
- All empty states have: icon, title, description, and at least one CTA action.

### 8.2 Loading States
- **Page-level:** All 8 priority pages have `loading.tsx` using `PageSkeleton` or custom skeleton.
- **Client-level:** Inline `Skeleton` components used for React Query refetching (schedule, teaching-loads, ops panels, analytics).
- **No raw text/spinners** remain on priority pages ("Yuklanmoqda..." and raw spinners were replaced in 6B.3).

### 8.3 Error Boundaries
- **8 page-level `error.tsx`** files with Uzbek messages, digest display, Qayta yuklash + Dashboard buttons.
- **Section-level** `error.tsx` at `app/(dashboard)/dashboard/error.tsx` catches deeper errors.
- **All messages localized:** "... yuklanmadi", "Qayta urinib ko'ring".

### 8.4 Print CSS
- `@media print` in `globals.css` hides: sidebar, header, sticky bars, buttons, drawers, tooltips.
- Cards flatten to bordered boxes; tables get solid borders; links show URLs.
- `break-inside: avoid` on cards, tables, images.

### 8.5 Bulk Actions
- **teaching-loads:** Bulk approve + archive. `isManager` guard.
- **teacher-substitutions:** Bulk approve + apply + cancel. Status-aware disabling (`proposed`/`approved`).
- **leave-requests:** Bulk approve + reject. `canReview` guard + pending-only disabling.
- **users:** Bulk activate + block. Status-aware disabling (`isActive`).
- All bulk actions: invalidate queries, clear selection, show toast confirmation.

---

## 9. Files Modified During Audit

| File | Change |
|------|--------|
| `apps/frontend/src/config/permissions.ts` | Fixed broken route `/dashboard/kpi/metrics` → `/dashboard/kpi/metrics/new` |

---

## 10. Sign-off

- [x] Frontend build clean
- [x] Frontend tests passing (44/44)
- [x] Backend type-check clean
- [x] Backend relevant tests passing (412/434; 22 pre-existing grades failures)
- [x] Manager journey verified (ops → readiness → setup → schedule → export → help)
- [x] New school journey verified (7-step wizard with prerequisite chain)
- [x] Enterprise export journey verified (create → history → detail → download → retry)
- [x] Help journey verified (contextual, search, categories, recent, keyboard shortcut)
- [x] Role matrix consistent across permissions, navigation, command palette
- [x] All nav hrefs have page.tsx and ROUTE_PERMISSIONS
- [x] All command palette hrefs have page.tsx and ROUTE_PERMISSIONS
- [x] No duplicate/confusing education routes
- [x] Empty states consistent across all audited pages
- [x] Loading states present at page and component level
- [x] Error boundaries localized and actionable
- [x] Print CSS hides chrome, preserves content
- [x] Bulk actions have status-aware disabling and RBAC guards

**Phase 6 (6A + 6B) is ready for release.**
