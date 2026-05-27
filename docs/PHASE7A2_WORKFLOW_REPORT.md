# Phase 7A.2 — Teacher Journal Workflow Completion Report

**Date:** 2026-05-21  
**Baseline:** `v0.1.0-pilot` (post-7A.1 security hardening)  
**Scope:** Close frontend workflow gaps in Exams, Homework, and Grades modules that prevent teachers from completing their daily journal operations without leaving the platform.

---

## 1. Summary of Changes

| Module | Gap (from audit) | Resolution |
|--------|-----------------|------------|
| **Exams** | No inline edit for exam metadata | Added edit dialog (title, scheduledAt, maxScore, duration) with validation |
| **Exams** | No unpublish action after publishing | Added "Qoralama qilish" (unpublish) row action via `PUT /exams/:id { isPublished: false }` |
| **Exams** | Status column only showed `isPublished` boolean | Replaced with 3-state badges: **Tugagan** (past), **Faol** (published upcoming), **Kutilmoqda** (draft upcoming) |
| **Exams** | No question edit in ExamDetailDialog | Added inline edit form per question (text, points, explanation) wired to `PUT /online-exam/:examId/questions/:qId` |
| **Homework** | Edit/delete buttons rendered but footer in wrong dialog caused TS errors | Fixed `MySubmissionDialog` footer (removed orphaned `handleBulkGrade` / `bulkGradeMutation` references) |
| **Homework** | `useConfirm` used incorrectly as Zustand store | Fixed to proper React hook pattern: `const ask = useConfirm()` |
| **Homework** | Filter bar existed but classes/subjects queries only enabled on modal open | Expanded `enabled` condition so filters populate when page mounts |

---

## 2. Frontend Changes Detail

### 2.1 `apps/frontend/src/app/(dashboard)/dashboard/exams/_components/exams-workspace.tsx`

#### Edit Exam Dialog
- Added `editingExam` state to hold the exam being edited.
- Added `eForm` state (title, scheduledAt, maxScore, duration) with validation.
- Added `updateExamMutation` calling `examsApi.update(id, payload)`.
- Row action: Edit button (`Pencil`) visible for `canManage` roles.

#### Unpublish Action
- Added `unpublishMutation` calling `examsApi.update(id, { isPublished: false })`.
- Row action: "Qoralama qilish" (`Clock` icon) visible only when `isPublished === true` and `canManage`.
- Confirmation dialog with destructive variant.

#### Status Badges
```
const now = new Date();
const examDate = new Date(e.scheduledAt);
if (examDate < now) return "Tugagan";
if (e.isPublished) return "Faol";
return "Kutilmoqda";
```

#### Question Inline Edit
- Added `editingQ` state to track which question is in edit mode.
- Added `editQForm` state (text, points, explanation).
- Added `updateQuestionMutation` calling `onlineExamApi.updateQuestion(exam.id, qId, payload)`.
- Per-question edit button in expanded row; replaces display with a compact form.

### 2.2 `apps/frontend/src/app/(dashboard)/dashboard/homework/page.tsx`

#### Bug Fixes
- **Removed orphaned bulk-grade footer from `MySubmissionDialog`**: The student-facing dialog previously had a "Barchasini saqlash" button referencing `handleBulkGrade` and `bulkGradeMutation`, which only existed in `SubmissionsDialog` (teacher view). This caused a compile error. Fixed to a simple "Yopish" button.
- **Fixed `useConfirm` usage**: Changed from `useConfirm.getState().ask(...)` (incorrect — `useConfirm` is a React hook returning the `ask` function) to `const ask = useConfirm()` in the main component body, then `await ask(...)` in the click handler.

#### Filter Query Fix
- `classes` and `subjects` queries were only enabled when `open || !!editingHw` (modal open). Filters showed empty dropdowns on initial page load. Changed to unconditional `enabled: true` so filter bars populate immediately.

---

## 3. Verification

### TypeScript Compilation
```bash
cd apps/frontend && npx tsc --noEmit -p tsconfig.json
# Result: zero errors
```

### Pre-existing Test Failures (unchanged)
- `auth.service.spec.ts` — 7 failures (mock/DI issues)
- `attendance.service.spec.ts` — 2 failures
- `notifications.service.spec.ts` — 1 failure
- **None introduced by 7A.2 changes.**

---

## 4. Remaining Gaps (Deferred)

### 4.1 Grade Publish Workflow
- **Issue:** Backend `Grade` model has no `isPublished` / `isVisibleToParent` field. Any grade created is immediately visible to parents.
- **Impact:** Teachers cannot draft grades and review before publishing.
- **Resolution:** Requires schema migration (`prisma migrate`) + backend service updates + frontend publish toggle. **Deferred to Phase 7A.3.**

