# Phase 9B.1 — Async Job UX Alignment Report

**Date:** 2026-05-21  
**Baseline:** Phase 9A (async export + solver queues implemented)  
**Status:** ✅ Complete

---

## Goal

Align frontend UX with the new async Export and Solver queue behavior introduced in Phase 9A. No queue architecture changes. No new product features. Only UI state handling for `queued/processing/completed/failed/cancelled`.

---

## 1. Export Center Async Polling

### Problem
`POST /exports` now returns immediately with `status: queued`. The frontend was closing the modal and showing "Eksport yaratildi" without indicating the job was async. Users had to manually refresh to see completion.

### Changes

| File | Change |
|------|--------|
| `export-center/page.tsx` | Added `refetchInterval` to `useQuery`: polls every 4s when any job is `queued` or `processing` |
| `export-create-modal.tsx` | Toast message updated: "Eksport navbatga qo‘yildi... Tayyor bo‘lganda yuklab olish mumkin" |
| `export-history-table.tsx` | Already supported all 5 statuses (no changes needed) |
| `export-job-detail.tsx` | Already supported all 5 statuses (no changes needed) |

### Behavior
- User clicks "Eksport qilish" → modal closes immediately → toast says "navbatga qo‘yildi"
- Table auto-refreshes every 4s while active jobs exist
- Status badges update live: `Navbatda` → `Jarayonda` → `Tayyor` / `Xatolik`
- Download enabled only when `status === 'completed'`
- Retry shown only for `failed`
- Cancel shown for `queued` and `processing`

---

## 2. Solver Async Polling

### Problem
`POST /schedule/advanced-generate` was changed in Phase 9A to enqueue and return a `SolverRun` with `status: running`. There was **no frontend UI** for the advanced solver at all — the existing `GeneratorDialog` only called the sync `/schedule/generate` (greedy) endpoint.

### Backend Support Added

| File | Change |
|------|--------|
| `advanced-solver.service.ts` | `persistRun()` now stores `proposedSlots`, `failures`, and `diagnostics` in `metadata` |
| `advanced-solver.service.ts` | Added `getRun(id)` method with RBAC |
| `schedule.controller.ts` | Added `GET /schedule/solver-runs/:id` endpoint |

### Frontend Changes

| File | Change |
|------|--------|
| `schedule-generator.ts` | Added `advancedGenerate()`, `getSolverRun()`, `listSolverRuns()` APIs + `SolverRun` types |
| `generator-dialog.tsx` | **Major refactor**: added strategy selector (Greedy vs Hybrid), running step, polling, failed state |

### New Generator Dialog Flow

```
Config step
  └─ Strategy: [Greedy] [Hybrid]
     └─ Greedy → sync POST /schedule/generate → Result step (existing)
     └─ Hybrid → async POST /schedule/advanced-generate → Running step
         └─ Poll GET /schedule/solver-runs/:id every 3s
             ├─ completed → reconstruct report from metadata → Result step
             ├─ failed/cancelled → show error message
             └─ timeout after 120s → show timeout error
```

### UX Details
- **Strategy selector**: Two cards — "Greedy" (fast, simple) and "Hybrid" (optimized, backtracking)
- **Running step**: Animated spinner + "Jadval tayyorlanmoqda..." + progress bar + run ID
- **Failed step**: Red XCircle + error message from metadata + "Qayta urinish" button
- **Result step**: Same as before (summary, proposed slots, failure breakdown)
- **Duplicate spam prevention**: Generate button disabled while `isPending` or `step === 'running'`
- **Stale polling cleanup**: `useEffect` + `onModuleDestroy` pattern clears interval on unmount/close

---

## 3. Backward Compatibility

- **Greedy strategy**: Uses existing sync `/schedule/generate` — zero behavior change
- **Hybrid strategy**: New async flow — no breaking changes for existing buttons
- **Export center**: Existing manual refresh button still works; polling is additive

---

## 4. Error Handling

| Scenario | Handling |
|----------|----------|
| Network error during export poll | `useQuery` retry logic + manual refresh fallback |
| Network error during solver poll | Continues retrying until 120s timeout, then shows error |
| Solver timeout | 120s client-side timeout guard + server-side 30s solver cap |
| Failed job | Error message shown from `run.metadata.error` |
| Cancelled job | Treated as failure, shows cancellation message |
| Stale polling | `clearInterval` on unmount and dialog close |

---

## 5. Tests

### New Test Files

| File | Cases |
|------|-------|
| `export-history-table.test.tsx` | 5 tests: queued, processing, completed, failed (with error), cancelled states |
| `generator-dialog.test.tsx` | 4 tests: duplicate click prevention, running state, failed state, completed result |

### Test Infrastructure
- Added `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `@vitejs/plugin-react`
- Updated `vitest.config.ts`: React plugin + path alias `@` + `jsdom` environment

### Test Results

| Suite | Before | After | Delta |
|-------|--------|-------|-------|
| Frontend unit tests | 64 passed | **73 passed** | **+9** |
| Backend unit tests | 487 passed | **487 passed** | **0** (no regressions) |

---

## 6. Build Verification

| Check | Status |
|-------|--------|
| Frontend `pnpm build` | ✅ Clean |
| Frontend `pnpm test` | ✅ 73/73 pass |
| Backend `pnpm type-check` | ✅ Clean |
| Backend `pnpm test` | ✅ 487/497 pass (10 pre-existing) |

---

## Files Changed

### Backend
- `apps/backend/src/modules/schedule/advanced-solver.service.ts`
- `apps/backend/src/modules/schedule/schedule.controller.ts`

### Frontend
- `apps/frontend/src/lib/api/schedule-generator.ts`
- `apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/generator-dialog.tsx`
- `apps/frontend/src/app/(dashboard)/dashboard/export-center/page.tsx`
- `apps/frontend/src/app/(dashboard)/dashboard/export-center/_components/export-create-modal.tsx`
- `apps/frontend/vitest.config.ts`

### Tests (new)
- `apps/frontend/src/app/(dashboard)/dashboard/export-center/_components/export-history-table.test.tsx`
- `apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/generator-dialog.test.tsx`

---

## Sign-off

| Criterion | Status |
|-----------|--------|
| Export async polling works | ✅ |
| Solver async polling works | ✅ |
| All 5 job statuses visible | ✅ |
| Download disabled until completed | ✅ |
| Retry shown for failed | ✅ |
| Cancel shown for queued/processing | ✅ |
| Duplicate generate prevented | ✅ |
| Stale polling cleaned up | ✅ |
| Backward compatible (greedy sync) | ✅ |
| Tests added and passing | ✅ |
| Build clean | ✅ |
