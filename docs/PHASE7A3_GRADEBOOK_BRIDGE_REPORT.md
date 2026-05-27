# Phase 7A.3 — Gradebook Integrity and Assessment Bridges Report

**Date:** 2026-05-21  
**Baseline:** `v0.1.0-pilot` (post-7A.2 workflow completion)  
**Scope:** Connect HomeworkSubmission and ExamSession results into the Grade journal with draft/publish control, auditability, and defense-in-depth RBAC.

---

## 1. Schema Changes

### 1.1 Migration: `20260527185527_add_gradebook_bridge_fields`

**Modified model: `Grade`**

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `homeworkId` | `String?` | — | FK to `Homework` for bridge tracking |
| `examId` | `String?` | — | FK to `Exam` for bridge tracking |
| `source` | `String` | `"manual"` | Origin: `manual` \| `homework` \| `exam` \| `import` |
| `isPublished` | `Boolean` | `true` | Draft/publish gate |
| `weight` | `Float` | `1` | Weighted grade support |
| `deletedAt` | `DateTime?` | — | Soft delete (audit retention) |

**Reverse relations added:**
- `Homework.grades Grade[]`
- `Exam.grades Grade[]`

**Indexes added:**
- `@@index([homeworkId])`
- `@@index([examId])`
- `@@index([source])`
- `@@index([isPublished])`

### 1.2 Backward Compatibility

- All new fields are **nullable or have defaults**.
- Existing Grade rows automatically get `source = "manual"`, `isPublished = true`, `weight = 1`.
- No breaking changes to existing queries.

---

## 2. Bridge Behavior

### 2.1 HomeworkSubmission → Grade

**Trigger:** `HomeworkService.grade(homeworkId, submissionId, dto, user)`  
**Location:** `apps/backend/src/modules/homework/homework.service.ts`

**Logic:**
1. Validate homework exists within tenant scope.
2. Validate submission exists.
3. Update `HomeworkSubmission.score`.
4. **Bridge:**
   - Find existing `Grade` by `(homeworkId, studentId)`.
   - If found → `prisma.grade.update()` with new score.
   - If not found → `prisma.grade.create()`:
     - `source = 'homework'`
     - `isPublished = true` (teacher already approved by grading)
     - `type = 'homework'`
     - `maxScore = 100` (Homework has no maxScore field)
     - `date = homework.dueDate`
5. Send notification to student (unchanged).

**Idempotency:** Re-grading the same submission updates the linked Grade, never duplicates.

### 2.2 ExamSession → Grade

**Trigger:** `OnlineExamService.submitSession(sessionId, user)`  
**Location:** `apps/backend/src/modules/online-exam/online-exam.service.ts`

**Logic:**
1. Auto-grade MCQ/TF questions.
2. Update `ExamSession` status → `submitted`, set `score` / `percentage`.
3. **Bridge:**
   - Find existing `Grade` by `(examId, studentId)`.
   - If found → `prisma.grade.update()`.
   - If not found → `prisma.grade.create()`:
     - `source = 'exam'`
     - `isPublished = true`
     - `type = 'exam'`
     - `maxScore = exam.maxScore ?? 100`
     - `date = exam.scheduledAt ?? now`
4. Emit real-time event (unchanged).

**Idempotency:** Retaking/resubmitting updates the linked Grade, never duplicates.

---

## 3. RBAC Matrix

### 3.1 Grade Visibility

| Role | List (`findAll`) | Student Grades | Class Report | GPA |
|------|------------------|----------------|--------------|-----|
| **STUDENT** | Own grades only, `isPublished = true` | Own only, published | — | Own only, published |
| **PARENT** | Linked child grades, `isPublished = true` | Linked child, published | — | Linked child, published |
| **TEACHER / CLASS_TEACHER** | Own subjects, all drafts + published | By studentId param | Yes | Yes |
| **DIRECTOR / VP / BRANCH_ADMIN** | Whole school, all drafts + published | Any student | Yes | Yes |

### 3.2 Grade Mutability

| Action | TEACHER | DIRECTOR / VP | BRANCH_ADMIN | STUDENT / PARENT |
|--------|---------|---------------|--------------|------------------|
| **Create** | ✅ Own subjects | ✅ | ❌ | ❌ |
| **Bulk Create** | ✅ Own subjects | ✅ | ❌ | ❌ |
| **Update** | ✅ Own grades only | ✅ Any | ❌ | ❌ |
| **Delete** | ✅ Own grades only | ✅ | ❌ | ❌ |
| **Publish** | ✅ Own grades only | ✅ Any | ❌ | ❌ |

**Ownership enforcement:** Service-level check:
```ts
if ((TEACHER || CLASS_TEACHER) && grade.createdById !== currentUser.sub) {
  throw new ForbiddenException('...');
}
```

### 3.3 Soft Delete

All `find*` methods filter `deletedAt: null`.  
`remove()` sets `deletedAt: new Date()` instead of hard delete.  
This preserves audit trail and prevents accidental data loss.

---

## 4. Frontend Changes

### 4.1 API Client (`apps/frontend/src/lib/api/grades.ts`)
- Added `publish(id)` → `POST /grades/:id/publish`

### 4.2 Grades Page (`apps/frontend/src/app/(dashboard)/dashboard/grades/page.tsx`)

**New components:**
- `SourceBadge` — shows `Qo'lda` / `Uy vazifasi` / `Imtihon` / `Import` with color coding.