### 4.2 Homework Attachments on Creation
- **Issue:** Frontend homework creation has no attachment field. Schema lacks `attachmentUrl` on `Homework`.
- **Impact:** Teachers cannot attach worksheets/instructions when creating homework.
- **Resolution:** Requires schema change + backend DTO update + file upload widget. **Deferred to Phase 7A.3.**

### 4.3 Gradebook Grid View
- **Issue:** Grades page is list-based. A dedicated grid (rows = students, columns = grade items) would improve scanability.
- **Impact:** Moderate — existing list + charts provide sufficient functionality.
- **Resolution:** New feature. **Deferred to Phase 7B (Analytics & Reporting).**

---

## 5. Bridge Audit — Auto-Propagation to Grade

### 5.1 HomeworkSubmission Score → Grade

**Current State:**
- Teacher grades a submission via `POST /homework/:id/submissions/:submissionId/grade`.
- `homework.service.ts::grade()` updates `HomeworkSubmission.score`.
- **No `Grade` record is created.**

**Gap:** Homework scores exist in isolation. They do not appear in the Grades module, quarterly reports, or parent dashboards as formal grades.

**Proposed Bridge (Phase 7A.3):**
```ts
// In homework.service.ts after saving submission score
if (score !== null) {
  await this.prisma.grade.upsert({
    where: {
      studentId_classId_subjectId_type_date_unique: {
        studentId: submission.studentId,
        classId: homework.classId,
        subjectId: homework.subjectId,
        type: 'homework',
        date: new Date(homework.dueDate),
      },
    },
    update: { score, maxScore: 100 },
    create: {
      studentId: submission.studentId,
      classId: homework.classId,
      subjectId: homework.subjectId,
      teacherId: currentUser.sub,
      schoolId: currentUser.schoolId!,
      branchId: homework.branchId,
      type: 'homework',
      score,
      maxScore: 100,
      date: new Date(homework.dueDate),
      comment: `Homework: ${homework.title}`,
    },
  });
}
```
**Caveat:** Requires `Grade` model to have a unique composite key on `(studentId, classId, subjectId, type, date)` or use a `sourceId` field to prevent duplicates.

### 5.2 ExamSession Result → Grade

**Current State:**
- `submitSession()` auto-grades MCQ/TF and stores total score in `ExamSession.totalScore`.
- **No `Grade` record is created.**

**Gap:** Online exam results are invisible in the Grades module and quarterly reports.

**Proposed Bridge (Phase 7A.3):**
```ts
// In online-exam.service.ts after session submission
if (session.totalScore !== null && exam.subjectId && exam.classId) {
  await this.prisma.grade.upsert({
    where: {
      studentId_classId_subjectId_type_date_unique: {
        studentId: session.studentId,
        classId: exam.classId,
        subjectId: exam.subjectId,
        type: 'exam',
        date: new Date(exam.scheduledAt),
      },
    },
    update: { score: session.totalScore, maxScore: exam.maxScore ?? 100 },
    create: {
      studentId: session.studentId,
      classId: exam.classId,
      subjectId: exam.subjectId,
      teacherId: exam.teacherId,
      schoolId: exam.schoolId,
      branchId: exam.branchId,
      type: 'exam',
      score: session.totalScore,
      maxScore: exam.maxScore ?? 100,
      date: new Date(exam.scheduledAt),
      comment: `Online exam: ${exam.title}`,
    },
  });
}
```

**Decision:** Both bridges require schema changes (unique key or `sourceId` on `Grade`) to prevent duplicate creation on re-grade. **Deferred to Phase 7A.3** alongside the grade-publish workflow.

---

## 6. Files Modified

| File | Lines Changed | Nature |
|------|---------------|--------|
| `apps/frontend/src/app/(dashboard)/dashboard/exams/_components/exams-workspace.tsx` | +180 / −20 | Add edit dialog, unpublish mutation, status badges, inline question edit |
| `apps/frontend/src/app/(dashboard)/dashboard/homework/page.tsx` | +15 / −20 | Fix MySubmissionDialog footer, fix useConfirm hook usage, fix filter query enabling |

---

## 7. Next Steps

1. **Phase 7A.3 — Data Integrity & Publish Workflow**
   - Add `isPublished`, `isVisibleToParent` to `Grade` schema
   - Implement grade-publish toggle in `grades.service.ts`
   - Wire publish UI in `grades/page.tsx`
   - Implement HomeworkSubmission → Grade bridge
   - Implement ExamSession → Grade bridge

2. **Phase 7B — Analytics & Reporting**
   - Gradebook grid view
   - Class/subject performance heatmaps
   - Automated quarterly report generation
