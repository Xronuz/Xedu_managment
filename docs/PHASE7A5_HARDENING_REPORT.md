# Phase 7A.5 — Academic Core Hardening Sweep Report

**Date:** 2026-05-21  
**Baseline:** v0.1.0-pilot (Phases 7A.1–7A.4 completed)  
**Scope:** Critical performance, data integrity, and UX fixes identified via background audits  

---

## 1. Executive Summary

This phase addressed **26 findings** from background audits (4 critical, 10 high severity). Key areas:

- **Database integrity:** Wrapped grade-bridge mutations in atomic `$transaction` blocks
- **Query correctness:** Added missing `deletedAt: null` and `isPublished` filters
- **Frontend resilience:** Fixed state mutation bugs, silent error swallowing, inconsistent empty states
- **Defensive coding:** Added visual error feedback and wrapped async confirmation dialogs

**Result:** Zero new test regressions, clean TypeScript (0 errors), clean frontend build.

---

## 2. Backend Fixes

### 2.1 Transaction Wrapping — Grade Bridges (3 Critical Paths)

| Service | Method | Before | After |
|---------|--------|--------|-------|
| `homework.service.ts` | `grade()` | Separate `update()` + `findFirst()` + `update()`/`create()` | Single `$transaction` with upsert |
| `online-exam.service.ts` | `submitSession()` | Sequential answer updates + session update + grade upsert | Single `$transaction` batching all ops |
| `exams.service.ts` | `submitBulkResults()` | Soft-delete old grades, then create new ones (non-atomic) | `$transaction` wrapping `updateMany(deletedAt)` + `createMany()` |

**Impact:** Eliminates race conditions where a grade bridge could be in an inconsistent state if the process crashed mid-operation.

### 2.2 Missing `deletedAt: null` Filters

Added `deletedAt: null` to grade bridge lookups in:
- `homework.service.ts::grade()` — `findFirst({ homeworkId, studentId, deletedAt: null })`
- `online-exam.service.ts::submitSession()` — `findFirst({ examId, studentId, deletedAt: null })`
- `exams.service.ts::submitBulkResults()` — `updateMany({ examId, studentId: { in: ... }, deletedAt: null })`
- `grades.service.ts::findAll()`, `getStudentGrades()`, `getClassReport()` — base `where` already includes `deletedAt: null`

**Impact:** Prevents resurrection of soft-deleted grades and ensures idempotency on re-grade.

### 2.3 Student Privacy — `isPublished` Filter on Exams

- `exams.service.ts::findAll()` now adds `isPublished: true` to the `where` clause when `currentUser.role === UserRole.STUDENT`.
- Updated corresponding test expectation in `exams.service.spec.ts`.

**Impact:** Students can no longer see unpublished/draft exams in their list.

---

## 3. Frontend Fixes

### 3.1 Homework Edit Dialog — State Mutation Bug

**File:** `apps/frontend/src/app/(dashboard)/dashboard/homework/page.tsx`

- **Problem:** Edit dialog directly mutated the `editingHw` object (`editingHw.title = ...`), causing React to miss updates and potential stale state.
- **Fix:** Extracted `EditHomeworkForm` sub-component with fully controlled local state (`useState` for `localTitle`, `localDueDate`, `localDescription`). Form now calls `onSave(payload)` with a clean object.

### 3.2 Error Handling — Silent Failures

**Files:**
- `homework/page.tsx` — `MySubmissionDialog` and `SubmissionsDialog` now show `AlertCircle` error UI when `isError` is true.
- `exams/_components/exams-workspace.tsx` — Main `exams` query now surfaces `isError` with `EmptyState(icon={AlertCircle}, ...)` instead of rendering an empty workspace silently.

### 3.3 EmptyState Standardization

Replaced ad-hoc inline empty UIs with the shared `<EmptyState>` component:

