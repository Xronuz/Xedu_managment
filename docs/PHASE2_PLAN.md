# Phase 2 Plan: Timetable Auto-Generator & Import Hardening

> Status: **PLAN ONLY** — awaiting approval before implementation.
> Dependencies: Phase 1 (Periods, Room-aware schedule, ConflictDetector)

---

## 1. Post-Phase-1 Import Audit

### 1.1 Current State (after Phase 1)

The Excel import for schedules (`ImportService.commitSchedule`) was partially updated during Phase 1:

| What Works | What Changed in Phase 1 |
|-----------|------------------------|
| Period validation against DB | `tx.period.findFirst` checks active period for `{schoolId, branchId, timeSlot}` |
| Period time strictness | `startTime`/`endTime` in Excel must exactly match configured period |
| Teacher-subject match | Explicit check that `subject.teacherId === row.teacherId` |
| Branch ownership | Validates `class.schoolId === currentUser.schoolId` |
| Basic conflict checks | Teacher, room (by `roomNumber`), class conflicts via `tx.findFirst` |

### 1.2 Gaps Identified

| # | Gap | Severity | Recommended Fix |
|---|-----|----------|-----------------|
| G1 | **`roomId` not supported** — import only handles `roomNumber` (plain text). Manual form supports `roomId` dropdown. Relational room benefits (FK, capacity, type-aware conflict) are lost for imported rows. | **High** | Add `roomId` column to template & parser; keep `roomNumber` as fallback for legacy files. In `commitSchedule`, validate `roomId` via `prisma.room.findFirst({schoolId, branchId})` just like `ScheduleService.create()`. |
| G2 | **`commitSchedule` bypasses `ConflictDetectorService`** — uses manual `tx.findFirst` checks instead of the centralized UTC-aware detector used by `ScheduleService.create()`. This means imported schedules get `null` for `startDayMinUtc`/`endDayMinUtc`, breaking any downstream query that relies on UTC minutes. | **High** | Refactor `commitSchedule` to compute UTC minutes via `toWeeklyUtcMin()` and call `ConflictDetectorService.checkClash()` (or assertNoClash) before insert. Alternatively, delegate each row to `ScheduleService.create()` inside the transaction (requires injecting `ScheduleService` into `ImportService`). |
| G3 | **Period validation happens at commit, not parse** — user only discovers mismatched/missing periods after upload, during commit. Poor UX. | **Medium** | Optional: add a `parseSchedule` pre-validation step that queries active periods for the branch and flags rows with invalid `timeSlot` or mismatched times before the user hits Commit. |
| G4 | **No room existence validation in import** — `roomNumber` is accepted even if no `Room` record exists with that name. | **Medium** | If `roomId` column is added, validate existence. If `roomNumber` is used, optionally warn if it doesn't match any `Room.name` in the branch. |
| G5 | **Template doesn't reflect Phase 1 reality** — `generateTemplate('schedule')` produces columns that force user to compute `startTime`/`endTime` manually, even though these are now derived from `Period` config. | **Medium** | Template could drop `startTime`/`endTime` columns and only require `timeSlot`, or keep them as read-only hints populated from period config. |
| G6 | **RBAC mismatch** — `ImportController` allows `director` and `vice_principal` only; `ScheduleController` also allows `branch_admin`. | **Low** | Align import RBAC with schedule CRUD RBAC. |

### 1.3 Recommended Import Hardening Tasks (Pre-Generator)

1. **Add `roomId` support to import** (template, parser, commit validation)
2. **Refactor `commitSchedule` to use `ConflictDetectorService`** and populate `startDayMinUtc`/`endDayMinUtc`
3. **Align import RBAC** with schedule controller (`branch_admin` included)
4. **Optional:** Pre-validate periods during parse for better UX

---

## 2. Auto-Generator Input Model

### 2.1 What Data Already Exists

| Source | Data | Reliability |
|--------|------|-------------|
| `Period` | Available time slots (`periodNumber`, `startTime`, `endTime`) per branch | ✅ Solid |
| `Room` | Room inventory (`id`, `name`, `capacity`, `type`, `branchId`) | ✅ Solid |
| `Subject` | Which teacher teaches what subject to which class (`teacherId`, `classId`) | ✅ Solid |
| `Class` | Class list (`id`, `name`, `gradeLevel`, `branchId`, `studentCount` via relation) | ✅ Solid |
| `User` (teacher) | Teacher identities, cross-branch assignments | ✅ Solid |
| `ConflictDetectorService` | Runtime validation of teacher/room/class clashes | ✅ Solid |

### 2.2 What Data Is Missing

| Missing Field | Where It Should Live | Why Needed |
|---------------|----------------------|------------|
| `hoursPerWeek` | `Subject` or new `ClassSubject` junction | Generator must know *how many* slots to place for each class-subject pair. |
| `maxLessonsPerDay` | `Class` or generator config | Prevents 6 math lessons on Monday. |
| `teacherMaxHoursPerDay` | `User` or generator config | Prevents teacher burnout / contractual limits. |
| `roomTypeRequirement` | `Subject` or new `SubjectRoomType` | e.g., "Chemistry needs lab", "PE needs gym". |
| `teacherUnavailability` | New `TeacherAvailability` model | Blocked periods (e.g., doctor appointments, part-time). |
| `consecutiveLessonLimit` | `Subject` or generator config | e.g., "Math max 2 consecutive periods". |
| `priority/weight` | `Subject` or generator config | Which subjects to place first if slots are tight. |

