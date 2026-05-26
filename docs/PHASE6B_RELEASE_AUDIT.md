# Phase 6B Release Audit

**Date:** 2026-05-21
**Scope:** Enterprise Layer (Export Package, In-App Help UX, Operational UX Polish)
**Status:** ✅ PASSED — 1 minor bug fixed in audit

---

## 1. Build & Test Baseline

| Check | Result | Notes |
|-------|--------|-------|
| Frontend `next build` | ✅ Pass | Clean compile, all routes generated |
| Frontend Vitest | ✅ 44/44 pass | `setup-validator.test.ts` + `utils.test.ts` |
| Backend `tsc --noEmit` | ✅ Pass | No type errors |
| Backend export tests | ✅ 5/5 pass | `export.controller.spec.ts` |
| Pre-existing failures | ⚠️ 22 failures | `grades.service.spec.ts` (DI) — unchanged since before Phase 6 |

**Build artifacts:** all 8 priority pages compile without errors.

---

## 2. /dashboard/export-center

### 2.1 Create Export
- **Modal** opens with entity selector, format selector (CSV/XLSX/JSON), and conditional filters.
- **Entity-aware filters** verified: `branchId`, `dateFrom`/`dateTo`, `status`, `weekType` render only for applicable entities.
- **Submit** calls `exportCenterApi.createExport()` with correct DTO shape.
- **Post-create** `onCreated()` refreshes history list and closes modal.

### 2.2 Filter History
- **Status filter** dropdown filters by `queued/processing/completed/failed/cancelled`.
- **Entity filter** dropdown covers all 14 entity labels.
- **Date range filter** `dateFrom` → `dateTo` filters `createdAt` client-side.
- **Clear filters** button resets all filters and updates the count badge.
- **Result count** displays `filtered / total` correctly.

### 2.3 Detail Drawer
- **Row click** opens `ExportJobDetail` Sheet with full job metadata.
- **Sheet content** shows: status badge, progress bar, error message (if failed), ID with CopyButton, format, created/completed dates, creator ID.

### 2.4 Retry Failed Export
- **Retry button** visible only for `failed` status.
- **Action** calls `exportCenterApi.retryExport(job)` with `{entity, format, branchId}`.
- **Post-retry** `onRetry()` refreshes the list.
- **Toast** confirms "Eksport qayta ishga tushirildi".

### 2.5 Download Completed Export
- **Download** visible only for `completed` jobs with `fileUrl`.
- **Action** opens `window.open(url, '_blank')` to backend `/exports/:id/download`.

### 2.6 RBAC Visibility
- **Route permissions:** `director`, `vice_principal`, `branch_admin`, `accountant`, `teacher`, `class_teacher`.
- **Navigation:** listed in `DIRECTOR_NAV`, `VICE_PRINCIPAL_NAV`, `BRANCH_ADMIN_NAV`, `ACCOUNTANT_NAV` under Analitika.
- **Command palette:** entry present with correct `roles` filter.

### 🐛 Bug Found & Fixed
**File:** `apps/frontend/src/app/(dashboard)/dashboard/export-center/page.tsx`
**Issue:** Stats cards used `data?.data.filter(...).length ?? 0` which throws if `data` is `undefined` during initial load (`undefined.filter` is not a function).
**Fix:** Changed to `(data?.data ?? []).filter(...).length` for all three computed stats.

---

## 3. Help System

### 3.1 HelpDrawer Opens with Button
- **Floating button** (`HelpButton`) renders on 11 configured pages.
- **Click** opens drawer with contextual article auto-detected from `PAGE_ARTICLES[pathname]`.

### 3.2 Keyboard Shortcut
- **`Cmd/Ctrl + Shift + ?`** toggles drawer open/close.
- **Handler** in `help-provider.tsx` checks `e.metaKey || e.ctrlKey` for cross-platform support.

### 3.3 Search
- **Input** filters articles by `title`, `content`, and `faq.q`/`faq.a` in real time.
- **Clear button** (×) resets query.
- **Empty state** shows "Maqolalar topilmadi" with search icon when no matches.

### 3.4 Category Tabs
- **Tabs** render dynamically from unique categories in `content.articles`.
- **Labels** mapped via `CATEGORY_LABELS`: `ops→Operatsiya`, `setup→Sozlash`, `education→Ta'lim`, `finance→Moliya`, `reports→Hisobotlar`.
- **Active state** highlights selected tab; "Barchasi" resets filter.
- **Article list** badges show category color-coded pills.

### 3.5 Recently Viewed
- **Persistence** via `localStorage` key `xedu-help-recent` (max 5).
- **Update** on every `setCurrentArticle(id)` call.
- **Display** shown only when no search/category filter is active.
- **Order** most-recent-first.

### 3.6 Contextual Pages
| Page | Article ID | Verified |
|------|-----------|----------|
| `/dashboard/ops` | `ops-command-center` | ✅ |
| `/dashboard/setup` | `setup-wizard` | ✅ |
| `/dashboard/schedule` | `timetable` | ✅ |
| `/dashboard/teaching-loads` | `teaching-loads` | ✅ |
| `/dashboard/teacher-substitutions` | `substitutions` | ✅ |
| `/dashboard/export-center` | `export-center` | ✅ |
| `/dashboard/reports/workload` | `workload-dashboard` | ✅ |
| `/dashboard/leave-requests` | `leave-requests` | ✅ |
| `/dashboard/users` | `user-rbac` | ✅ |
| `/dashboard/analytics/timetable` | `timetable-analytics` | ✅ |

---

## 4. Bulk Actions

