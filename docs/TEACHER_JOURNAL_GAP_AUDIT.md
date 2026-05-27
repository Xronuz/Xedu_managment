# Xedu — Teacher Journal Gap Audit

**Date:** 2026-05-21  
**Commit:** `d470a1f` (v0.1.0-pilot)  
**Scope:** Grades · Exams · Homework · HomeworkSubmission · Online Exam · Teacher Daily Workflow  
**Mandate:** Brutally honest. No marketing fluff. Cite exact files.

---

## Executive Summary

| Module | Schema | Backend | Frontend | Tests | Verdict |
|--------|--------|---------|----------|-------|---------|
| **Grades** | ⚠️ Partial | ✅ Functional (bugs) | ✅ Full UI | ⚠️ 40% coverage | **Usable with fixes** |
| **Exams** | ⚠️ Stub | ✅ Functional (leaks) | ✅ Full UI | ❌ 0% coverage | **Usable with hardening** |
| **Homework** | ❌ Stub | ✅ Functional (insecure) | ⚠️ Partial UI | ❌ 0% coverage | **Unsafe for pilot** |
| **HomeworkSubmission** | ❌ Stub | ✅ Functional (gaps) | ⚠️ Partial UI | ❌ 0% coverage | **Unsafe for pilot** |
| **Online Exam** | ✅ Nearly complete | ✅ Functional (security holes) | ✅ Full UI | ❌ 0% coverage | **Usable with hardening** |

**Bottom line:** Xedu has a *surface-level* Teacher Journal. The UI looks complete. The backend endpoints exist. But the underlying data model is fragmented, disconnected, and in some cases insecure. A teacher can enter grades, create homework, and build online exams — but the system cannot reliably track *which* teacher did *what*, protect student privacy, or connect homework scores to the gradebook automatically.

**For pilot launch:** The Grades module is the strongest. Homework is the weakest (data leaks + no edit/delete). Online Exam works for MCQ/TF but has no manual grading for open-ended questions and critical RBAC gaps.

---

## 1. Schema Reality

### 1.1 Grade

**File:** `apps/backend/prisma/schema.prisma` (lines around Grade model)

```prisma
model Grade {
  id          String    @id @default(uuid())
  schoolId    String
  branchId    String
  classId     String
  studentId   String
  subjectId   String
  type        GradeType // homework | classwork | test | exam | quarterly | final
  score       Float
  maxScore    Float     @default(100)
  date        DateTime  @db.Date
  comment     String?
  createdById String?   // nullable — WHO graded this?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([schoolId, branchId])
  @@index([studentId, subjectId])
  @@index([classId, type])
  @@index([classId, date])
  @@index([studentId, date])
  @@index([schoolId, date])
}
```

| Field | Status | Issue |
|-------|--------|-------|
| `createdById` | ⚠️ Nullable | `?` means a grade can exist with NO teacher attribution. Backend service (`grades.service.ts:73`) populates it, but schema doesn't enforce it. |
| `examId` | ❌ Missing | `Grade` and `Exam` are completely disconnected. An exam result entered via `exams.service.ts:submitBulkResults` creates `Grade` rows but with NO `examId` linkage. You cannot trace a grade back to the exam that generated it. |
| `homeworkId` | ❌ Missing | Same problem with homework. `HomeworkSubmission.score` exists but there's no FK from `Grade` to `Homework`. Dual-write risk. |
| `semester` / `academicYear` | ❌ Missing | Filtering by academic period requires date-range math. No explicit period scoping. |
| `weight` / `coefficient` | ❌ Missing | No weighted average support. GPA is simple arithmetic mean. |
| `isPublished` / `isVisibleToParent` | ❌ Missing | Any grade entered is immediately visible. No draft/publish workflow. |
| `deletedAt` | ❌ Missing | Hard delete only. No soft-delete for grade corrections. |

**Verdict:** The Grade model is the *most complete* of the four, but it lacks critical relational links (`examId`, `homeworkId`) and lifecycle fields (`isPublished`, `deletedAt`). It is a **flat score log**, not a connected journal entry.

---

### 1.2 Exam

**File:** `apps/backend/prisma/schema.prisma` (comment: `// ─── Exams (Phase 2 stub) ─────────────────────────────────────────────────`)

```prisma
model Exam {
  id          String        @id @default(uuid())
  schoolId    String
  branchId    String
  classId     String
  subjectId   String
  title       String
  frequency   ExamFrequency @default(on_demand) // weekly | monthly | quarterly | final | on_demand
  maxScore    Float         @default(100)
  scheduledAt DateTime?
  duration    Int?
  isPublished Boolean       @default(false)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  questions ExamQuestion[]
  sessions  ExamSession[]

  @@index([schoolId, branchId])
  @@index([branchId])
  @@index([classId])
  @@index([subjectId])
}
```

| Field | Status | Issue |
|-------|--------|-------|
| `createdById` | ❌ Missing | No teacher attribution. Who created this exam? Unknown in schema. |
| `status` enum | ❌ Missing | Only `isPublished: boolean`. No `draft` → `ready` → `published` → `in_progress` → `completed` → `archived` lifecycle. |
| `semester` / `academicYear` | ❌ Missing | Same as Grade. |
| `roomId` / location | ❌ Missing | Physical exam location not tracked. |
| `instructions` / `description` | ❌ Missing | Only `title`. No exam instructions field. |
| `passingScore` | ❌ Missing | Frontend hardcodes 50% (`exams/[id]/page.tsx:841`). Not configurable per exam. |
| `deletedAt` | ❌ Missing | Hard delete only. |

**Verdict:** Marked as "Phase 2 stub" in the schema comment. It is **structurally a header row** for the online exam subsystem. The offline/paper-based exam workflow (create exam → enter results → publish results) is entirely bolted onto `Grade` rows with `type='exam'` and a ±3-day date heuristic (`exams.service.ts:185-239`).

---

### 1.3 Homework

**File:** `apps/backend/prisma/schema.prisma` (comment: `// ─── Homework (Phase 2 stub) ──────────────────────────────────────────────`)

```prisma
model Homework {
  id          String   @id @default(uuid())
  schoolId    String
  branchId    String
  classId     String
  subjectId   String
  title       String
  description String?
  dueDate     DateTime
  createdAt   DateTime @default(now())
  // NO updatedAt
  // NO createdById
  // NO maxScore
  // NO status
  // NO attachmentUrl
  // NO assignedDate

  submissions HomeworkSubmission[]

  @@index([schoolId, branchId])
  @@index([branchId])
  @@index([classId])
  @@index([subjectId])
}
```

| Field | Status | Issue |
|-------|--------|-------|
| `createdById` | ❌ Missing | No teacher attribution. |
| `updatedAt` | ❌ Missing | Only `createdAt`. No modification tracking. |
| `maxScore` | ❌ Missing | Homework has no maximum score. `HomeworkSubmission.score` is a free-floating Float with no upper bound context. |
| `status` | ❌ Missing | No `draft` / `published` / `closed`. Created = immediately visible. |
| `attachmentUrl` / `fileUrl` | ❌ Missing | Teachers cannot attach files to assignments. Only text `description`. |
| `assignedDate` | ❌ Missing | Only `dueDate`. When was this assigned? Unknown. |
| `semester` / `academicYear` | ❌ Missing | Same pattern. |
| `deletedAt` | ❌ Missing | Hard delete only. |

**Verdict:** The most incomplete core model. It is a **titled due-date reminder**, not a pedagogical assignment. The schema comment literally calls it a "Phase 2 stub."

---