### 2.3 Proposed Generator Input DTO

```typescript
// POST /schedule/generate
export class GenerateScheduleDto {
  /** Target branch (null = all branches for Director) */
  branchId?: string;

  /** Days to generate for (default: monday-saturday) */
  daysOfWeek?: DayOfWeek[];

  /** Specific classes to generate for (null = all classes in branch) */
  classIds?: string[];

  /** Only generate for these subjects (null = all) */
  subjectIds?: string[];

  /** Strategy: 'greedy' | 'backtracking' | 'hybrid' */
  strategy?: 'greedy' | 'backtracking' | 'hybrid';

  /** Max milliseconds before timeout (default: 30000) */
  timeoutMs?: number;

  /** Whether to overwrite existing schedules for target classes/days */
  overwriteExisting?: boolean;
}
```

### 2.4 Proposed Internal Generator Data Model

```typescript
interface GeneratorInput {
  schoolId: string;
  branchId?: string;
  timezone: string;

  /** Available time grid */
  periods: PeriodConfig[]; // from PeriodsService.findAll()
  daysOfWeek: DayOfWeek[];

  /** Demand: what needs to be scheduled */
  demands: LessonDemand[];

  /** Supply: what resources are available */
  rooms: Room[];
  teachers: Teacher[];
  classes: Class[];

  /** Already placed slots (to avoid clashing with) */
  existingSlots: ScheduleSlot[];
}

interface LessonDemand {
  id: string;            // synthetic: `${classId}-${subjectId}`
  classId: string;
  subjectId: string;
  teacherId: string;
  hoursPerWeek: number;  // REQUIRED — source TBD (see §2.5)
  roomType?: RoomType;   // optional compatibility hint
  maxPerDay?: number;    // optional constraint
  priority?: number;     // higher = schedule first
}

interface PeriodConfig {
  periodNumber: number;
  startTime: string;
  endTime: string;
}
```

### 2.5 Open Question: Where Does `hoursPerWeek` Come From?

**Option A — Schema Migration:** Add `hoursPerWeek Int @default(1)` to `Subject` model.
- **Pros:** Simple, one field, easy to edit in UI.
- **Cons:** `Subject` is per-class, so `hoursPerWeek` is naturally scoped. But if the same subject name exists for multiple classes, each has its own value — which is actually correct.

**Option B — Runtime Config:** Store `hoursPerWeek` in a separate `TeachingLoad` or `Curriculum` table keyed by `(schoolId, gradeLevel, subjectName)`.
- **Pros:** Standardized across classes of same grade.
- **Cons:** More complex; subjects may vary by branch.

**Option C — Generator Config Only:** Pass `hoursPerWeek` as part of `GenerateScheduleDto.demands` (user fills a modal before generation).
- **Pros:** No schema change required for Phase 2.
- **Cons:** User must re-enter every time; no persistence.

**Recommendation:** Start with **Option A** (add `hoursPerWeek` to `Subject`) because:
- It's the smallest schema change.
- It aligns with the existing per-class `Subject` model.
- It can be populated via a simple UI in the Subjects page.
- If later a standardized curriculum is needed, Option B can be added without breaking Option A.

---

## 3. Conflict Report Shape

The generator needs to report conflicts when it *fails* to place all demands. This is distinct from the per-row validation errors in import.

### 3.1 Per-Failure Reason Types

```typescript
export type ConflictReason =
  | 'TEACHER_BUSY'           // teacher already scheduled in this slot
  | 'ROOM_BUSY'              // room already scheduled in this slot
  | 'CLASS_BUSY'             // class already scheduled in this slot
  | 'NO_ROOM_AVAILABLE'      // all compatible rooms are occupied
  | 'TEACHER_UNAVAILABLE'    // teacher has blocked this time
  | 'EXCEEDS_DAILY_LIMIT'    // class or teacher would exceed max lessons/day
  | 'EXCEEDS_WEEKLY_LIMIT'   // teacher would exceed weekly hour quota
  | 'PERIOD_NOT_CONFIGURED'  // no Period config for this branch/slot
  | 'BACKTRACK_TIMEOUT';     // algorithm gave up
```

### 3.2 Proposed Conflict Report Structure