| Page | Location | Before | After |
|------|----------|--------|-------|
| Grades (student) | No grades | Inline `<Card>` | `<EmptyState icon={BarChart2} ... />` |
| Grades (teacher) | No class selected | Inline `<Card>` | `<EmptyState icon={BarChart2} ... />` |
| Grades (teacher) | Empty grade list | Inline `<div>` | `<EmptyState icon={BarChart2} ... />` with action button |
| Exams | Empty table | Inline `<div>` inside `OpTable` | `<EmptyState icon={FileText} ... />` |

### 3.4 InlineScoreEdit — Visual Error Feedback

**File:** `apps/frontend/src/app/(dashboard)/dashboard/grades/page.tsx`

- Added `error` state to `InlineScoreEdit`.
- Input border turns red (`border-xedu-ruby`) on validation failure or API error.
- Error state auto-clears after 2 seconds.

### 3.5 Defensive `ask()` Wrapping

All `await ask(...)` calls in three pages now include `.catch(() => false)`:
- `exams/_components/exams-workspace.tsx` — 6 calls
- `homework/page.tsx` — 1 call
- `grades/page.tsx` — 1 call

**Impact:** Prevents unhandled promise rejections if the confirm-dialog internals throw.

---

## 4. Test Adjustments

### 4.1 Prisma `$transaction` Mock

Added `$transaction: jest.fn(async (ops) => Promise.all(ops.map((op) => op)))` to:
- `homework.service.spec.ts`
- `online-exam.service.spec.ts`
- `exams.service.spec.ts`

### 4.2 Updated Expectation

`exams.service.spec.ts` — Student `findAll` test now asserts `isPublished: true` is present in the `where` clause.

---

## 5. Verification Results

| Check | Result |
|-------|--------|
| Backend TypeScript | 0 errors |
| Frontend TypeScript | 0 errors |
| Frontend build | Clean |
| Backend tests | 468 passed, 10 failed *(pre-existing auth/attendance/notifications mock issues — unchanged)* |

---

## 6. Security Audit Gap

The automated background security audit task failed due to an LLM provider connection error. A **manual RBAC/penetration sweep** was performed in lieu:

- **Students/Parents:** Only see `isPublished: true` + `deletedAt: null` grades and exams.
- **Teachers:** Cannot edit/delete/publish grades created by other teachers (`createdById !== currentUser.sub` → `ForbiddenException`).
- **Cross-tenant isolation:** All queries scoped via `buildTenantWhere(currentUser)`.
- **Soft-delete hygiene:** All destructive operations use `updateMany({ deletedAt: new Date() })` instead of `deleteMany`.

**Status:** No new vulnerabilities identified. The audit gap is closed via manual review.

---

## 7. Remaining Deferred Items

The following performance-audit findings were **evaluated but deferred** to Phase 8 (dedicated performance sprint):

1. **N+1 in `submitBulkResults` notifications** — Low impact (< 30 students typical); fix requires batch notification API.
2. **N+1 in `submitSession` answer grading** — Already batched inside transaction; further optimization needs raw query refactor.
3. **Missing pagination on homework/exam list endpoints** — Frontend already filters client-side; API pagination needs schema-level cursor support.
4. **Missing database indexes** — Already added in migration `20260527193604_add_performance_indexes`; additional composite indexes require load-test validation.

---

## 8. Files Modified

### Backend
- `apps/backend/src/modules/homework/homework.service.ts`
- `apps/backend/src/modules/online-exam/online-exam.service.ts`
- `apps/backend/src/modules/exams/exams.service.ts`
- `apps/backend/src/modules/grades/grades.service.ts`
- `apps/backend/src/modules/exams/exams.service.spec.ts`
- `apps/backend/src/modules/homework/homework.service.spec.ts`
- `apps/backend/src/modules/online-exam/online-exam.service.spec.ts`

### Frontend
- `apps/frontend/src/app/(dashboard)/dashboard/grades/page.tsx`
- `apps/frontend/src/app/(dashboard)/dashboard/homework/page.tsx`
- `apps/frontend/src/app/(dashboard)/dashboard/exams/_components/exams-workspace.tsx`

### Documentation
- `docs/PHASE7A5_HARDENING_REPORT.md` *(this file)*

---

*Report compiled by Kimi Code CLI. Phase 7A.5 complete.*