### 1.4 HomeworkSubmission

```prisma
model HomeworkSubmission {
  id        String   @id @default(uuid())
  homeworkId String
  studentId  String
  content    String?
  fileUrl    String?
  score      Float?
  submittedAt DateTime @default(now())
  // NO status
  // NO gradedById
  // NO gradedAt
  // NO feedback
  // NO updatedAt
  // NO isLate

  @@unique([homeworkId, studentId])
}
```

| Field | Status | Issue |
|-------|--------|-------|
| `status` | ❌ Missing | No `submitted` / `late` / `graded` / `returned` lifecycle. |
| `gradedById` | ❌ Missing | Who graded this? Unknown. |
| `gradedAt` | ❌ Missing | When was it graded? Unknown. |
| `feedback` | ❌ Missing | Frontend `MySubmissionDialog` (`homework/page.tsx:140`) renders `submission.feedback`, but the schema has NO such column. **Marketing-only feature.** |
| `updatedAt` | ❌ Missing | Resubmissions overwrite in-place. No audit trail. |
| `isLate` / `latePenalty` | ❌ Missing | No late submission logic. Backend doesn't check `dueDate` on submit. |
| `maxScore` snapshot | ❌ Missing | If homework `maxScore` is ever added, old submissions won't have the context. |

**Verdict:** A **single-row state bucket**. One submission per student per homework. Resubmit = overwrite. No grading audit trail. The `@@unique` constraint prevents multiple submissions, which is architecturally limiting.

---

### 1.5 Online Exam Platform (ExamQuestion / ExamOption / ExamSession / StudentAnswer)

**Verdict:** These models are the **most complete** in the entire Journal layer. Full lifecycle (`SessionStatus` enum), proper uniqueness constraints (`@@unique([examId, studentId])`), scoring fields (`pointsEarned`, `percentage`), and media support (`mediaUrl`).

**But:** They are **completely isolated** from the rest of the journal. An online exam result lives in `ExamSession.score`, not in `Grade`. There is no automatic propagation. A teacher running the gradebook sees online exam results only if they manually enter them again as `Grade` rows.

---

### 1.6 Cross-Model Disconnects

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Exam     │────►│ ExamSession │────►│StudentAnswer│     │    Grade    │
│  (header)   │     │  (result)   │     │  (detail)   │     │ (gradebook) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
        │                                                    ▲
        │     NO FK. Manual re-entry required.               │
        └────────────────────────────────────────────────────┘

┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Homework   │────►│HomeworkSubmission│     │    Grade    │
│  (header)   │     │   (score only)   │     │ (gradebook) │
└─────────────┘     └──────────────────┘     └─────────────┘
        │                                          ▲
        │     NO FK. Manual re-entry required.     │
        └──────────────────────────────────────────┘