```typescript
export interface GeneratorConflictReport {
  /** Summary */
  totalDemands: number;
  placed: number;
  failed: number;

  /** Successfully placed slots (preview / dry-run) */
  proposedSlots: ProposedSlot[];

  /** Demands that could not be placed, with reasons */
  failures: PlacementFailure[];

  /** Aggregate statistics */
  stats: {
    byReason: Record<ConflictReason, number>;
    byTeacher: Record<string, number>;   // teacherId → failure count
    byClass: Record<string, number>;     // classId → failure count
    bySubject: Record<string, number>;   // subjectId → failure count
  };
}

export interface ProposedSlot {
  id: string;              // synthetic ID for preview
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId?: string;
  dayOfWeek: DayOfWeek;
  timeSlot: number;
  startTime: string;
  endTime: string;
}

export interface PlacementFailure {
  demand: LessonDemand;
  attemptedSlots: AttemptedSlot[];
  finalReason: ConflictReason;
  message: string;         // human-readable, localized
}

export interface AttemptedSlot {
  dayOfWeek: DayOfWeek;
  timeSlot: number;
  roomId?: string;
  reason: ConflictReason;  // why this specific attempt failed
}
```

### 3.3 Frontend Presentation

The conflict report should be rendered as:

1. **Summary banner** — "234 ta dars joylashtirildi, 12 ta joylashtirilmadi"
2. **Proposed timetable preview** — Same grid component as manual schedule, but with "Draft" badge and diff highlighting.
3. **Failures panel** — Expandable list grouped by:
   - Teacher ("O'qituvchi Aliev — 3 ta dars joylashmadi")
   - Class ("5-A sinfi — 2 ta dars joylashmadi")
   - Reason ("Xona yetishmasligi — 5 ta")
4. **Action buttons** —
   - "Jadvalni saqlash" (save all proposed slots)
   - "Faqat muvaffaqiyatli slotlarni saqlash" (save placed, ignore failures)
   - "Bekor qilish" (discard)
   - "Qayta urinish" (re-run with different strategy or relaxed constraints)

---

## 4. Algorithm Options

| Strategy | Approach | Pros | Cons | When to Use |
|----------|----------|------|------|-------------|
| **Greedy** | Sort demands by priority/difficulty, place each in first available slot. | Fast (O(n²)), deterministic, easy to debug. | No backtracking — early bad choices can block later demands. | Large schools (50+ classes), tight performance budget, acceptable sub-optimality. |
| **Backtracking (CSP)** | Recursive search with constraint propagation; undo if dead-end. | Optimal (finds solution if one exists). | Exponential worst-case; can hang on large inputs. | Small/medium schools (<20 classes), high constraint density, need completeness. |
| **Hybrid (Recommended)** | Greedy first pass → collect failures → backtracking only on failed demands with relaxed ordering. | Best of both worlds; fast common case, robust fallback. | More complex to implement and test. | **Default for production.** |

**Recommendation:** Implement **Hybrid** with configurable timeout.
- Phase 2 MVP: Greedy only (fast, sufficient for most schools).
- Phase 2.1: Add backtracking fallback for unplaced demands.

---

## 5. Implementation Sequence (if approved)

### 5.1 Pre-Generator: Import Hardening
1. Add `roomId` to import template/parser/commit
2. Refactor `commitSchedule` to use `ConflictDetectorService`
3. Align import RBAC with schedule controller

### 5.2 Schema Additions
1. Add `hoursPerWeek Int @default(2)` to `Subject` model + migration
2. (Optional) Add `maxLessonsPerDay Int?` to `Class` model
3. (Optional) Add `roomType RoomType?` to `Subject` model

### 5.3 Backend: Generator Service
1. Create `ScheduleGeneratorService`
2. Implement `buildInput()` — gather periods, demands, rooms, existing slots
3. Implement `greedyPlace()` — priority-sorted first-fit
4. Implement `ConflictDetectorService` integration for candidate validation
5. Add `POST /schedule/generate` endpoint (Director/VP/Branch Admin)
6. Add `POST /schedule/generate/commit` endpoint (save proposed slots)
7. Unit tests for generator service

### 5.4 Frontend
1. "Avto-jadval" button in schedule toolbar
2. Generator config modal (classes, subjects, strategy, timeout)
3. Conflict report display component
4. Proposed slots preview (reuse WeeklyGrid with draft styling)
5. Save/discard actions

---

## 6. Risk & Mitigation

| Risk | Mitigation |
|------|------------|
| Generator hangs on large schools | Hard timeout (default 30s); return partial result + failures. |
| `hoursPerWeek` data is missing for all subjects | UI prompt before generation; default to 2 if unset. |
| Room-type compatibility not configured | Default to any room; add warning in conflict report. |
| Existing schedules cause near-zero free slots | `overwriteExisting` flag; preview diff before commit. |
| Teachers scheduled across branches | `ConflictDetectorService` already handles school-wide teacher scope. |
| Phase 2 scope creep | Strictly separate "plan" (this doc) from "implementation". Generator MVP = greedy only. |

---

## 7. Decision Checklist for Approval

Before implementation begins, the following should be decided:

- [ ] **Import hardening:** Should G1–G6 be fixed before building the generator, or in parallel?
- [ ] **`hoursPerWeek` source:** Option A (Subject field), B (Curriculum table), or C (generator config only)?
- [ ] **Algorithm:** Greedy MVP only, or include backtracking fallback in Phase 2?
- [ ] **Draft lifecycle:** Should generated schedules go directly into `Schedule` table with a `isDraft` flag, or into a separate `TimetableVersion` table?
- [ ] **Scope:** Should Phase 2 include frontend, or backend service + API first?