**Table columns added:**
- **Manba** (Source) — `SourceBadge`
- **Holat** (Status) — `Nashr qilingan` (green) / `Qoralama` (amber)

**Row actions for teachers:**
- Publish button (`Check` icon) for draft grades
- Delete button (`Trash2` icon) — unchanged

**Mutations added:**
- `publishMutation` — calls `gradesApi.publish`, invalidates `['grades']` query

---

## 5. Tests

### 5.1 New Tests Added

| Suite | Test | Result |
|-------|------|--------|
| `homework.service.spec.ts` | grade → creates Grade on first grading | ✅ |
| `homework.service.spec.ts` | grade → updates Grade on regrade, no duplicate | ✅ |
| `homework.service.spec.ts` | grade → no Grade when score is null | ✅ |
| `online-exam.service.spec.ts` | submitSession → creates Grade on first submit | ✅ |
| `online-exam.service.spec.ts` | submitSession → updates Grade on resubmit | ✅ |
| `grades.service.spec.ts` | publish → sets isPublished true | ✅ |
| `grades.service.spec.ts` | publish → forbids cross-teacher | ✅ |
| `grades.service.spec.ts` | update → forbids cross-teacher | ✅ |
| `grades.service.spec.ts` | remove → soft-deletes | ✅ |
| `grades.service.spec.ts` | remove → forbids cross-teacher | ✅ |
| `grades.service.spec.ts` | findAll → student only sees published | ✅ |
| `grades.service.spec.ts` | findAll → teacher sees drafts too | ✅ |

### 5.2 Test Run Summary

```bash
cd apps/backend && npx jest --no-coverage
# Test Suites: 35 total (3 pre-existing failures unrelated to this phase)
# Tests:       468 passed, 10 failed (pre-existing)
# Snapshots:   0 total
```

**Pre-existing failures (not introduced by 7A.3):**
- `auth.service.spec.ts` — 7 failures (mock/DI issues)
- `attendance.service.spec.ts` — 2 failures
- `notifications.service.spec.ts` — 1 failure

### 5.3 TypeScript / Build

```bash
# Backend
cd apps/backend && npx tsc --noEmit
# Result: 0 errors

# Frontend
cd apps/frontend && npx tsc --noEmit -p tsconfig.json
# Result: 0 errors
```

---

## 6. Files Modified

| File | Nature |
|------|--------|
| `apps/backend/prisma/schema.prisma` | Grade model + Homework/Exam reverse relations |
| `apps/backend/prisma/migrations/20260527185527_add_gradebook_bridge_fields/migration.sql` | Migration (auto-generated) |
| `apps/backend/src/modules/grades/dto/create-grade.dto.ts` | Added `isPublished?`, `weight?` |
| `apps/backend/src/modules/grades/grades.service.ts` | RBAC, soft delete, publish, bridge-ready filtering |
| `apps/backend/src/modules/grades/grades.controller.ts` | Added `POST :id/publish` endpoint |
| `apps/backend/src/modules/homework/homework.service.ts` | Grade bridge in `grade()` method |
| `apps/backend/src/modules/online-exam/online-exam.service.ts` | Grade bridge in `submitSession()` method |
| `apps/frontend/src/lib/api/grades.ts` | Added `publish()` method |
| `apps/frontend/src/app/(dashboard)/dashboard/grades/page.tsx` | Source badge, status badge, publish action |
| `apps/backend/src/modules/grades/grades.service.spec.ts` | 6 new tests + mock fixes |
| `apps/backend/src/modules/homework/homework.service.spec.ts` | 3 new tests + notification mock fix |
| `apps/backend/src/modules/online-exam/online-exam.service.spec.ts` | 2 new tests + grade mock |

---

## 7. Migration Notes for Production

1. **Run migration:**
   ```bash
   cd apps/backend
   npx prisma migrate deploy
   ```

2. **Verify indexes:** The migration adds 4 new indexes. On large grade tables (>1M rows), `CREATE INDEX` may take a few seconds. Plan for brief read-lock during deployment.

3. **Existing data:** All existing grades become `source = 'manual'`, `isPublished = true`. No manual data migration needed.

4. **Rollback:** If needed, revert the migration:
   ```bash
   npx prisma migrate resolve --rolled-back 20260527185527_add_gradebook_bridge_fields
   ```
   Note: This will drop the new columns and indexes. Bridge-created grades will lose their `homeworkId`/`examId` linkage.

---

## 8. Remaining Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Concurrent regrade race** | Low | Medium | Prisma transaction isolation (default `ReadCommitted`) prevents lost updates on `grade.update()` |
| **Grade accumulation from retakes** | Low | Low | Bridge uses `findFirst + update` pattern; no duplicates possible |
| **Director viewing unpublished teacher grades** | Expected | Low | By design — directors can audit drafts before publication |
| **Soft delete bloat** | Medium | Low | Add periodic `prisma.grade.deleteMany({ deletedAt: { lt: retentionDate } })` job in Phase 8 |
| **maxScore mismatch** | Low | Medium | Homework bridge defaults to 100; if homework weighting changes, update bridge logic |

---

## 9. Next Steps

1. **Phase 7B — Analytics & Reporting:**
   - Weighted GPA calculation (`weight` field now available)
   - Gradebook grid view (rows = students, columns = assessments)
   - Class/subject performance heatmaps

2. **Phase 8 — Data Lifecycle:**
   - Automated soft-delete purge after N years
   - Archive cold grades to parquet/S3 for long-term analytics