```

**This is the single most damaging architectural gap.** Teachers must maintain THREE separate score systems:
1. `Grade` rows for the gradebook
2. `HomeworkSubmission.score` for homework
3. `ExamSession.score` for online exams

None of them talk to each other.

---

## 2. Backend Audit

### 2.1 Grades Module

**Directory:** `apps/backend/src/modules/grades/` (5 files, 0 subdirs)

| File | Lines | Status |
|------|-------|--------|
| `grades.controller.ts` | 120 | ✅ All 9 endpoints wired and reachable |
| `grades.service.ts` | 492 | ✅ All methods implemented. 7 bugs identified. |
| `dto/create-grade.dto.ts` | 42 | ⚠️ Weak UUID validation (`@IsString()` not `@IsUUID()`) |
| `grades.module.ts` | 13 | ✅ Standard |
| `grades.service.spec.ts` | 250 | ⚠️ 10 tests, ~40% coverage |

**Endpoints:**

| # | Method | Path | Roles | Status |
|---|--------|------|-------|--------|
| 1 | GET | `/grades` | DIRECTOR, BRANCH_ADMIN, VP, TEACHER, CLASS_TEACHER, STUDENT | ✅ |
| 2 | POST | `/grades` | TEACHER, CLASS_TEACHER, VP, DIRECTOR | ✅ |
| 3 | POST | `/grades/bulk` | TEACHER, CLASS_TEACHER, VP | ✅ |
| 4 | GET | `/grades/student/:id/gpa` | TEACHER, CLASS_TEACHER, VP, DIRECTOR, BRANCH_ADMIN, STUDENT, PARENT | ✅ |
| 5 | GET | `/grades/class/:id/gpa` | TEACHER, CLASS_TEACHER, VP, DIRECTOR, BRANCH_ADMIN | ✅ |
| 6 | GET | `/grades/student/:id` | Same as #4 | ✅ |
| 7 | GET | `/grades/class/:id/report` | TEACHER, CLASS_TEACHER, VP, DIRECTOR, BRANCH_ADMIN | ✅ |
| 8 | PUT | `/grades/:id` | TEACHER, CLASS_TEACHER, DIRECTOR, VP | ✅ |
| 9 | DELETE | `/grades/:id` | TEACHER, VP | ✅ |

**Bugs Found:**

1. **Bug: `findAll` subject filter silently overwritten for teachers** (`grades.service.ts:459-468`)
   - If a teacher passes `?subjectId=math`, it's overwritten by their full subject list. The explicit filter is lost.
   - Severity: Medium

2. **Bug: `getStudentGpa` has NO Redis cache** (`grades.service.ts:375-383`)
   - `getClassGpa` caches. `getStudentGpa` does not. Inconsistent performance.
   - Severity: Low

3. **Bug: Silent failures on side effects** (`grades.service.ts:107, 112-118, 126, 314-323, 343-347`)
   - `.catch(() => {})` swallows errors from coins, notifications, and queue jobs.
   - Severity: Medium

4. **Bug: No validation that teacher teaches the class/subject** (`grades.service.ts:59-122`)
   - Any teacher can create grades for any class/subject in their school.
   - Severity: Medium

5. **Bug: `UpdateGradeDto` missing** (`grades.controller.ts:105`)
   - Controller accepts `Partial<CreateGradeDto>` directly. No dedicated DTO.
   - Severity: Low

6. **Bug: Query params lack `@ParseIntPipe()`** (`grades.controller.ts:30-31, 94-95`)
   - `?page=abc` → `NaN` → Prisma runtime error.
   - Severity: Low

7. **Bug: `GradeType` cast `as any`** (4 occurrences in `grades.service.ts`)
   - Type mismatch between `@eduplatform/types` and Prisma enum.
   - Severity: Low (runtime works)

**Test Coverage:**
- ✅ `getStudentGpa` — 3 tests
- ✅ `getClassGpa` — 2 tests
- ✅ `create` — 1 test
- ✅ `bulkCreate` — 2 tests
- ✅ `update` — 2 tests
- ✅ `remove` — 2 tests
- ❌ `findAll` — NOT tested
- ❌ `getStudentGrades` — NOT tested
- ❌ `getClassReport` — NOT tested
- ❌ Teacher scoping logic — NOT tested
- ❌ Redis cache paths — NOT tested
- ❌ Coin/notification/audit side effects — NOT tested

**Verdict:** **Functional but fragile.** Real Prisma queries, real side effects, but validation is weak and side effects fail silently.

---

### 2.2 Exams Module

**Directory:** `apps/backend/src/modules/exams/` (4 files, 0 subdirs, **0 tests**)

| File | Lines | Status |
|------|-------|--------|
| `exams.controller.ts` | 116 | ✅ 10 endpoints |
| `exams.service.ts` | 428 | ✅ Implemented, 7 critical issues |
| `dto/create-exam.dto.ts` | 78 | ⚠️ Weak validation |
| `exams.module.ts` | 10 | ✅ Standard |

**Critical Issues:**

1. **🔴 PRIVACY BUG: `GET /exams/:id/results` leaks ALL student grades** (`exams.service.ts:185-239`)
   - Returns every student's score, name, and stats. No `studentId` filter for STUDENT role.
   - A student calling this sees all classmates' results.
   - Severity: **CRITICAL**

2. **🔴 CRASH: `submitBulkResults` crashes for directors with `null` branchId** (`exams.service.ts:363, 388`)
   - `branchId: currentUser.branchId!` — non-null assertion on potentially null value.
   - Directors often have `branchId: null` in JWT.
   - Severity: **CRITICAL**

3. **🟡 DATA INTEGRITY: `update` does not recalculate `branchId` on class change** (`exams.service.ts:124-130`)
   - Moving an exam to a class in a different branch leaves `branchId` stale.
   - Severity: **HIGH**

4. **🟡 PRIVACY: `getUpcoming` ignores branch scoping** (`exams.service.ts:414-418`)
   - Uses `schoolId` only, not `buildTenantWhere`. Multi-branch users see cross-branch exams.
   - Severity: **HIGH**

5. **🟡 RBAC: `BRANCH_ADMIN` excluded from delete and bulk results** for no clear reason.
   - Severity: **MEDIUM**

6. **🟡 `publish` has no audit log** (inconsistent with create/update/delete).
   - Severity: **LOW**

7. **🟡 `submitBulkResults` never sets `createdById`** on Grade rows.
   - Severity: **MEDIUM**

**Test Coverage:** **0%** — No unit, integration, or e2e tests.

**Verdict:** **Functional but dangerous.** The privacy leak on results and the director crash are pilot-blockers.

---

### 2.3 Homework Module

**Directory:** `apps/backend/src/modules/homework/` (4 files, 0 subdirs, **0 tests**)

| File | Lines | Status |
|------|-------|--------|
| `homework.controller.ts` | 108 | ✅ 9 endpoints |
| `homework.service.ts` | 269 | ✅ Implemented, 5 critical issues |
| `dto/homework.dto.ts` | 73 | ⚠️ Weak validation |
| `homework.module.ts` | 12 | ✅ Standard |

**Critical Issues:**

1. **🔴 PRIVACY BUG: `findAll` returns ALL school homework to EVERY student** (`homework.service.ts:18-31`)
   - No role-based scoping. A student gets the entire tenant's homework list.
   - Frontend calls `homeworkApi.getAll()` with zero params.
   - Severity: **CRITICAL**

2. **🔴 PRIVACY BUG: `findOne` returns ALL student submissions to ANY caller** (`homework.service.ts:33-48`)
   - Eager-loads `submissions` with student names. Any student can see every classmate's submission.
   - Severity: **CRITICAL**

3. **🟡 SECURITY: `submit` does not verify enrollment** (`homework.service.ts:153-184`)
   - Any student can submit to any homework in the school, even if not in that class.
   - Severity: **HIGH**

4. **🟡 CRASH: `create` crashes on invalid `classId`** (`homework.service.ts:60`)
   - `cls!.branchId` throws before `NotFoundException`.
   - Severity: **MEDIUM**

5. **🟡 VALIDATION: `SubmitHomeworkDto.content` is required even with file** (`homework.dto.ts`)
   - `@IsString()` without `@IsOptional()`. Frontend allows file-only submission, which will 400.
   - Severity: **MEDIUM**

**Test Coverage:** **0%**

**Verdict:** **Insecure by default.** Two critical privacy leaks make this unsafe for any school with more than one class.

---

### 2.4 Online-Exam Module

**Directory:** `apps/backend/src/modules/online-exam/` (3 files, 0 subdirs, **0 tests**)

| File | Lines | Status |
|------|-------|--------|
| `online-exam.controller.ts` | 166 | ⚠️ 10 endpoints, 4 have NO `@Roles()` |
| `online-exam.service.ts` | 491 | ✅ Implemented, 7 issues |
| `online-exam.module.ts` | 17 | ✅ Standard |

**Critical Issues:**

1. **🔴 SECURITY: Student endpoints (start/submit/answer/result) have NO role restriction** (`online-exam.controller.ts:122, 134, 147, 159`)
   - Any authenticated user (PARENT, ACCOUNTANT, LIBRARIAN) can start an exam session.
   - `RolesGuard` returns `true` when `requiredRoles` is empty.
   - Severity: **CRITICAL**

2. **🔴 PRIVACY: `getSessionResult` leaks correct answers** (`online-exam.service.ts:464`)
   - Returns `options: true` including `isCorrect` flag. A student sees which options are correct.
   - Severity: **CRITICAL**

3. **🟡 CHEATING: No backend timer enforcement** (`online-exam.service.ts`)
   - `Exam.duration` exists but is never enforced. Student can take unlimited time.
   - `timedOutAt` field in schema is never written.
   - Severity: **HIGH**

4. **🟡 UNGRADABLE: No manual grading endpoint for short_answer/essay** (`online-exam.service.ts:418`)
   - Comment says "teacher qo'lda tekshiradi" but no API exists to do so.
   - `SessionStatus.graded` enum value is unreachable.
   - Severity: **HIGH**

5. **🟡 VALIDATION: `saveAnswer` does not verify option belongs to question** (`online-exam.service.ts:358`)
   - Any valid option UUID can be submitted for any question.
   - Severity: **MEDIUM**

6. **🟡 DEAD CODE: `StartSessionDto`** (`online-exam.service.ts:63`)
   - Exported, never used.
   - Severity: **LOW**

7. **🟡 REST CONTRACT: `updateQuestion`/`deleteQuestion` ignore `examId` param** (`online-exam.controller.ts:52, 64`)
   - Route has `:examId` but service only uses `qId`.
   - Severity: **LOW**

**Test Coverage:** **0%**

**Verdict:** **The most feature-rich but least secure.** MCQ/TF auto-grading works end-to-end, but the security model is broken. Open-ended questions are a dead-end.

---

### 2.5 Notifications / Audit / Export / Analytics Integration

| Integration | Grades | Exams | Homework | Online Exam |
|-------------|--------|-------|----------|-------------|
| **Notifications** | ✅ In-app + queued SMS/email to parents on single grade create. `bulkCreate` has NO notifications. | ❌ `publish` has no notification. `submitBulkResults` has in-app only (no SMS/email queue). | ✅ In-app to class students on create. No SMS/email. | ❌ No notifications on exam publish, start, or completion. |
| **Audit Logs** | ✅ All CRUD operations logged via `AuditService`. | ⚠️ `publish` NOT logged. | ✅ All CRUD logged. | ❌ Zero audit logging. |
| **Export** | ✅ Supported via Export Center (`grades`, `analytics_summary`). | ⚠️ Not in Export Center entity list. | ❌ Not in Export Center entity list. | ❌ Not in Export Center entity list. |
| **Analytics** | ✅ GPA, class report, class GPA. | ❌ No exam-specific analytics API. | ❌ No homework analytics API. | ⚠️ Session list only, no computed analytics. |
| **WebSocket** | ✅ `grade:created` event emitted on single create. `bulkCreate` does NOT emit. | ❌ No WS events. | ❌ No WS events. | ❌ No WS events. |

---

## 3. Frontend Audit

### 3.1 Grades Frontend

| File | Route | Lines | Status |
|------|-------|-------|--------|
| `grades/page.tsx` | `/dashboard/grades` | 1,164 | ✅ Full feature set |
| `grades/quarterly/page.tsx` | `/dashboard/grades/quarterly` | 284 | ⚠️ No RBAC gating, Excel export is stub |
| `grades/loading.tsx` | `/dashboard/grades` | — | ✅ Skeleton |
| `lib/api/grades.ts` | — | ~80 | ✅ All endpoints wrapped |

**UI Features:**
- ✅ Student self-view (GPA, radar chart, line chart, subject cards)
- ✅ Teacher/Admin view (class filter, subject filter, paginated table, inline score edit)
- ✅ Bulk grade entry dialog (spreadsheet-style)
- ✅ Single grade creation dialog
- ✅ Quarterly pivot table (students × subjects)
- ✅ Print / PDF button (browser print)
- ✅ Excel import via `ImportDialog`

**Gaps:**
- ❌ **Quarterly page has NO RBAC** — any authenticated user can view any class's quarterly data.
- ❌ **Excel export is a toast stub** (`quarterly/page.tsx:127-128`): `"Bu funksiya tez orada qo'shiladi"`.
- ❌ **No reusable grade components** — all UI is colocated in monolithic page files.
- ❌ **Quarterly tab is just a link** — no inline quarterly entry on main page.

---

### 3.2 Exams Frontend

| File | Route | Lines | Status |
|------|-------|-------|--------|
| `exams/page.tsx` | `/dashboard/exams` | 5 | ✅ Shell |
| `exams/_components/exams-workspace.tsx` | `/dashboard/exams` | 1,362 | ✅ Functional, monolithic |
| `exams/[id]/page.tsx` | `/dashboard/exams/:id` | 1,378 | ✅ Functional, monolithic |
| `exams/loading.tsx` | `/dashboard/exams` | 36 | ✅ Skeleton |
| `lib/api/exams.ts` | — | ~70 | ✅ All endpoints |
| `lib/api/online-exam.ts` | — | ~80 | ✅ All endpoints |

**UI Features (Workspace):**
- ✅ OpTable with search, filters (class, subject, frequency, time range, published status)
- ✅ Bulk selection + FloatingBulkToolbar
- ✅ ExamDetailDialog (questions + sessions)
- ✅ Question CRUD (multiple choice, true/false, short answer, essay)
- ✅ DocX import (drag-and-drop, mammoth parser)
- ✅ Session monitoring (10s polling)
- ✅ Student exam-taking page (`/exam/[id]/take`) — full-screen with timer, navigation, auto-save

**Gaps:**
- ❌ **No edit button in workspace** — `examsApi.update` exists but no UI invokes it.
- ❌ **Export is a toast stub** — `FloatingBulkToolbar` "Export" just toasts.
- ❌ **PDF export is `window.print()`** — not a real PDF pipeline.
- ❌ **No branch filtering** — `examsApi.getAll` only takes `classId`/`subjectId`.
- ❌ **Pass threshold hardcoded at 50%** — not configurable per exam.
- ❌ **RBAC inconsistency** — `branch_admin` in `canManage` but not in `canEdit` on detail page.
- ❌ **No `updateQuestion` UI** — backend endpoint works, no edit form exists.

---

### 3.3 Homework Frontend

| File | Route | Lines | Status |
|------|-------|-------|--------|
| `homework/page.tsx` | `/dashboard/homework` | 696 | ⚠️ Partial |
| `homework/loading.tsx` | `/dashboard/homework` | 33 | ✅ Skeleton |
| `lib/api/homework.ts` | — | 27 | ⚠️ `update`/`remove` dead code |

**UI Features:**
- ✅ Homework list (active / expired split)
- ✅ Urgency indicators (orange border if due today/tomorrow)
- ✅ Create homework modal (title, class, subject, due date, description)
- ✅ Student submission form (textarea + file upload)
- ✅ Teacher grading dialog (inline 0-100 scoring)
- ✅ MySubmissionDialog (student views own submission)

**Gaps:**
- ❌ **No edit/delete buttons** — API methods exist (`homeworkApi.update`, `homeworkApi.remove`), zero UI calls.
- ❌ **No filtering/search/pagination** — large lists will be unwieldy.
- ❌ **No bulk grading** — each submission graded individually with separate save clicks.
- ❌ **`feedback` field is marketing-only** — UI renders `submission.feedback`, schema has no such column.
- ❌ **No draft/schedule** — publish immediately on create.
- ❌ **File upload allows file-only, but backend requires content** — `SubmitHomeworkDto.content` is `@IsString()` without `@IsOptional()`. Frontend allows empty content.

---

### 3.4 Student / Parent Portal

**Student Portal** (`/dashboard/student/page.tsx` — 800+ lines):
- ✅ Full self-service: schedule, grades (with charts), homework (with status badges), attendance (with bar chart), upcoming exams, report card PDF download.
- ✅ Client-side role guard.
- ✅ WebSocket attendance alerts.

**Parent Portal** (`/dashboard/parent/page.tsx` — 600+ lines):
- ✅ Full parent view: child selector, attendance, grades, payments, schedule, leave requests, homework.
- ✅ WebSocket `attendance:alert` real-time notifications.
- ✅ Client-side role guard.

**Verdict:** Student and parent portals are the **most polished** frontend surfaces. They consume the APIs effectively and present data well.

---

### 3.5 Mobile Readiness

| Page | Mobile State |
|------|-------------|
| Grades | ✅ Responsive tables with horizontal scroll |
| Exams | ✅ Responsive, but `exams-workspace.tsx` is 1,362 lines — heavy bundle |
| Homework | ✅ Card-based layout, mobile-friendly |
| Student portal | ✅ Card grid, mobile-friendly |
| Parent portal | ✅ Card grid, mobile-friendly |

**General mobile:** The app uses Tailwind responsive classes throughout. No native mobile app. The mobile FAB (`mobile-fab.tsx`) provides quick actions for small screens.

---

### 3.6 Missing Screens Summary

| Missing Screen | Why Needed | Impact |
|---------------|-----------|--------|
| **Homework edit page/modal** | Teachers make mistakes | 🔴 High |
| **Homework delete confirmation** | Teachers need to remove duplicates | 🔴 High |
| **Exam edit modal (workspace)** | Teachers need to reschedule | 🟡 Medium |
| **Question edit UI** | Teachers need to fix typos | 🟡 Medium |
| **Online exam manual grading UI** | Short answer / essay questions | 🔴 High |
| **Unified "Pending Tasks" inbox** | Teacher daily workflow | 🟡 Medium |
| **Grade publish workflow** | Draft → review → publish grades | 🟡 Medium |
| **Homework attachment upload** | Teachers need to attach worksheets | 🟡 Medium |
| **Exam result PDF export** | Parents want printable results | 🟡 Medium |
| **Bulk homework grading** | Grade 30 submissions at once | 🟡 Medium |
| **Grade history / changelog** | See who changed what when | 🟢 Low |
| **Late submission handling UI** | Override due dates, penalties | 🟢 Low |

---

## 4. Teacher Daily Workflow Simulation

### Scenario: Ms. Gulnora, Mathematics Teacher, Class 5A

**Time: 08:00 — Login**
- Opens `/login` → `POST /auth/login` → JWT + cookies
- Redirects to `/dashboard` → sees `TeacherDashboard`
- ✅ **Works.** Dashboard loads with `TodayScheduleWidget`, stat cards, quick actions.

**Time: 08:15 — Today's Timetable**
- `TodayScheduleWidget` calls `scheduleApi.getToday()`
- Shows 3 lessons: 5A Math (08:30), 5B Math (09:15), 5A Math (10:30)
- ✅ **Works.** Static display. No "Start Lesson" action.

**Time: 08:30 — Mark Attendance (5A)**
- Clicks "Davomat" quick action → `/dashboard/attendance`
- `AttendanceWorkspace` loads: `classesApi.getAll()` → selects 5A → `classesApi.getStudents(5A)`
- Marks 28 present, 2 absent → `POST /attendance/mark`
- ✅ **Works.** Optimistic update, save button, bulk actions.
- ⚠️ **Gap:** No "mark from schedule" shortcut. Must manually select class.

**Time: 08:45 — Enter Grades (5A Math Quiz)**
- Clicks "Baholar" → `/dashboard/grades`
- Selects Class=5A, Subject=Math
- "Baho kirish" tab → `BulkGradeDialog`
- Enters scores for all 30 students → `POST /grades/bulk`
- ✅ **Works.** Spreadsheet-style entry, save, table updates.
- ⚠️ **Gap:** `bulkCreate` does NOT trigger parent notifications. Only single `create` does.
- ⚠️ **Gap:** No "publish" step. Grades are immediately visible to students/parents.

**Time: 09:00 — Assign Homework**
- Clicks "Uy vazifasi" → `/dashboard/homework`
- "Yangi vazifa" button → Create modal
- Fills title, class=5A, subject=Math, dueDate=tomorrow, description
- `POST /homework` → created immediately
- ✅ **Works.** Homework appears in list.
- ❌ **Gap:** Cannot attach a PDF worksheet. Only text description.
- ❌ **Gap:** Cannot schedule for later. Immediate publish.
- ❌ **Gap:** No edit/delete if she makes a typo.

**Time: 09:15 — Second Lesson (5B)**
- Repeats attendance + grades for 5B
- ✅ **Works.** Same flow.

**Time: 10:30 — Third Lesson (5A)**
- Creates a new exam: `/dashboard/exams` → "Yangi imtihon"
- Fills title="Choraklik", class=5A, subject=Math, frequency=quarterly
- `POST /exams` → exam created
- ✅ **Works.** Exam appears in list.
- ⚠️ **Gap:** Cannot set passing score (hardcoded 50%).
- ⚠️ **Gap:** Cannot add instructions for students.

**Time: 11:00 — Build Online Exam Questions**
- Opens exam detail → "Savollar" tab
- Adds 10 MCQ questions manually → `POST /online-exam/:examId/questions`
- Or drags a DocX file → `POST /online-exam/:examId/import-docx`
- ✅ **Works.** Questions render, DocX parser works.
- ❌ **Gap:** Cannot edit a question after creation. Must delete + recreate.
- ❌ **Gap:** Short answer / essay questions cannot be auto-graded. No manual grading UI.

**Time: 12:00 — Publish Exam**
- Clicks "Chop etish" → `PUT /exams/:id/publish`
- `isPublished = true`
- ✅ **Works.** Exam now appears in student upcoming exams.
- ⚠️ **Gap:** No notification sent to students/parents about new exam.
- ⚠️ **Gap:** No unpublish option if she changes her mind.

**Time: 14:00 — Students Take Exam**
- Students go to `/exam/:id/take`
- Start session → answer questions → submit
- `POST /online-exam/:examId/sessions/start` → `POST /sessions/:id/answer` → `POST /sessions/:id/submit`
- ✅ **Works.** Timer, navigation, auto-save, result screen.
- 🔴 **Gap:** Backend does NOT enforce timer. Students can take unlimited time.
- 🔴 **Gap:** Any authenticated user (not just students) can start the exam.

**Time: 15:00 — Review Results**
- Ms. Gulnora opens exam detail → "Monitoring" tab
- `GET /online-exam/:examId/sessions` shows who started/submitted
- ✅ **Works.** Session list with scores.
- ❌ **Gap:** No per-student answer review. Cannot see WHICH questions a student got wrong.
- ❌ **Gap:** No manual grading for open-ended questions.
- ❌ **Gap:** Results do NOT propagate to Gradebook. Must manually re-enter as `Grade` rows.

**Time: 16:00 — Grade Homework Submissions**
- `/dashboard/homework` → "Topshiriqlar" on Math homework
- `SubmissionsDialog` opens → shows 28 submissions
- Clicks each student, enters score 0-100, clicks "Saqlash"
- `PUT /homework/:id/submissions/:submissionId/grade`
- ✅ **Works.** Inline grading.
- ❌ **Gap:** No bulk grading. 28 individual clicks.
- ❌ **Gap:** No feedback text. UI renders `feedback` but schema has no column.
- ❌ **Gap:** Scores do NOT propagate to Gradebook. Must manually re-enter as `Grade` rows.

**Time: 17:00 — Parent Visibility**
- Parents open `/dashboard/parent` → "Baholar" tab
- See Ms. Gulnora's grades (automatically visible)
- "Uyga vazifa" tab → see homework list (but NOT the score, since `HomeworkSubmission` is not linked to parent view)
- ✅ **Works.** Grades visible.
- ⚠️ **Gap:** Homework scores not visible to parents (parent portal fetches `parentApi.getChildHomework()` which returns homework list, not submission scores).

---

### Workflow Map: Broken/Missing Steps

| Step | Route | API | Backend | Model | Status |
|------|-------|-----|---------|-------|--------|
| Login | `/login` | `POST /auth/login` | `AuthService` | `User` | ✅ |
| View schedule | `/dashboard` | `GET /schedule/today` | `ScheduleService` | `Schedule` | ✅ |
| Mark attendance | `/dashboard/attendance` | `POST /attendance/mark` | `AttendanceService` | `Attendance` | ✅ |
| Enter grades (bulk) | `/dashboard/grades` | `POST /grades/bulk` | `GradesService` | `Grade` | ✅ (no parent notif) |
| Assign homework | `/dashboard/homework` | `POST /homework` | `HomeworkService` | `Homework` | ✅ (no attachments) |
| **Edit homework** | — | `PUT /homework/:id` | `HomeworkService` | `Homework` | ❌ **NO UI** |
| **Delete homework** | — | `DELETE /homework/:id` | `HomeworkService` | `Homework` | ❌ **NO UI** |
| Create exam | `/dashboard/exams` | `POST /exams` | `ExamsService` | `Exam` | ✅ |
| **Edit exam** | — | `PUT /exams/:id` | `ExamsService` | `Exam` | ❌ **NO UI in workspace** |
| Build questions | `/dashboard/exams/:id` | `POST /online-exam/:id/questions` | `OnlineExamService` | `ExamQuestion` | ✅ |
| **Edit questions** | — | `PUT /online-exam/:id/questions/:qId` | `OnlineExamService` | `ExamQuestion` | ❌ **NO UI** |
| Publish exam | `/dashboard/exams/:id` | `PUT /exams/:id/publish` | `ExamsService` | `Exam` | ✅ (no notif) |
| Students take exam | `/exam/:id/take` | `POST /sessions/start` etc. | `OnlineExamService` | `ExamSession` | ✅ (no timer enforce) |
| Review results | `/dashboard/exams/:id` | `GET /online-exam/:id/sessions` | `OnlineExamService` | `ExamSession` | ✅ (no answer review) |
| **Manual grade open-ended** | — | — | — | — | ❌ **NO API, NO UI** |
| **Propagate exam to gradebook** | — | — | — | — | ❌ **NO automatic linkage** |
| Grade homework | `/dashboard/homework` | `PUT /submissions/:id/grade` | `HomeworkService` | `HomeworkSubmission` | ✅ (no bulk) |
| **Propagate homework to gradebook** | — | — | — | — | ❌ **NO automatic linkage** |
| Parent sees grades | `/dashboard/parent` | `GET /parent/child/:id/grades` | `ParentService` | `Grade` | ✅ |
| **Parent sees homework scores** | `/dashboard/parent` | — | — | `HomeworkSubmission` | ⚠️ **Not visible** |

---

## 5. Competitive Gap

### 5.1 Kundalik (kundalik.uz) — Uzbekistan Market Leader

| Feature | Kundalik | Xedu (Current) | Gap |
|---------|----------|----------------|-----|
| Gradebook | ✅ Full journal with weighting, quarters, finals | ⚠️ Flat scores, no weighting, quarter pivot is client-side | **Missing weighted GPA, semester scoping** |
| Homework | ✅ Attachments, scheduling, auto-grade integration | ❌ No attachments, immediate publish, no grade linkage | **Missing attachment workflow, scheduling, grade bridge** |
| Exams | ✅ Test builder, auto-grade, result export | ✅ MCQ/TF works, but no manual grading, no timer enforce | **Missing manual grading, timer, result export** |
| Parent app | ✅ Native mobile app, real-time push | ⚠️ Web-only, WS notifications partial | **Missing native app, push notifications** |
| Attendance | ✅ SMS to parents automatically | ✅ SMS/email queued on single attendance mark | **Parity on single, missing on bulk** |
| Report card | ✅ Auto-generated PDF with school stamp | ⚠️ PDF download exists for students, but format basic | **Missing official report card template** |
| Lesson plans | ✅ Teacher lesson journal (kundalik) | ❌ Not implemented | **Missing entirely** |
| Messaging | ✅ Built-in parent-teacher chat | ⚠️ Messages module exists but not audited | **Unclear** |

### 5.2 Moodle

| Feature | Moodle | Xedu (Current) | Gap |
|---------|--------|----------------|-----|
| Gradebook | ✅ Advanced grading, scales, rubrics, outcomes | ⚠️ Simple scores 0-100 | **Missing rubrics, grading scales, outcomes** |
| Assignment | ✅ File submission, plagiarism check, feedback | ❌ No file attachments, no feedback column | **Missing file workflow, feedback, plagiarism** |
| Quiz | ✅ Question bank, randomization, proctoring, timer | ✅ Basic MCQ/TF, but no question bank, no randomization | **Missing question bank, randomization, proctoring** |
| Analytics | ✅ Learning analytics, engagement reports | ⚠️ Basic GPA and class averages | **Missing learning analytics** |
| SCORM | ✅ Full SCORM support | ❌ Not implemented | **Missing entirely** |

### 5.3 Google Classroom

| Feature | Google Classroom | Xedu (Current) | Gap |
|---------|-----------------|----------------|-----|
| Assignment | ✅ Docs/Slides integration, rubrics, scheduling | ❌ No attachments, no rubrics, immediate publish | **Missing GSuite integration, rubrics, scheduling** |
| Grading | ✅ Comment bank, drafts, return workflow | ⚠️ Inline score edit, but no draft/return | **Missing draft workflow, comment bank** |
| Stream | ✅ Class feed, announcements, materials | ❌ Not implemented | **Missing class stream** |
| Guardian summary | ✅ Weekly email digest to parents | ❌ No digest email | **Missing parent digest** |

### 5.4 BilimClass (Uzbek competitor)

| Feature | BilimClass | Xedu (Current) | Gap |
|---------|-----------|----------------|-----|
| Journal | ✅ Full Uzbekistan-compliant gradebook | ⚠️ Basic, no weighting | **Missing compliance features** |
| Attendance | ✅ Daily journal with SMS | ✅ Parity | **Parity** |
| Homework | ✅ File attachments, video lessons | ❌ No attachments | **Missing file workflow** |
| Online test | ✅ Full test with timer | ✅ Partial (no timer enforce) | **Missing timer enforcement** |
| Parent app | ✅ Native app | ❌ Web-only | **Missing native app** |

### 5.5 Minimum Pilot Requirements (Realistic)

For Xedu to be **usable** in a real Uzbekistan school pilot, the following are non-negotiable:

**P0 — Must Fix Before Pilot:**
1. Homework privacy leaks (`findAll`, `findOne` return cross-class data)
2. Exam results privacy leak (`GET /exams/:id/results` returns all grades)
3. Online exam RBAC (any authenticated user can take exams)
4. Online exam correct-answer leakage
5. Homework `createdById` attribution (or remove if not needed)
6. Grade `createdById` enforcement or at least population

**P1 — Should Fix Before Pilot:**
7. Homework edit/delete UI (teachers WILL make mistakes)
8. Exam edit UI (teachers WILL need to reschedule)
9. Homework attachment support (teachers need to attach worksheets)
10. Grade publish workflow (draft → review → publish)
11. Online exam timer enforcement
12. Propagate online exam scores to Gradebook automatically

**P2 — Nice to Have:**
13. Weighted GPA / semester scoping
14. Question bank / reusable questions
15. Bulk homework grading
16. Parent digest email
17. Native mobile app
18. Learning analytics

---

## 6. Production Risk Assessment

### P0 — Pilot Blockers (Data Leak / Crash / Security)

| # | Risk | File | Scenario | Impact |
|---|------|------|----------|--------|
| P0-1 | Student sees all school homework | `homework.service.ts:18-31` | Any student opens `/dashboard/homework` | **Privacy breach — FERPA/GDPR violation** |
| P0-2 | Student sees classmates' submissions | `homework.service.ts:33-48` | Student opens any homework detail | **Privacy breach** |
| P0-3 | Student sees all exam results | `exams.service.ts:185-239` | Student opens `/dashboard/exams/:id` results tab | **Privacy breach** |
| P0-4 | Any user can take any exam | `online-exam.controller.ts:122,134,147,159` | Parent/accountant starts exam session | **Academic integrity failure** |
| P0-5 | Exam correct answers leaked | `online-exam.service.ts:464` | Student views result after submit | **Cheating enabler** |
| P0-6 | Director crash on bulk results | `exams.service.ts:363,388` | Director submits exam results | **500 error, data loss risk** |

### P1 — High Risk (Workflow Breakage / Data Integrity)

| # | Risk | File | Scenario | Impact |
|---|------|------|----------|--------|
| P1-1 | Teacher cannot edit homework | `homework/page.tsx` | Teacher makes typo in homework title | **Workflow blocked, must recreate** |
| P1-2 | Teacher cannot delete homework | `homework/page.tsx` | Teacher creates duplicate | **Workflow blocked** |
| P1-3 | Exam branchId stale on class change | `exams.service.ts:124-130` | Teacher moves exam to different branch class | **Tenant isolation broken** |
| P1-4 | Bulk grades don't notify parents | `grades.service.ts:170-212` | Teacher enters 30 grades at once | **Parents unaware of grade changes** |
| P1-5 | Online exam unlimited time | `online-exam.service.ts` | Student starts exam, goes to lunch, comes back | **Academic integrity failure** |
| P1-6 | Homework scores not in gradebook | Schema gap | Teacher grades homework, must re-enter in grades | **Double work, error-prone** |
| P1-7 | Exam scores not in gradebook | Schema gap | Online exam auto-grades, not in gradebook | **Double work** |
| P1-8 | No manual grading for open-ended | `online-exam.service.ts:418` | Teacher creates essay question | **Ungradable, student gets 0** |

### P2 — Medium Risk (UX / Performance / Maintainability)

| # | Risk | File | Scenario | Impact |
|---|------|------|----------|--------|
| P2-1 | `findAll` subject filter overwritten | `grades.service.ts:459-468` | Teacher filters by subject | **Filter ignored** |
| P2-2 | `getStudentGpa` no cache | `grades.service.ts:375-383` | Teacher checks GPA repeatedly | **DB load** |
| P2-3 | Silent failures on side effects | `grades.service.ts` multiple | Grade created, notification fails | **Invisible failures** |
| P2-4 | Homework create crashes on bad classId | `homework.service.ts:60` | Teacher enters invalid classId | **500 error** |
| P2-5 | Quarterly page no RBAC | `grades/quarterly/page.tsx` | Any user opens quarterly | **Unauthorized data access** |
| P2-6 | Exam pass threshold hardcoded | `exams/[id]/page.tsx:841` | School uses 60% passing | **Incorrect results** |
| P2-7 | 0% test coverage on 3 modules | `exams/`, `homework/`, `online-exam/` | Any regression | **Undetected bugs** |

---

## 7. Implementation Blueprint

### Phase 7: Teacher Journal System

**Goal:** Connect the disconnected Journal layer into a unified, secure, teacher-centric workflow.

---

### 7.1 Database Changes (Migration Plan)

**Migration 1: Grade Model Hardening**
```prisma
model Grade {
  // ... existing fields ...
  examId        String?     // NEW: FK → Exam
  homeworkId    String?     // NEW: FK → Homework
  semester      String?     // NEW: e.g., "2025-2026-1"
  academicYear  String?     // NEW: e.g., "2025-2026"
  weight        Float       @default(1) // NEW: for weighted average
  isPublished   Boolean     @default(false) // NEW: draft/publish workflow
  deletedAt     DateTime?   // NEW: soft delete

  exam          Exam?       @relation(fields: [examId], references: [id])
  homework      Homework?   @relation(fields: [homeworkId], references: [id])
}
```

**Migration 2: Homework Model Hardening**
```prisma
model Homework {
  // ... existing fields ...
  createdById   String      // NEW: FK → User (teacher)
  updatedAt     DateTime    @updatedAt // NEW
  maxScore      Float       @default(100) // NEW
  status        HomeworkStatus @default(draft) // NEW: draft | published | closed
  assignedDate  DateTime    @default(now()) // NEW
  attachmentUrl String?     // NEW: teacher-uploaded file
  deletedAt     DateTime?   // NEW: soft delete

  createdBy     User        @relation(fields: [createdById], references: [id])
}