### 4.1 teaching-loads
- **Selection** checkbox column with select-all header.
- **Actions:** Tasdiqlash (bulk approve), Arxivlash (bulk archive).
- **RBAC:** `isManager` guard hides `BulkActionBar` and checkboxes for non-managers.
- **Query invalidation** and selection clear after action.

### 4.2 teacher-substitutions
- **Selection** via `OpTable` `selectable` prop.
- **Actions:** Tasdiqlash, Qo'llash, Bekor qilish.
- **Status-aware disabling:**
  - Tasdiqlash disabled unless all selected are `proposed`.
  - Qo'llash disabled unless all selected are `approved`.
  - Bekor qilish disabled unless all selected are `proposed` or `approved`.

### 4.3 leave-requests
- **Selection** via `OpTable` `selectable` prop.
- **Actions:** Tasdiqlash, Rad etish.
- **RBAC:** `canReview` guard hides `BulkActionBar` for non-reviewers.
- **Status-aware disabling:** disabled unless at least one selected item has `status === 'pending'`.
- **Scope:** only pending requests are acted on; already-approved/rejected items in selection are silently skipped.

### 4.4 users
- **Selection** checkbox column with select-all header.
- **Actions:** Faollashtirish (bulk restore), Bloklash (bulk block).
- **Status-aware disabling:**
  - Faollashtirish disabled unless selection contains inactive users.
  - Bloklash disabled unless selection contains active users.
- **Query invalidation** and selection clear after action.

---

## 5. Loading / Error States

### 5.1 loading.tsx Coverage
All 8 priority pages have `loading.tsx`:
- `/dashboard/ops` — `PageSkeleton statsCount={4}`
- `/dashboard/setup` — Custom skeleton with stepper + form layout
- `/dashboard/export-center` — `PageSkeleton statsCount={4}`
- `/dashboard/teaching-loads` — `PageSkeleton statsCount={2}`
- `/dashboard/teacher-substitutions` — `PageSkeleton statsCount={3}`
- `/dashboard/analytics/timetable` — `PageSkeleton statsCount={4}`
- `/dashboard/reports/workload` — `PageSkeleton statsCount={3}`
- `/dashboard/schedule` — Custom skeleton with day tabs + time slots

### 5.2 error.tsx Coverage
All 8 priority pages have localized `error.tsx` with Uzbek messages:
- Consistent layout: `AlertTriangle` icon, page-specific title, "Qayta urinib ko'ring" description, error digest, Qayta yuklash + Dashboard buttons.

### 5.3 Raw Spinner/Text Removal
- **`ops/page.tsx`**: Replaced raw spinner div with `PageSkeleton`.
- **`setup/page.tsx`**: Replaced raw `Loader2` spinner with `PageSkeleton`.
- **`teaching-loads/page.tsx`**: Replaced inline `Yuklanmoqda...` text with `TableSkeleton`.
- **Remaining `animate-spin` usages** are inside mutation buttons (correct UX for action feedback, not page loading).

---

## 6. Print CSS

**File:** `apps/frontend/src/app/globals.css` (appended `@media print`)

### Verified Behavior
- **Hidden:** sidebar (`xedu-material-sidebar`), header (`xedu-material-header`), sticky bars (`xedu-sticky-executive`), buttons, drawers, tooltips, bulk action bars.
- **Preserved:** cards flatten to bordered boxes, tables get solid borders, links show URLs in parentheses.
- **Break rules:** `break-inside: avoid` on cards, tables, images; `break-after: avoid` on headings.

### Target Pages
- `/dashboard/schedule`
- `/dashboard/export-center`
- `/dashboard/reports/workload`
- `/dashboard/analytics/timetable`

---

## 7. Navigation

### 7.1 Export Center Visibility
- **Sidebar:** visible to `director`, `vice_principal`, `branch_admin`, `accountant`.
- **Route permissions:** additionally allow `teacher`, `class_teacher` (direct URL access).
- **Command palette:** `Eksport markazi` entry with `ROUTE_PERMISSIONS['/dashboard/export-center']` roles filter.

### 7.2 Help Buttons
- **No runtime errors** from `HelpButton` on any page.
- **`HelpProvider`** wraps entire `(dashboard)` layout.
- **`HelpDrawer`** rendered once at layout level.

### 7.3 Command Palette
- Export center entry validated in `src/components/command-palette.tsx`.

---

## 8. Files Modified During Audit

| File | Change |
|------|--------|
| `apps/frontend/src/app/(dashboard)/dashboard/export-center/page.tsx` | Fixed `data?.data.filter` null-safety bug; added detail drawer state |
| `apps/frontend/src/app/(dashboard)/dashboard/teaching-loads/page.tsx` | Replaced `Yuklanmoqda...` with `TableSkeleton`; imported `loading-skeletons` |
| `apps/frontend/src/app/(dashboard)/dashboard/setup/page.tsx` | Replaced raw spinner with `PageSkeleton`; imported `loading-skeletons` |
| `apps/frontend/src/app/(dashboard)/dashboard/users/page.tsx` | Removed `w-10` class from checkbox `TH`/`TD` (padding conflict) |
| `apps/frontend/src/app/globals.css` | Added `@media print` styles |

---

## 9. Sign-off

- [x] Frontend build clean
- [x] Frontend tests passing (44/44)
- [x] Backend type-check clean
- [x] Backend export tests passing (5/5)
- [x] All 8 priority pages have `loading.tsx` + `error.tsx`
- [x] No raw loading text/spinners on priority pages
- [x] Bulk actions work on 4 pages with status-aware disabling
- [x] Help system search, categories, recent articles functional
- [x] Export center create/filter/detail/retry/download verified
- [x] Print CSS covers sidebar/header/buttons
- [x] Navigation RBAC consistent

**Phase 6B is ready for release.**
