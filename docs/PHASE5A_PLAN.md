# Phase 5A Plan: Teaching Load, Workload Balancing & Payroll Foundation

> **Status:** Planning document — NOT implementation.  
> **Scope:** Tarifikatsiya (Teaching Load), Teacher Workload Balancing, Payroll Linkage Foundation, Teacher Absence Groundwork, Workload Analytics.  
> **Commit target:** `docs: phase 5A planning for teaching load and payroll foundation`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Audit](#2-current-state-audit)
3. [Gap Analysis](#3-gap-analysis)
4. [Architecture Design](#4-architecture-design)
5. [Database Plan](#5-database-plan)
6. [API Plan](#6-api-plan)
7. [RBAC Plan](#7-rbac-plan)
8. [Migration Risks & Strategy](#8-migration-risks--strategy)
9. [Phased Implementation Proposal](#9-phased-implementation-proposal)
10. [Open Questions](#10-open-questions)

---

## 1. Executive Summary

Phase 5A builds the **teaching-load engine** on top of the production-hardened timetable (Phases 3–4). It closes the gap between "who teaches what" (Subject assignment) and "how much they are paid for it" (Payroll).

The Uzbek school workflow (`tarifikatsiya`) requires:

1. **Formal teaching-load records** — Not just `Subject.hoursPerWeek`, but a dedicated `TeachingLoad` entity that can be approved, versioned, and imported from Excel.
2. **Workload balancing** — Detect overloaded teachers (>20 soat/hafta) and underutilized ones before scheduling.
3. **Payroll linkage foundation** — Auto-populate `PayrollItem.scheduledHours` from published schedules; derive `completedHours` from attendance/lesson completion.
4. **Teacher absence groundwork** — Extend `LeaveRequest` for teachers, plan substitution model.
5. **Analytics** — Backend-driven teacher utilization, room utilization, schedule density, conflict heatmaps.

**Key constraint:** `Subject.hoursPerWeek` already exists and is consumed by the Schedule Generator. We must NOT break this contract. The `TeachingLoad` entity will initially shadow `Subject.hoursPerWeek`, then eventually become the authoritative source.

---

## 2. Current State Audit

### 2.1 Database Schema

| Entity | Relevant Fields | Notes |
|--------|----------------|-------|
| `Subject` | `teacherId`, `classId`, `hoursPerWeek` (default 2), `branchId`, `schoolId` | Class-specific; one teacher per subject. `hoursPerWeek` is the ONLY load field. |
| `User` | `role` (`teacher` / `class_teacher`), `branchId`, `schoolId` | No `maxHours`, `specialization`, or `employmentType`. Multi-branch via `UserBranchAssignment`. |
| `StaffSalary` | `weeklyLessonHours` (default 18), `hourlyRate`, `baseSalary`, `calculationType` (`fixed` / `tariff_based`), `qualificationGrade`, `educationLevel`, `workExperienceYears`, `academicDegree`, `honorificTitle`, `languageCerts` | Mature tariff calculator (Uzbekistan 2026 BHM = 1,155,000 UZS). Hours field is static config. |
| `PayrollItem` | `scheduledHours`, `completedHours`, `extraCurricularHours`, `hourlyAmount`, `grossTotal`, `netTotal` | All hour fields default to `0` on generation. Manually edited by accountant. |
| `MonthlyPayroll` | `schoolId`, `month`, `year`, `status` (`draft` → `approved` → `paid`) | Batch header. Auto-creates `PayrollItem` snapshots per active `StaffSalary`. |
| `Schedule` | `teacherId`, `subjectId`, `classId`, `status` (`draft` / `validated` / `published` / `archived`), `weekType`, `dayOfWeek`, `timeSlot` | Each row = one lesson slot. Conflict detection exists. No hour-count aggregation service. |
| `Attendance` | `studentId`, `scheduleId?`, `date`, `status` (`present` / `absent` / `late` / `excused`) | **Student-only.** No teacher attendance model. |
| `LeaveRequest` | `requesterId`, `startDate`, `endDate`, `status`, `reason` | Multi-approver workflow. `type` field exists in DTO but **NOT in schema**. Teacher leave does NOT affect schedules or payroll. |
| `Class` | `classTeacherId?`, `gradeLevel`, `academicYear` | Homeroom teacher relation. No section/shift fields. |
| `KpiMetric` / `KpiRecord` | `category` enum includes `TEACHER` | Generic framework. No auto-calculated teacher metrics. |
| `UserBranchAssignment` | `userId`, `branchId`, `role` | Multi-branch teaching support. |

### 2.2 Existing Services

| Module | Capabilities | Gaps for Phase 5A |
|--------|-------------|-------------------|
| `schedule` | CRUD, conflict detection, generator, DnD editor, lifecycle, export | No hour-count aggregation per teacher. No workload validation. |
| `payroll` | StaffSalary CRUD, tariff calculator, monthly payroll generation, advances, PDF slips | `scheduledHours` / `completedHours` are manual. No Schedule → Payroll bridge. |
| `users` | Generic user CRUD, CSV import, branch assignment | No teacher-specific analytics. No workload view. |
| `subjects` | Subject CRUD, `findMine()` for teachers | `hoursPerWeek` is the only load field. No load history. |
| `reports` | Attendance, grades, finance summaries, at-risk students | **No teacher workload reports.** |
| `analytics` (reports) | School pulse, branch comparison, smart alerts | No teacher utilization, no workload imbalance alerts. |
| `kpi` | Generic metric/record framework | `TEACHER` category enum exists but no auto-metrics. |

### 2.3 Frontend State

| Page | Current State | Gap |
|------|--------------|-----|
| `dashboard/staff` | Staff table with tabs: Xodimlar, Foydalanuvchilar, Filiallar, Ta'til so'rovlari, Intizom jurnali, Uchrashuvlar | **"Yuklama" tab is a placeholder.** |
| `dashboard/reports/workload` | Frontend-only calculation: lessons/week, homework count, classes count. Bar chart of top 12. Badges: Normal (0–11), O'rta (12–19), Yuqori (20+) | No backend aggregation. No capacity comparison. No export. |
| `dashboard/schedule` | Full DnD timetable editor with conflict detection, lifecycle, PDF/Excel export | No workload preview before scheduling. No "teacher at capacity" warning. |
| `dashboard/payroll` | Monthly payroll generation, item editing, approval workflow, PDF slips | Hour fields are manual input. No auto-fill from schedule. |

### 2.4 How `Subject.hoursPerWeek` Is Currently Used

1. **Schedule Generator** (`schedule-generator.service.ts`):
   - Loads `hoursPerWeek` from subjects.
   - Expands each subject into `hoursPerWeek` individual lesson instances.
   - Sorts placement difficulty by `hoursPerWeek` descending.
   - Defaults to `2` if null.

2. **Subject DTOs:** `@Min(1) @Max(40)` validation.

3. **Subject Service:** `hoursPerWeek: dto.hoursPerWeek ?? 2` on create.

**NOT used for:** payroll calculation, workload validation, teaching load analytics, capacity planning.

---

## 3. Gap Analysis

### 3.1 Teaching Load (Tarifikatsiya)

| Gap | Severity | Description |
|-----|----------|-------------|
| No `TeachingLoad` entity | 🔴 High | `Subject.hoursPerWeek` is a single scalar. No versioning, no approval workflow, no Excel import, no audit trail. |
| No load validation | 🔴 High | A teacher can be assigned 50+ hours across subjects with no system warning. |
| No academic-year scoping | 🟡 Medium | Subjects are not versioned by academic year. Re-using a subject next year carries stale `hoursPerWeek`. |
| No group-type support | 🟡 Medium | Uzbek schools have "sinf" (class) and "guruh" (group, e.g., for language electives). No `groupType` field. |
| No split-class support | 🟡 Medium | Large classes split into sub-groups for labs/PE. No `isSplitClass` or sub-group tracking. |
| No coefficient support | 🟡 Medium | Some subjects (labs, PE, arts) have higher hour coefficients in Uzbek tariff. No field for this. |
| Generator depends on `Subject.hoursPerWeek` | 🔴 High | Any change to how hours are stored must maintain backward compatibility with the generator. |

### 3.2 Teacher Workload Balancing

| Gap | Severity | Description |
|-----|----------|-------------|
| No backend workload aggregation | 🔴 High | `reports/workload` computes everything in frontend by fetching ALL schedules. Not scalable. |
| No capacity enforcement | 🔴 High | `StaffSalary.weeklyLessonHours` (default 18) is never checked against actual assignment. |
| No overload/underload alerts | 🟡 Medium | No smart alerts when a teacher exceeds capacity or falls below minimum. |
| No cross-branch load view | 🟡 Medium | `UserBranchAssignment` allows multi-branch teaching, but no aggregated workload across branches. |
| No planned vs actual reconciliation | 🟡 Medium | `Subject.hoursPerWeek` says 4 hours, but published schedule may have 3 or 5 slots. No validation. |
| No workload rebalancing UI | 🟡 Medium | No tool to suggest or execute reassignment of subjects to balance load. |

### 3.3 Payroll Linkage

| Gap | Severity | Description |
|-----|----------|-------------|
| Manual hour entry | 🔴 High | `PayrollItem.scheduledHours` and `completedHours` default to `0`. Accountant types them in. |
| No Schedule → Payroll bridge | 🔴 High | No service counts a teacher's published schedule slots in a month and writes to `PayrollItem`. |
| No attendance-based completion | 🔴 High | `completedHours` is manual. No integration with student attendance to infer "lesson was held". |
| No leave impact | 🟡 Medium | Approved teacher leave does NOT reduce `completedHours` or mark slots as cancelled. |
| No extra-curricular source | 🟡 Medium | `extraCurricularHours` is manual. No link to `Club` or other activities. |
| No substitution cost | 🟡 Medium | If a substitute teacher covers an absence, there's no model to track those hours for payment. |

### 3.4 Teacher Absence

| Gap | Severity | Description |
|-----|----------|-------------|
| No teacher attendance model | 🔴 High | `Attendance` is student-only. |
| Leave type not persisted | 🟡 Medium | `LeaveRequest.type` (sick/personal/family) is in DTO but NOT in database schema. |
| No schedule impact | 🔴 High | Approved teacher leave does not mark schedule slots as affected. |
| No substitution tracking | 🔴 High | No `Substitution` model. No way to assign a replacement teacher. |
| No absence-to-payroll flow | 🟡 Medium | Approved leave doesn't flow to payroll reduction or substitution cost. |

### 3.5 Analytics

| Gap | Severity | Description |
|-----|----------|-------------|
| No teacher utilization backend | 🔴 High | No API returns `actualHours / capacityHours` per teacher. |
| No room utilization | 🟡 Medium | No analytics on room occupancy rates. |
| No schedule density | 🟡 Medium | No heatmap data for day×slot occupancy. |
| No conflict heatmaps | 🟡 Medium | Conflict detection exists but no aggregate "where do conflicts cluster" view. |
| No teacher performance correlation | 🟡 Medium | No linking of student outcomes (grades, attendance) to the teacher who taught the subject. |
| No teacher KPI auto-calculation | 🟡 Medium | KPI framework exists but no automated teacher metrics. |

---

## 4. Architecture Design

### 4.1 Module Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                         Phase 5A Modules                         │
├─────────────────────────────────────────────────────────────────┤
│  teaching-load        │  TeachingLoad CRUD, Excel import,        │
│                       │  validation, approval workflow           │
├─────────────────────────────────────────────────────────────────┤
│  teacher-workload     │  Aggregation queries, capacity checks,   │
│                       │  overload alerts, balancing suggestions  │
├─────────────────────────────────────────────────────────────────┤
│  payroll-bridge       │  Auto-populate PayrollItem from          │
│  (foundation only)    │  Schedule + Attendance + Leave           │
├─────────────────────────────────────────────────────────────────┤
│  teacher-absence      │  LeaveRequest schema extension,          │
│  (groundwork)         │  Substitution model design               │
├─────────────────────────────────────────────────────────────────┤
│  analytics            │  Teacher utilization, room utilization,  │
│                       │  density heatmaps, conflict heatmaps     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Teaching   │────▶│   Subject    │────▶│  Schedule   │
│   Load      │     │  (hoursPw)   │     │  Generator  │
│  (source)   │     │  (derived)   │     │  (consumer) │
└─────────────┘     └──────────────┘     └─────────────┘
        │                                    │
        │                                    ▼
        │                           ┌─────────────┐
        │                           │   Published │
        │                           │   Schedule  │
        │                           └──────┬──────┘
        │                                  │
        ▼                                  ▼
┌──────────────┐                 ┌──────────────┐
│ Teacher      │                 │ Payroll      │
│ Workload     │◄────────────────│ Bridge       │
│ (analytics)  │   aggregated    │ (foundation) │
└──────────────┘   hours         └──────────────┘
```

### 4.3 Key Design Decisions

1. **TeachingLoad vs Subject.hoursPerWeek:**
   - `TeachingLoad` becomes the **authoritative** source for planned hours.
   - `Subject.hoursPerWeek` becomes a **derived/cache** field, populated from the active `TeachingLoad` for that subject.
   - The Schedule Generator continues to read `Subject.hoursPerWeek` (no breaking change).
   - A sync job or trigger updates `Subject.hoursPerWeek` when `TeachingLoad` is approved.

2. **StaffSalary.weeklyLessonHours as capacity:**
   - This field becomes the teacher's **contractual capacity**.
   - Workload balancing compares `SUM(TeachingLoad.hoursPerWeek)` against `StaffSalary.weeklyLessonHours`.
   - Overload threshold: `> weeklyLessonHours × 1.1` (10% tolerance).
   - Underload threshold: `< weeklyLessonHours × 0.8` (20% shortfall).

3. **Payroll Bridge (foundation only):**
   - A new service method `computeScheduledHours(teacherId, month, year)` counts published `Schedule` slots for the teacher in the given month.
   - It writes to `PayrollItem.scheduledHours` during payroll generation.
   - `completedHours` requires teacher attendance/lesson-completion tracking — Phase 5B scope.
   - For Phase 5A, we design the bridge but only implement the `scheduledHours` auto-fill.

4. **Teacher Absence (groundwork only):**
   - Extend `LeaveRequest` schema with `type` enum (`sick`, `personal`, `family`, `other`, `professional`).
   - Design `TeacherSubstitution` model (do NOT implement full workflow yet).
   - Document how substitution hours would flow to payroll.

---

## 5. Database Plan

### 5.1 New Models

#### `TeachingLoad`

The formal teaching-load record for Uzbek `tarifikatsiya`.

```prisma
model TeachingLoad {
  id              String   @id @default(uuid())
  schoolId        String
  branchId        String
  teacherId       String
  subjectId       String
  classId         String

  // Core load fields
  hoursPerWeek    Int      @default(2)  // Soat/hafta
  hoursPerYear    Int?                   // Yillik soat (optional)
  lessonsPerWeek  Int?                   // Darslar soni/hafta (if lesson ≠ 1 hour)

  // Uzbek-specific fields
  groupType       GroupType @default(class)   // class | group | elective | club
  isSplitClass    Boolean   @default(false)   // Bo'lingan sinf (lab/PE)
  coefficient     Float     @default(1.0)     // Tarif koeffitsienti (labs = 1.25, etc.)
  semester        Semester?                  // first | second | full_year

  // Workflow
  status          LoadStatus @default(draft)   // draft | validated | approved | archived
  approvedBy      String?
  approvedAt      DateTime?
  academicYear    String                     // e.g., "2025-2026"
  effectiveFrom   DateTime   @db.Date
  effectiveTo     DateTime?  @db.Date

  // Metadata
  notes           String?
  importedFrom    String?    // "excel_2025_09_01" or null
  createdById     String
  createdAt       DateTime   @default(now())
  updatedAt       DateTime   @updatedAt

  // Relations
  school    School    @relation(fields: [schoolId], references: [id])
  branch    Branch    @relation(fields: [branchId], references: [id])
  teacher   User      @relation("TeacherLoads", fields: [teacherId], references: [id])
  subject   Subject   @relation(fields: [subjectId], references: [id])
  class     Class     @relation(fields: [classId], references: [id])
  approver  User?     @relation("LoadApprover", fields: [approvedBy], references: [id])
  creator   User      @relation("LoadCreator", fields: [createdById], references: [id])

  @@index([schoolId, academicYear])
  @@index([teacherId, academicYear, status])
  @@index([branchId, academicYear, status])
  @@index([subjectId, academicYear])
}
```

**Rationale for each field:**
- `hoursPerWeek` / `hoursPerYear`: Core load metrics.
- `lessonsPerWeek`: In Uzbek schools, a "lesson" may be 45 min or 90 min (double period). `hoursPerWeek` = `lessonsPerWeek × lessonDuration`.
- `groupType`: Distinguishes regular class lessons from electives, clubs, and remedial groups.
- `isSplitClass`: Large classes (e.g., 30+ students) are split into A/B groups for labs and PE.
- `coefficient`: Uzbek tariff uses subject coefficients (e.g., chemistry lab = 1.25× base rate).
- `semester`: Some subjects are only taught in one semester.
- `status`: Approval workflow mirrors Schedule lifecycle (`draft` → `validated` → `approved`).
- `academicYear`: Critical for versioning — next year's load may differ.
- `effectiveFrom` / `effectiveTo`: Support mid-year changes (e.g., teacher swap).
- `importedFrom`: Audit trail for Excel imports.

#### `TeacherSubstitution` (design only — Phase 5B implementation)

```prisma
model TeacherSubstitution {
  id                  String   @id @default(uuid())
  schoolId            String
  branchId            String
  scheduleId          String
  originalTeacherId   String
  substituteTeacherId String
  date                DateTime @db.Date
  reason              String?  // leave | sick | other
  status              SubstitutionStatus @default(pending)  // pending | confirmed | cancelled
  notes               String?
  createdById         String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  school              School    @relation(fields: [schoolId], references: [id])
  branch              Branch    @relation(fields: [branchId], references: [id])
  schedule            Schedule  @relation(fields: [scheduleId], references: [id])
  originalTeacher     User      @relation("OriginalSubstitutions", fields: [originalTeacherId], references: [id])
  substituteTeacher   User      @relation("SubstituteAssignments", fields: [substituteTeacherId], references: [id])
  creator             User      @relation("SubstitutionCreator", fields: [createdById], references: [id])

  @@index([schoolId, date])
  @@index([originalTeacherId, date])
  @@index([substituteTeacherId, date])
}
```

#### `TeacherAttendance` (design only — Phase 5B implementation)

Option A: Extend existing `Attendance` model (make `studentId` optional, add `teacherId`).  
Option B: Create separate `TeacherAttendance` model.

**Recommendation: Option B** — cleaner, avoids confusing student/teacher logic, allows different statuses (`present`, `absent`, `sick`, `on_leave`, `remote`).

```prisma
model TeacherAttendance {
  id          String   @id @default(uuid())
  schoolId    String
  branchId    String
  teacherId   String
  scheduleId  String?  // Optional — can mark daily without specific slot
  date        DateTime @db.Date
  status      TeacherAttendanceStatus @default(present)  // present | absent | sick | on_leave | remote
  note        String?
  createdById String?
  createdAt   DateTime @default(now())

  school   School @relation(fields: [schoolId], references: [id])
  branch   Branch @relation(fields: [branchId], references: [id])
  teacher  User   @relation(fields: [teacherId], references: [id])
  schedule Schedule? @relation(fields: [scheduleId], references: [id])

  @@index([teacherId, date])
  @@index([schoolId, date])
  @@unique([teacherId, scheduleId, date])
}
```

### 5.2 Schema Modifications

#### `LeaveRequest` — add `type` field

```prisma
model LeaveRequest {
  // ... existing fields ...
  type    LeaveType?  // sick | personal | family | other | professional
  // ...
}
```

This is a **non-breaking additive change.** Existing records will have `null`.

#### `Subject` — keep `hoursPerWeek`, add relation to `TeachingLoad`

```prisma
model Subject {
  // ... existing fields ...
  teachingLoads TeachingLoad[]
  // ...
}
```

`Subject.hoursPerWeek` remains for backward compatibility with the Schedule Generator.

#### `StaffSalary` — no schema changes, but semantic upgrade

`weeklyLessonHours` becomes the **contractual capacity** against which `TeachingLoad` is validated.

### 5.3 New Enums

```prisma
enum GroupType {
  class       // Oddiy dars
  group       // Guruh (til kursi, qo'shimcha)
  elective    // Tanlov fani
  club        // To'garak
}

enum Semester {
  first
  second
  full_year
}

enum LoadStatus {
  draft
  validated
  approved
  archived
}

enum LeaveType {
  sick
  personal
  family
  other
  professional
}

enum SubstitutionStatus {
  pending
  confirmed
  cancelled
}

enum TeacherAttendanceStatus {
  present
  absent
  sick
  on_leave
  remote
}
```

### 5.4 Migration Strategy

**Migration `20260621000000_add_teaching_load`:**

1. Create `TeachingLoad` table.
2. Add `type` to `LeaveRequest` (nullable).
3. Add `teachingLoads` relation to `Subject`.
4. Seed initial `TeachingLoad` records from existing `Subject` rows:
   ```sql
   INSERT INTO "TeachingLoad" (id, schoolId, branchId, teacherId, subjectId, classId, hoursPerWeek, groupType, semester, status, academicYear, effectiveFrom, createdById)
   SELECT gen_random_uuid(), s.schoolId, s.branchId, s.teacherId, s.id, s.classId, s.hoursPerWeek, 'class', 'full_year', 'approved', '2025-2026', CURRENT_DATE, 'system'
   FROM "Subject" s;
   ```
5. Create indexes.

**Risk:** If `Subject.hoursPerWeek` is null in some rows, default to `2` in seeding.

---

## 6. API Plan

### 6.1 Teaching Load Module (`/api/v1/teaching-load`)

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/teaching-load` | List loads with filters (teacher, class, subject, status, academicYear) | Director, VP, Branch Admin |
| GET | `/teaching-load/:id` | Get single load with relations | Director, VP, Branch Admin |
| POST | `/teaching-load` | Create load | Director, VP, Branch Admin |
| PUT | `/teaching-load/:id` | Update load (status must be draft) | Director, VP, Branch Admin |
| DELETE | `/teaching-load/:id` | Delete load (status must be draft) | Director, VP, Branch Admin |
| POST | `/teaching-load/:id/validate` | Validate load (draft → validated) | Director, VP, Branch Admin |
| POST | `/teaching-load/:id/approve` | Approve load (validated → approved) | Director, VP |
| POST | `/teaching-load/:id/archive` | Archive load | Director, VP |
| POST | `/teaching-load/import/excel` | Bulk import from Excel | Director, VP, Branch Admin |
| GET | `/teaching-load/template/excel` | Download import template | Director, VP, Branch Admin |
| GET | `/teaching-load/by-teacher/:teacherId` | All loads for a teacher | Director, VP, Branch Admin |
| GET | `/teaching-load/by-class/:classId` | All loads for a class | Director, VP, Branch Admin |

**Validation rules:**
- `hoursPerWeek` must be ≥ 1 and ≤ 40.
- `effectiveFrom` < `effectiveTo` (if `effectiveTo` is set).
- Only one `APPROVED` load per `(teacherId, subjectId, classId, academicYear)` at a time.
- Branch Admin can only create loads for their own branch.

**Excel import columns:**
- `teacher_email` (or `teacher_id`)
- `subject_name` (or `subject_id`)
- `class_name` (or `class_id`)
- `hours_per_week`
- `group_type` (class/group/elective/club)
- `is_split_class` (yes/no)
- `coefficient` (default 1.0)
- `semester` (first/second/full_year)
- `academic_year`
- `notes`

### 6.2 Teacher Workload Module (`/api/v1/teacher-workload`)

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/teacher-workload` | Aggregated workload for all teachers | Director, VP, Branch Admin |
| GET | `/teacher-workload/:teacherId` | Detailed workload for one teacher | Director, VP, Branch Admin, Teacher (own) |
| GET | `/teacher-workload/:teacherId/balance` | Load vs capacity comparison | Director, VP, Branch Admin, Teacher (own) |
| GET | `/teacher-workload/alerts` | Overload / underload alerts | Director, VP, Branch Admin |
| GET | `/teacher-workload/distribution` | Load distribution histogram | Director, VP |
| GET | `/teacher-workload/coverage-gaps` | Classes/subjects without assigned teachers | Director, VP, Branch Admin |

**Response shape for `/teacher-workload/:teacherId`:**

```typescript
interface TeacherWorkloadDetail {
  teacherId: string;
  teacherName: string;
  branchId: string;
  capacityHours: number;        // from StaffSalary.weeklyLessonHours
  plannedHours: number;         // SUM(TeachingLoad.hoursPerWeek)
  scheduledHours: number;       // COUNT(Schedule) × avg lesson duration
  completedHours: number;       // Placeholder for Phase 5B
  extraCurricularHours: number; // from clubs/activities
  overloadHours: number;        // max(0, plannedHours - capacityHours)
  underloadHours: number;       // max(0, capacityHours - plannedHours)
  utilizationRate: number;      // plannedHours / capacityHours
  subjects: Array<{
    subjectId: string;
    subjectName: string;
    classId: string;
    className: string;
    hoursPerWeek: number;
    groupType: GroupType;
    coefficient: number;
  }>;
  crossBranchAssignments: Array<{
    branchId: string;
    branchName: string;
    hoursPerWeek: number;
  }>;
}
```

### 6.3 Payroll Bridge (Foundation)

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/payroll/scheduled-hours-preview` | Preview scheduled hours for a given month/year before payroll generation | Director, VP, Accountant |
| POST | `/payroll/:payrollId/compute-hours` | Auto-populate `PayrollItem.scheduledHours` from published schedules | Director, VP, Accountant |

**Service method signature:**

```typescript
// In PayrollService or new PayrollBridgeService
async computeScheduledHours(
  schoolId: string,
  month: number,      // 1-12
  year: number,
): Promise<Map<string, number>>  // teacherId → scheduledHourCount
```

**Algorithm:**
1. Find all `Schedule` slots where:
   - `schoolId = :schoolId`
   - `status = 'published'`
   - `dayOfWeek` falls within the month/year
   - `weekType` matches the ISO week of each scheduled day
2. Group by `teacherId`.
3. Count slots per teacher.
4. Convert slot count to hours (using `Period` duration or default 1 hour).
5. Write to `PayrollItem.scheduledHours` for the matching `MonthlyPayroll`.

### 6.4 Teacher Absence Groundwork

No new endpoints in Phase 5A. Schema changes only:
- Add `type` to `LeaveRequest`.
- Design `TeacherSubstitution` and `TeacherAttendance` models (documented in DB plan).

### 6.5 Analytics Module

| Method | Endpoint | Description | RBAC |
|--------|----------|-------------|------|
| GET | `/analytics/teacher-utilization` | % utilization per teacher | Director, VP, Branch Admin |
| GET | `/analytics/room-utilization` | Room occupancy heatmap | Director, VP, Branch Admin |
| GET | `/analytics/schedule-density` | Day×slot occupancy matrix | Director, VP, Branch Admin |
| GET | `/analytics/conflict-heatmap` | Aggregate conflict locations | Director, VP, Branch Admin |
| GET | `/analytics/export/workload` | Excel export of all workloads | Director, VP |

**Response shape for `/analytics/teacher-utilization`:**

```typescript
interface TeacherUtilization {
  teacherId: string;
  name: string;
  capacity: number;
  planned: number;
  scheduled: number;
  utilizationRate: number;  // 0.0 - 1.0+
  status: 'underutilized' | 'normal' | 'overloaded';
}
```

**Response shape for `/analytics/schedule-density`:**

```typescript
interface ScheduleDensity {
  days: DayOfWeek[];
  slots: number[];  // timeSlot numbers
  matrix: number[][];  // matrix[dayIndex][slotIndex] = occupancy count
  maxCapacity: number;  // total rooms or total classes
}
```

---

## 7. RBAC Plan

### 7.1 Teaching Load

| Role | Create | Read | Update | Delete | Validate | Approve | Import |
|------|--------|------|--------|--------|----------|---------|--------|
| Director | ✅ | ✅ All | ✅ All | ✅ All | ✅ | ✅ | ✅ |
| VP | ✅ | ✅ All | ✅ All | ✅ All | ✅ | ✅ | ✅ |
| Branch Admin | ✅ Own branch | ✅ Own branch | ✅ Own branch | ✅ Own branch | ✅ Own branch | ❌ | ✅ Own branch |
| Teacher | ❌ | ✅ Own only | ❌ | ❌ | ❌ | ❌ | ❌ |
| Accountant | ❌ | ✅ All | ❌ | ❌ | ❌ | ❌ | ❌ |
| Student | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Parent | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### 7.2 Teacher Workload

| Role | View All | View Own | View Alerts | View Distribution |
|------|----------|----------|-------------|-------------------|
| Director | ✅ | — | ✅ | ✅ |
| VP | ✅ | — | ✅ | ✅ |
| Branch Admin | ✅ Own branch | — | ✅ Own branch | ✅ Own branch |
| Teacher | ❌ | ✅ | ❌ | ❌ |
| Accountant | ✅ | — | ✅ | ❌ |

### 7.3 Payroll Bridge

| Role | Preview Hours | Compute Hours |
|------|---------------|---------------|
| Director | ✅ | ✅ |
| VP | ✅ | ✅ |
| Accountant | ✅ | ✅ |
| Branch Admin | ❌ | ❌ |
| Teacher | ❌ | ❌ |

### 7.4 Analytics

| Role | All Analytics Endpoints |
|------|------------------------|
| Director | ✅ |
| VP | ✅ |
| Branch Admin | ✅ Own branch |
| Teacher | ❌ (may add "own" view in Phase 5B) |
| Accountant | ✅ |

### 7.5 Defense-in-Depth

Following Phase 4 hardening principles:
- Controller `@Roles()` guards enforce coarse access.
- Service-level `assertCanManage()` enforces branch scope and role rules.
- `buildTenantWhere()` filters by `schoolId` / `branchId` at database level.
- All mutations log to `AuditLog` with `oldData` / `newData`.

---

## 8. Migration Risks & Strategy

### 8.1 Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Generator breaks if `Subject.hoursPerWeek` is removed | Low | 🔴 Critical | Do NOT remove `Subject.hoursPerWeek`. Keep it as a derived field. |
| Excel import creates duplicate loads | Medium | 🟡 High | Unique constraint on `(teacherId, subjectId, classId, academicYear, status = approved)`. Deduplicate in import service. |
| `StaffSalary.weeklyLessonHours` is `0` or `null` for many staff | Medium | 🟡 High | Migration script: set default to `18` where `role IN ('teacher', 'class_teacher')` and `weeklyLessonHours IS NULL`. |
| PayrollItem auto-fill overwrites accountant's manual edits | Low | 🟡 High | Only auto-fill `scheduledHours` when `PayrollItem` is first created (in `generatePayroll`). Never overwrite after creation. |
| `TeachingLoad` seed from `Subject` creates wrong `academicYear` | Medium | 🟡 Medium | Make `academicYear` configurable during migration. Default to current year. Allow re-seeding. |
| Branch Admin creates load for teacher in another branch | Low | 🟡 Medium | Service-level branch check + `buildTenantWhere()`. |
| Performance: workload aggregation on 1200+ schedules | Low | 🟡 Medium | Use Prisma aggregations + indexes. Cache results in Redis with 5-min TTL. |

### 8.2 Migration Scripts

**Script 1: ` TeachingLoad` table creation + seeding**

```sql
-- Create TeachingLoad table (Prisma migration handles this)

-- Seed from existing Subjects
INSERT INTO "TeachingLoad" (
  id, schoolId, branchId, teacherId, subjectId, classId,
  hoursPerWeek, groupType, isSplitClass, coefficient, semester,
  status, academicYear, effectiveFrom, createdById, createdAt
)
SELECT
  gen_random_uuid(),
  s.schoolId,
  s.branchId,
  s.teacherId,
  s.id,
  s.classId,
  COALESCE(s.hoursPerWeek, 2),
  'class',
  false,
  1.0,
  'full_year',
  'approved',
  '2025-2026',  -- CONFIGURABLE
  CURRENT_DATE,
  'system',
  NOW()
FROM "Subject" s
WHERE s.teacherId IS NOT NULL;

-- Backfill StaffSalary.weeklyLessonHours for teachers without it
UPDATE "StaffSalary"
SET "weeklyLessonHours" = 18
WHERE "weeklyLessonHours" IS NULL
  AND userId IN (
    SELECT id FROM "User" WHERE role IN ('teacher', 'class_teacher')
  );
```

**Script 2: LeaveRequest.type backfill**

```sql
ALTER TABLE "LeaveRequest" ADD COLUMN "type" TEXT;
-- Existing records have NULL — acceptable
```

### 8.3 Rollback Plan

If Phase 5A needs rollback:
1. `TeachingLoad` table can be dropped without affecting `Subject.hoursPerWeek`.
2. Schedule Generator continues to work because it reads `Subject.hoursPerWeek` directly.
3. Payroll items with auto-filled `scheduledHours` are already snapshots — no data loss.
4. `LeaveRequest.type` is nullable — dropping the column is safe.

---

## 9. Phased Implementation Proposal

### Phase 5A.1 — Teaching Load Entity (Week 1–2)

**Goal:** `TeachingLoad` CRUD + Excel import + validation.

**Tasks:**
1. Create Prisma migration for `TeachingLoad`, `GroupType`, `Semester`, `LoadStatus`.
2. Create `TeachingLoadModule` (controller, service, DTOs).
3. Implement CRUD with branch scope and status lifecycle.
4. Implement Excel import with template download.
5. Add unique constraint enforcement.
6. Add service-level RBAC (`assertCanManage()` pattern).
7. Seed `TeachingLoad` from existing `Subject` rows.
8. Frontend: Teaching Load management page (list, create, edit, import).

**Deliverable:** Directors can create, edit, import, and approve teaching loads.

### Phase 5A.2 — Workload Balancing (Week 2–3)

**Goal:** Backend workload aggregation + alerts + frontend dashboard.

**Tasks:**
1. Create `TeacherWorkloadModule` (service, controller).
2. Implement aggregation queries:
   - Total planned hours per teacher (from `TeachingLoad`).
   - Total scheduled hours per teacher (from published `Schedule`).
   - Capacity comparison (from `StaffSalary.weeklyLessonHours`).
3. Implement overload/underload alert logic.
4. Implement coverage-gap detection.
5. Add Redis caching for workload queries (5-min TTL).
6. Frontend: Replace `reports/workload` pure-frontend calculation with backend data.
7. Frontend: Staff workspace "Yuklama" tab — real capacity visualization.

**Deliverable:** Admins see real-time workload balancing with alerts.

### Phase 5A.3 — Payroll Bridge Foundation (Week 3–4)

**Goal:** Auto-populate `PayrollItem.scheduledHours` from published schedules.

**Tasks:**
1. Create `PayrollBridgeService` (or extend `PayrollService`).
2. Implement `computeScheduledHours(teacherId, month, year)`.
3. Integrate into `PayrollService.generatePayroll()` — auto-fill on creation.
4. Add `/payroll/scheduled-hours-preview` endpoint.
5. Add audit logging for auto-filled hours.
6. Frontend: Payroll generation UI shows "Scheduled hours (auto)" vs manual fields.

**Deliverable:** Payroll generation automatically counts scheduled hours. Accountants can preview before generating.

### Phase 5A.4 — Teacher Absence Groundwork (Week 4)

**Goal:** Schema extension + substitution model design.

**Tasks:**
1. Add `type` to `LeaveRequest` schema + DTO + migration.
2. Create `TeacherSubstitution` model (migration only — no endpoints yet).
3. Create `TeacherAttendance` model (migration only — no endpoints yet).
4. Document substitution workflow for Phase 5B.
5. Document absence-to-payroll flow for Phase 5B.

**Deliverable:** Database ready for teacher absence/substitution. Design documents complete.

### Phase 5A.5 — Analytics (Week 4–5)

**Goal:** Backend analytics endpoints + frontend visualizations.

**Tasks:**
1. Create `TeacherAnalyticsModule` (service, controller).
2. Implement `/analytics/teacher-utilization`.
3. Implement `/analytics/room-utilization`.
4. Implement `/analytics/schedule-density`.
5. Implement `/analytics/conflict-heatmap`.
6. Implement `/analytics/export/workload` (Excel).
7. Frontend: Analytics dashboard with charts.

**Deliverable:** Full analytics suite for teaching load and resource utilization.

### 5A.6 — Stabilization & Hardening (Week 5)

**Goal:** Tests, performance audit, RBAC audit, documentation.

**Tasks:**
1. Unit tests for `TeachingLoadService` (CRUD, validation, import).
2. Unit tests for `TeacherWorkloadService` (aggregation, alerts).
3. Unit tests for `PayrollBridgeService` (hour counting).
4. RBAC penetration tests (roles × actions matrix).
5. Performance benchmark: workload aggregation at 1200+ schedules.
6. Update `AGENTS.md` if conventions changed.
7. Production audit document.

**Deliverable:** Production-ready teaching load system.

---

## 10. Open Questions

1. **Should `TeachingLoad` completely replace `Subject.hoursPerWeek` eventually?**
   - Yes, but not in Phase 5A. In Phase 5B, `Subject.hoursPerWeek` becomes a computed field from the active `TeachingLoad`.

2. **How is a "lesson hour" defined?**
   - Currently each `Schedule` slot = 1 lesson. Duration comes from `Period` (e.g., 45 min).
   - For payroll, should we count "slots" or "actual minutes / 60"?
   - **Proposal:** Count slots for simplicity in Phase 5A. Use `Period` duration for precise hour calculation in Phase 5B.

3. **Should `TeachingLoad` support multiple teachers per subject (co-teaching)?**
   - Currently `Subject.teacherId` is 1:1. `TeachingLoad` follows this constraint.
   - **Proposal:** Keep 1:1 in Phase 5A. Design co-teaching support for Phase 5B (junction table).

4. **What about clubs and extracurricular activities?**
   - `GroupType.club` exists in the design.
   - **Proposal:** Clubs are out of scope for Phase 5A scheduling integration. Include them in workload totals but not in schedule generator.

5. **Should teacher workload be visible to teachers themselves?**
   - Yes — teachers can view their own workload via `/teacher-workload/:teacherId` with `own-only` enforcement.
   - **Proposal:** Implement in Phase 5A.2.

6. **How do we handle mid-year teacher changes?**
   - `TeachingLoad.effectiveFrom` / `effectiveTo` support this.
   - When a new `TeachingLoad` is approved, the old one for the same `(teacher, subject, class, year)` is auto-archived.

---

## Appendix A: File Inventory (New Files)

```
apps/backend/prisma/migrations/20260621000000_add_teaching_load/

apps/backend/src/modules/teaching-load/
├── teaching-load.module.ts
├── teaching-load.controller.ts
├── teaching-load.service.ts
├── teaching-load.service.spec.ts
├── dto/
│   ├── create-teaching-load.dto.ts
│   ├── update-teaching-load.dto.ts
│   └── import-teaching-load.dto.ts
└── teaching-load-import.service.ts

apps/backend/src/modules/teacher-workload/
├── teacher-workload.module.ts
├── teacher-workload.controller.ts
├── teacher-workload.service.ts
└── teacher-workload.service.spec.ts

apps/backend/src/modules/payroll/
├── payroll-bridge.service.ts
└── payroll-bridge.service.spec.ts

apps/backend/src/modules/analytics/
├── teacher-analytics.module.ts
├── teacher-analytics.controller.ts
├── teacher-analytics.service.ts
└── teacher-analytics.service.spec.ts

apps/frontend/src/app/(dashboard)/dashboard/teaching-load/
├── page.tsx
└── _components/
    ├── teaching-load-workspace.tsx
    ├── teaching-load-form.tsx
    └── teaching-load-import-modal.tsx

apps/frontend/src/app/(dashboard)/dashboard/reports/workload/
└── page.tsx           (refactor to use backend data)

apps/frontend/src/lib/api/teaching-load.ts
apps/frontend/src/lib/api/teacher-workload.ts
apps/frontend/src/lib/api/teacher-analytics.ts
```

## Appendix B: Enum Additions (`packages/types`)

```typescript
export enum GroupType {
  CLASS = 'class',
  GROUP = 'group',
  ELECTIVE = 'elective',
  CLUB = 'club',
}

export enum Semester {
  FIRST = 'first',
  SECOND = 'second',
  FULL_YEAR = 'full_year',
}

export enum LoadStatus {
  DRAFT = 'draft',
  VALIDATED = 'validated',
  APPROVED = 'approved',
  ARCHIVED = 'archived',
}

export enum LeaveType {
  SICK = 'sick',
  PERSONAL = 'personal',
  FAMILY = 'family',
  OTHER = 'other',
  PROFESSIONAL = 'professional',
}
```

---

*Document version: 1.0*  
*Prepared for Phase 5A review. No implementation until approved.*