enum HomeworkStatus {
  draft
  published
  closed
}
```

**Migration 3: HomeworkSubmission Hardening**
```prisma
model HomeworkSubmission {
  // ... existing fields ...
  status        SubmissionStatus @default(submitted) // NEW
  gradedById    String?     // NEW: FK → User
  gradedAt      DateTime?   // NEW
  feedback      String?     // NEW: teacher feedback text
  updatedAt     DateTime    @updatedAt // NEW
  isLate        Boolean     @default(false) // NEW
  latePenalty   Float       @default(0) // NEW: percentage deducted
  maxScore      Float       @default(100) // NEW: snapshot at submission time

  gradedBy      User?       @relation(fields: [gradedById], references: [id])
}

enum SubmissionStatus {
  submitted
  late
  graded
  returned
}
```

**Migration 4: Exam Model Hardening**
```prisma
model Exam {
  // ... existing fields ...
  createdById   String      // NEW: FK → User
  status        ExamStatus  @default(draft) // NEW: replaces isPublished
  instructions  String?     // NEW
  passingScore  Float       @default(50) // NEW: replaces hardcoded 50%
  roomId        String?     // NEW: FK → Room
  deletedAt     DateTime?   // NEW: soft delete

  createdBy     User        @relation(fields: [createdById], references: [id])
}

enum ExamStatus {
  draft
  ready
  published
  in_progress
  completed
  archived
}
```

**Migration 5: Online Exam → Grade Bridge**
```prisma
// Trigger or service-layer logic:
// When ExamSession.status changes to 'submitted' AND exam.autoPropagateToGradebook = true,
// create or update a Grade row with examId = exam.id, type = 'exam'.
```

---

### 7.2 API Plan

#### Grades API (Enhancements)

| Endpoint | Change | Priority |
|----------|--------|----------|
| `POST /grades` | Enforce `createdById` from JWT | P0 |
| `POST /grades/bulk` | Add parent notification queue + WS event | P1 |
| `PUT /grades/:id` | Add `UpdateGradeDto`, enforce publish workflow | P1 |
| `GET /grades` | Add `isPublished` filter | P1 |
| `POST /grades/:id/publish` | NEW endpoint: publish grade (make visible) | P1 |
| `POST /grades/:id/unpublish` | NEW endpoint: retract grade | P1 |

#### Homework API (Hardening)

| Endpoint | Change | Priority |
|----------|--------|----------|
| `GET /homework` | Filter by caller's role: STUDENT → only their class's homework | P0 |
| `GET /homework/:id` | For STUDENT/PARENT, exclude other students' submissions | P0 |
| `POST /homework` | Enforce `createdById`, support `attachmentUrl` upload | P1 |
| `PUT /homework/:id` | Validate `createdById` matches caller (or director override) | P1 |
| `DELETE /homework/:id` | Soft delete, validate ownership | P1 |
| `POST /homework/:id/submit` | Verify student is in `homework.classId` | P0 |
| `PUT /submissions/:id/grade` | Set `gradedById`, `gradedAt`, `feedback` | P1 |
| `POST /homework/:id/close` | NEW: close submissions, auto-propagate scores to Gradebook | P1 |

#### Exams API (Hardening)

| Endpoint | Change | Priority |
|----------|--------|----------|
| `GET /exams/:id/results` | Filter by role: STUDENT → only their own grade | P0 |
| `PUT /exams/:id` | Recalculate `branchId` if `classId` changes | P1 |
| `POST /exams/:id/results/bulk` | Fix `branchId` null crash for directors | P0 |
| `PUT /exams/:id/publish` | Add audit log, send notification | P1 |
| `PUT /exams/:id/unpublish` | NEW endpoint | P1 |

#### Online Exam API (Hardening)

| Endpoint | Change | Priority |
|----------|--------|----------|
| `POST /:examId/sessions/start` | Add `@Roles(UserRole.STUDENT)` | P0 |
| `POST /sessions/:id/answer` | Add `@Roles(UserRole.STUDENT)`, validate option ownership | P0 |
| `POST /sessions/:id/submit` | Add `@Roles(UserRole.STUDENT)`, enforce timer | P1 |
| `GET /sessions/:id/result` | Add `@Roles(UserRole.STUDENT)`, strip `isCorrect` from options | P0 |
| `POST /sessions/:id/grade` | NEW: manual grading for short_answer/essay | P1 |
| `GET /online-exam/:id/analytics` | NEW: per-question statistics, average score, pass rate | P2 |

---

### 7.3 Frontend Plan

#### Homework Page — Priority P1

1. **Add edit/delete buttons** to homework cards
   - Edit opens pre-filled modal → `PUT /homework/:id`
   - Delete shows confirmation dialog → `DELETE /homework/:id`
   - Files: `homework/page.tsx`, `lib/api/homework.ts`

2. **Add attachment upload** to create modal
   - File picker → `POST /upload/document` → store URL in `attachmentUrl`
   - Display attachment link in homework card and student view
   - File: `homework/page.tsx`

3. **Add class/subject filters** to homework list
   - Dropdown filters, client-side or server-side
   - File: `homework/page.tsx`

4. **Add `feedback` input** to grading dialog
   - Textarea in `SubmissionsDialog` → `PUT /submissions/:id/grade` with `feedback`
   - Display feedback in `MySubmissionDialog`
   - Files: `homework/page.tsx` (both dialogs)

5. **Add bulk grading** to submissions dialog
   - Spreadsheet-style input for all students at once
   - Single "Saqlash" button → batch API call (needs new `POST /homework/:id/grades/bulk`)
   - File: `homework/page.tsx`

#### Exams Page — Priority P1

1. **Add edit modal to workspace**
   - "Tahrirlash" row action → pre-filled modal → `PUT /exams/:id`
   - File: `exams/_components/exams-workspace.tsx`

2. **Add question edit UI**
   - "Tahrirlash" button per question in `QuestionsTab`
   - Pre-populated form → `PUT /online-exam/:examId/questions/:qId`
   - File: `exams/[id]/page.tsx`

3. **Add manual grading UI for open-ended**
   - New tab in exam detail: "Qo'lda tekshirish"
   - Table: student × question, textarea for score + feedback per answer
   - `POST /sessions/:id/grade` for each answer
   - File: `exams/[id]/page.tsx`

4. **Fix pass threshold display**
   - Read `exam.passingScore` instead of hardcoded 50%
   - File: `exams/[id]/page.tsx:841`

#### Grades Page — Priority P1

1. **Add publish workflow**
   - "Baho kirish" tab grades are saved as `isPublished: false` (draft)
   - "Chop etish" bulk action publishes selected grades
   - Unpublished grades show "Qoralama" badge to teacher, hidden from student/parent
   - Files: `grades/page.tsx`, `grades/quarterly/page.tsx`

2. **Implement Excel export** (replace stub)
   - Use `ExcelJS` or `json2csv` (already dependencies)
   - File: `grades/quarterly/page.tsx:127-128`

3. **Add RBAC to quarterly page**
   - Gate by `canManage` or `isTeacher`
   - File: `grades/quarterly/page.tsx`

#### Teacher Dashboard — Priority P2

1. **Add "Pending Tasks" widget**
   - Count: unpublished grades, ungraded homework submissions, upcoming exams without questions
   - Click navigates to relevant page
   - File: `teacher-dashboard.tsx`, `shared-widgets.tsx`

2. **Add "Start Lesson" action**
   - From `TodayScheduleWidget`, click a lesson → shortcut to attendance for that class
   - File: `shared-widgets.tsx`

---

### 7.4 Reuse Opportunities

| Component | Reuse Target | How |
|-----------|-------------|-----|
| `OpTable` | Homework list, Exam session monitor | Already used — extend with bulk actions |
| `BulkGradeDialog` | Bulk homework grading | Clone pattern, adapt for `HomeworkSubmission` |
| `ImportDialog` | Grade import already works | Add homework import support |
| `EntityPanel` | Exam detail panel | Already used — extend with grading tab |
| `FloatingBulkToolbar` | Exam workspace | Already used — add publish/unpublish actions |
| `InlineScoreEdit` | Homework grading | Extract to shared component |
| `MySubmissionDialog` | Student view | Already exists — add feedback display |
| `ScheduleWorkspace` | Teacher schedule | Already exists — add "Mark attendance" shortcut per slot |

---

### 7.5 Estimated Effort

| Work Item | Dev Days | Notes |
|-----------|----------|-------|
| **P0 Security Fixes** (5 items) | 3 days | Homework scoping, exam results filter, online exam RBAC, answer stripping, director crash fix |
| **Schema Migrations** (5 migrations) | 2 days | Prisma migrate, type updates, DTO updates |
| **Homework Hardening** (edit/delete/attach/filter/bulk) | 5 days | Backend + frontend |
| **Grade Publish Workflow** | 3 days | Backend + frontend + parent visibility logic |
| **Exam Hardening** (edit/unpublish/passScore) | 2 days | Backend + frontend |
| **Online Exam Security** (RBAC + timer + manual grade) | 4 days | Backend timer enforcement, manual grading API + UI |
| **Gradebook Bridges** (homework→grade, exam→grade) | 3 days | Service-layer auto-propagate logic |
| **Tests** (grades + exams + homework + online-exam) | 5 days | Unit + integration coverage |
| **Polish** (pending tasks widget, start lesson, empty states) | 3 days | Frontend only |
| **Total** | **30 days** | 1 senior full-stack developer |

**With 2 developers:** ~15 calendar days (parallel tracks: one backend, one frontend)

**Recommended split:**
- **Week 1:** P0 security fixes + schema migrations + backend hardening
- **Week 2:** Frontend hardening (homework edit/delete, grade publish, exam edit)
- **Week 3:** Online exam security + manual grading + gradebook bridges
- **Week 4:** Tests + polish + QA

---

### 7.6 Files to Touch (Exact List)

**Backend:**
- `apps/backend/prisma/schema.prisma` — migrations
- `apps/backend/src/modules/homework/homework.service.ts` — scoping, enrollment check, soft delete
- `apps/backend/src/modules/homework/homework.controller.ts` — add close endpoint
- `apps/backend/src/modules/homework/dto/homework.dto.ts` — add status, attachmentUrl, feedback
- `apps/backend/src/modules/exams/exams.service.ts` — results filter, branchId recalc, audit log
- `apps/backend/src/modules/exams/exams.controller.ts` — add unpublish endpoint
- `apps/backend/src/modules/online-exam/online-exam.controller.ts` — add @Roles to student endpoints
- `apps/backend/src/modules/online-exam/online-exam.service.ts` — timer enforcement, manual grading, strip isCorrect
- `apps/backend/src/modules/grades/grades.service.ts` — publish workflow, bulk notifications
- `apps/backend/src/modules/grades/grades.controller.ts` — add publish/unpublish endpoints
- `apps/backend/src/modules/grades/dto/create-grade.dto.ts` — add UpdateGradeDto, isPublished
- `apps/backend/src/common/guards/roles.guard.ts` — verify RolesGuard handles empty requiredRoles correctly

**Frontend:**
- `apps/frontend/src/app/(dashboard)/dashboard/homework/page.tsx` — edit/delete buttons, attachment upload, filters, bulk grading, feedback
- `apps/frontend/src/app/(dashboard)/dashboard/grades/page.tsx` — publish workflow UI
- `apps/frontend/src/app/(dashboard)/dashboard/grades/quarterly/page.tsx` — RBAC gate, real Excel export
- `apps/frontend/src/app/(dashboard)/dashboard/exams/_components/exams-workspace.tsx` — edit modal
- `apps/frontend/src/app/(dashboard)/dashboard/exams/[id]/page.tsx` — question edit, manual grading tab, passScore fix
- `apps/frontend/src/app/(dashboard)/dashboard/_components/teacher-dashboard.tsx` — pending tasks widget
- `apps/frontend/src/app/(dashboard)/dashboard/_components/shared-widgets.tsx` — start lesson shortcut
- `apps/frontend/src/lib/api/homework.ts` — add close, bulk grade endpoints
- `apps/frontend/src/lib/api/grades.ts` — add publish/unpublish endpoints
- `apps/frontend/src/lib/api/online-exam.ts` — add manual grade endpoint
- `apps/frontend/src/lib/api/exams.ts` — add unpublish endpoint

---

*Audit compiled from source code analysis of commit `d470a1f` (v0.1.0-pilot).*
