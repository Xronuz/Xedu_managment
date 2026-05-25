# Phase 5B: Intelligent Operational Layer — Planning Document

**Status:** Planning  
**Date:** 2026-05-25  
**Based on:** Phase 5A.1–5A.4 production stack  
**Goal:** Design the intelligent operational layer on top of the production timetable engine.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Audit of Existing Production Stack](#2-audit-of-existing-production-stack)
3. [Gap Analysis](#3-gap-analysis)
4. [Module 1 — Advanced Solver](#4-module-1--advanced-solver)
5. [Module 2 — Teacher Substitution Workflow](#5-module-2--teacher-substitution-workflow)
6. [Module 3 — Teacher Attendance → Payroll](#6-module-3--teacher-attendance--payroll)
7. [Module 4 — Intelligent Repair Scheduling](#7-module-4--intelligent-repair-scheduling)
8. [Module 5 — Operational Analytics](#8-module-5--operational-analytics)
9. [Database Plan](#9-database-plan)
10. [API Plan](#10-api-plan)
11. [RBAC Plan](#11-rbac-plan)
12. [UX Plan](#12-ux-plan)
13. [Performance Considerations](#13-performance-considerations)
14. [Phased Implementation Roadmap](#14-phased-implementation-roadmap)
15. [Risk Analysis](#15-risk-analysis)

---

## 1. Executive Summary

Phase 5A established the production foundation:

| Component | Status | Key Files |
|---|---|---|
| TeachingLoad CRUD + Import | Production | `teaching-load.service.ts` |
| Workload Dashboard | Production | `teaching-load-workload.spec.ts`, workload page |
| Payroll scheduledHours Bridge | Production | `payroll.service.ts` (5A.3) |
| Timetable Lifecycle | Production | `schedule.service.ts` |
| Greedy Generator MVP | Production | `schedule-generator.service.ts` |
| Teacher Absence Groundwork | Production | `teacher-attendance.module.ts` (5A.4) |
| LeaveRequest + Approvals | Production | `leave-requests.service.ts` |

Phase 5B builds **intelligent operations** on this foundation without replacing what works. The five modules are:

1. **Advanced Solver** — Hybrid CSP/backtracking engine to replace the greedy generator MVP
2. **Teacher Substitution Workflow** — End-to-end substitute assignment from absence to execution
3. **Teacher Attendance → Payroll** — Automated `completedHours` from actual attendance data
4. **Intelligent Repair Scheduling** — AI-assisted schedule repair when disruptions occur
5. **Operational Analytics** — Aggregation layer for utilization, density, and quality metrics

---

## 2. Audit of Existing Production Stack

### 2.1 Schedule Generator MVP (`schedule-generator.service.ts`)

**Algorithm:** Pure greedy placement with demand sorting.

```
1. Load subjects, periods, rooms, existing schedules
2. Build demands: Subject.hoursPerWeek → N lesson instances
3. Sort demands by difficulty (hoursPerWeek desc, teacher load desc, class load desc)
4. For each demand instance:
   For each (day, period) candidate:
     For each room candidate:
       Check in-memory placedKeys (class/teacher/room)
       Check DB conflicts via ConflictDetectorService (3 queries)
       Place if free
5. Report failures with capped attempt log (10 per failure)
```

**Strengths:**
- Simple, predictable
- Returns actionable failure reports with aggregation
- Supports weekType parameter
- Branch-scoped for Branch Admin

**Critical Limitations:**

| # | Limitation | Impact |
|---|---|---|
| 1 | **N+1 Query Storm** | `checkClash()` fires 3 DB queries per candidate. 100 subjects × 6 days × 8 periods × 20 rooms ≈ **96,000 queries** per generation. |
| 2 | **No Soft Constraints** | Same subject can cluster on one day. Teacher can get 5 back-to-back lessons. No workload caps. |
| 3 | **No Room Preferences** | Tries `undefined` room first, then arbitrary room list. No lab/gym/auditorium matching. |
| 4 | **Single-Pass WeekType** | Must call generator twice for full 2-week rotation. No cross-week-type balancing. |
| 5 | **No Backtracking** | Once a slot is placed, it never moves to make room for harder demands. |
| 6 | **Serial Commit** | `commitProposed()` loops one-by-one with conflict checks. No bulk insert. |
| 7 | **Trusts Subject.teacherId** | Never validates teacher-subject binding during generation. |

### 2.2 Schedule Lifecycle (`schedule.service.ts`)

**Transitions:**
```
DRAFT → VALIDATED → PUBLISHED → ARCHIVED
  ↑         ↓           ↓
  └──── UNPUBLISH   (no edit)
```

**Conflict Detection:**
- Application-layer only (no DB unique constraints)
- Teacher conflicts: school-wide
- Room conflicts: branch-local
- WeekType overlap: `ALL` conflicts with everything; `NUMERATOR↔DENOMINATOR` safe
- UTC minute denormalization for performance
- Redis caching (5min TTL) on reads

**RBAC:** Controller `@Roles()` + service `assertCanManage()` defense-in-depth.

### 2.3 Conflict Detector (`conflict-detector.ts`)

- Converts `dayOfWeek + startTime/endTime` → weekly UTC minutes
- Standard interval overlap: `startA < endB && endA > startB`
- 3 parallel `findMany` queries per check (teacher, room, class)

### 2.4 TeachingLoad → Schedule Bridge

```
TeachingLoad (approved)
  → syncSubjectHours() → Subject.hoursPerWeek
    → ScheduleGeneratorService builds demands
      → Schedule (draft → published)
```

**Gap:** Generator does not read TeachingLoad directly. It only reads `Subject.hoursPerWeek`. Coefficients, split classes, group types from TeachingLoad are invisible to the generator.

### 2.5 Payroll Bridge (Phase 5A.3)

```
Published Schedule slots
  → countScheduledHoursFromSchedule()
    → PayrollItem.scheduledHours (snapshot)
      → updatePayrollItem(completedHours)
        → uncompletedPenalty = max(0, scheduled - completed) * hourlyRate
```

**Current Formula:**
```
grossTotal = baseSalary + allowances + hourlyAmount + extraAmount + bonuses - totalDeductions
netTotal   = max(0, grossTotal - advancePaid)
```

### 2.6 TeacherAttendance / TeacherSubstitution (Phase 5A.4)

**Existing:**
- `TeacherAttendance` model: `present | absent | late | excused | substituted`
- `TeacherSubstitution` model: `proposed | approved | rejected | applied | cancelled`
- `findAffectedSchedules()`: Lists published schedule slots impacted by a leave request

**Missing Connections:**
- Substitutions don't auto-create teacher attendance records
- No `leaveRequestId` on substitution or attendance
- `applied` status never reached
- No substitute conflict detection at creation time
- Attendance data does not flow into payroll `completedHours`

---

## 3. Gap Analysis

### 3.1 Generator → TeachingLoad Integration Gap

| Gap | Current | Needed |
|---|---|---|
| Generator input | `Subject.hoursPerWeek` | `TeachingLoad` (with coefficient, groupType, isSplitClass) |
| Workload awareness | None | Respect `StaffSalary.weeklyLessonHours` |
| Room matching | None | Subject → RoomType mapping |

### 3.2 Solver Quality Gap

| Gap | Current | Needed |
|---|---|---|
| Algorithm | Greedy | Hybrid: Greedy + Backtracking + Local Search |
| Soft constraints | None | Teacher gaps, subject spreading, paired lessons |
| Failure recovery | Report only | Auto-repair with alternative placements |
| Performance | O(N×M×R) DB queries | O(1) in-memory conflict checks |

### 3.3 Substitution Workflow Gap

| Gap | Current | Needed |
|---|---|---|
| Trigger | Manual creation | Auto-propose from approved leave |
| Approval | Manager-only | Original teacher notified, can object |
| Application | Status stays `approved` | Status → `applied` after class occurs |
| Attendance link | None | Auto-write `TeacherAttendance` records |
| Conflict check | None at creation | Check substitute availability |

### 3.4 Attendance → Payroll Gap

| Gap | Current | Needed |
|---|---|---|
| `completedHours` | Manual input | Derived from `TeacherAttendance` |
| Leave impact | None | Reduce `scheduledHours` or mark `excused` |
| Substitution credit | None | Pay substitute for substituted hours |
| Auto-recalc | None | Trigger payroll update on attendance change |

### 3.5 Repair Scheduling Gap

| Gap | Current | Needed |
|---|---|---|
| Disruption handling | Manual edit | System-proposed repairs |
| Repair options | None | Substitute, swap, reschedule |
| Impact preview | None | Show affected classes/teachers before apply |

### 3.6 Analytics Gap

| Gap | Current | Needed |
|---|---|---|
| Teacher utilization | Workload dashboard (planned hours) | Actual utilization from published schedules |
| Room utilization | None | Occupancy % per room per week |
| Schedule density | None | Heatmaps by day/period |
| Solver quality | None | Failure rate, placement score over time |
| Absence analytics | None | Absence rate by teacher/month/branch |
| Substitution analytics | None | Fill rate, response time, substitute load |

---

## 4. Module 1 — Advanced Solver

### 4.1 Design Philosophy

**Do not break the existing generator.** Instead, build an `AdvancedSolverService` that can be called alongside or instead of the greedy generator. The existing generator remains as a fast fallback.

**Three-Stage Hybrid:**

```
Stage A: Greedy Placement (fast, handles easy demands)
Stage B: Backtracking Repair (fixes Stage A failures)
Stage C: Scoring Optimization (local search to improve quality)
```

### 4.2 Data Model Additions

#### `SolverPreference` (new model)

Stores teacher/subject/room preferences for the solver.

```prisma
model SolverPreference {
  id           String @id @default(uuid())
  schoolId     String
  branchId     String
  teacherId    String?
  subjectId    String?
  classId      String?
  roomId       String?
  
  // Preference types
  preferredDayOfWeek  DayOfWeek?   // e.g., prefer monday
  avoidedDayOfWeek    DayOfWeek?   // e.g., avoid friday
  preferredTimeSlot   Int?         // e.g., prefer slot 1
  avoidedTimeSlot     Int?         // e.g., avoid slot 8
  maxConsecutiveSlots Int?         // default 3
  minGapSlots         Int?         // minimum free slots between lessons
  
  priority Int @default(1) // 1=soft, 2=medium, 3=hard
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([schoolId, teacherId])
  @@index([schoolId, subjectId])
  @@map("solver_preferences")
}
```

#### `SolverRun` (new model)

Tracks solver executions for analytics and rollback.

```prisma
model SolverRun {
  id            String   @id @default(uuid())
  schoolId      String
  branchId      String?
  weekType      WeekType @default(all)
  
  algorithm     String   @default("hybrid") // greedy | hybrid | backtrack_only
  status        String   @default("running") // running | completed | failed
  
  demandsCount  Int
  placedCount   Int
  failureCount  Int
  score         Float?   // aggregate placement quality (0-100)
  
  metadata      Json?    // full failure report, timing, config
  
  createdById   String
  createdAt     DateTime @default(now())
  completedAt   DateTime?
  
  @@index([schoolId, status])
  @@map("solver_runs")
}
```

#### `RoomType` and `SubjectRoomRequirement` (new models)

```prisma
enum RoomType {
  classroom
  lab
  gym
  auditorium
  computer_lab
  art_room
  music_room
}

model Room {
  // Add to existing Room model:
  roomType RoomType @default(classroom)
  capacity Int?     // max students
}

model SubjectRoomRequirement {
  id        String   @id @default(uuid())
  subjectId String
  roomType  RoomType
  required  Boolean  @default(false) // true=hard constraint, false=soft preference
  
  @@unique([subjectId, roomType])
  @@map("subject_room_requirements")
}
```

### 4.3 Algorithm Design

#### Stage A: Greedy Placement (Enhanced)

Same as current generator but with these improvements:

1. **In-Memory Conflict Check:** Load all existing schedules into memory once. No DB queries during placement.
2. **Demand Enrichment:** Read `TeachingLoad` data (coefficient, groupType) to build richer demands.
3. **Preference-Aware Candidate Sorting:** Sort candidates by teacher preference match score before trying.
4. **Room Type Matching:** Filter room candidates by `SubjectRoomRequirement` before trying.

```typescript
interface SolverDemand {
  id: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  hoursPerWeek: number;
  coefficient: number;
  groupType: GroupType;
  isSplitClass: boolean;
  requiredRoomType?: RoomType;
  preferredDays?: DayOfWeek[];
  avoidedDays?: DayOfWeek[];
}
```

#### Stage B: Backtracking Repair

For each failure from Stage A:

```
1. Identify the failing demand D
2. Find all already-placed demands that occupy D's viable slots
3. For each blocker B:
   a. Try to re-place B into an alternative slot
   b. If B moves, place D in B's old slot
   c. Score the new configuration
   d. Keep the best scoring configuration
4. If no reconfiguration works, record D as unresolvable
```

**Backtracking Depth:** Limited to 2 (move 1 blocker to place 1 demand). Deeper backtracking is exponential and unnecessary for school timetables.

**Scoring Function:**

```
score(placement) = 
  +100  (base for valid placement)
  +10   (teacher preference match: preferred day)
  +5    (teacher preference match: preferred slot)
  +5    (subject spread: different day from same subject)
  +3    (room type match)
  -20   (teacher preference violation: avoided day)
  -10   (teacher preference violation: avoided slot)
  -15   (consecutive lessons > maxConsecutive)
  -5    (no gap between teacher lessons < minGap)
  -10   (same subject on same day)
```

#### Stage C: Local Search Optimization

After Stage B, perform hill-climbing:

```
1. For each placed demand:
   a. Try swapping with another demand's slot
   b. Try moving to an empty candidate slot
   c. Compute delta score
   d. If delta > 0, accept the move
2. Repeat until no improving move found (max 50 iterations)
3. Return final configuration
```

### 4.4 Performance Strategy

| Technique | Benefit |
|---|---|
| Single DB load | All existing schedules loaded once into memory |
| Interval tree | O(log n) conflict lookup for teacher/class/room |
| Pruning | Skip candidates that violate hard constraints early |
| Parallel candidate evaluation | Evaluate room candidates for same (day,period) in parallel |
| Time limit | Cap total solver time at 30 seconds; return best found |

### 4.5 API Design

```
POST /schedule/solver/run
Body: {
  branchId?: string;
  weekType?: WeekType;
  algorithm?: 'greedy' | 'hybrid' | 'backtrack_only';
  timeLimitMs?: number;      // default 30000
  maxBacktrackDepth?: number; // default 2
  overwriteExisting?: boolean;
  preferences?: SolverPreferenceInput[]; // optional overrides
}
Response: {
  runId: string;
  status: 'completed' | 'timeout';
  placed: number;
  failures: number;
  score: number;
  proposedSlots: ProposedSlot[];
  failureReport: FailureReport;
  metadata: { durationMs: number; iterations: number };
}

POST /schedule/solver/run/:runId/commit
Body: { slotIds?: string[] } // commit subset or all
Response: { committed: number; failed: number[] }

POST /schedule/solver/preferences
Body: SolverPreferenceInput

GET /schedule/solver/preferences?teacherId=&subjectId=

DELETE /schedule/solver/preferences/:id

GET /schedule/solver/runs
GET /schedule/solver/runs/:runId
```

### 4.6 Migration from Greedy Generator

1. Keep `POST /schedule/generate` as-is (backward compatibility)
2. Add `POST /schedule/solver/run` as the new advanced endpoint
3. Frontend can show both options: "Quick Generate" (greedy) vs "Smart Generate" (hybrid)
4. After 2-3 sprints of validation, deprecate greedy endpoint

---

## 5. Module 2 — Teacher Substitution Workflow

### 5.1 End-to-End Flow

```
┌─────────────────┐     ┌────────────────────┐     ┌─────────────────┐
│ Teacher submits │────►│ LeaveRequest       │────►│ Multi-approver  │
│ leave request   │     │ (affectsSchedule)  │     │ approval        │
└─────────────────┘     └────────────────────┘     └─────────────────┘
                              │
                              ▼ (approved)
                    ┌────────────────────┐
                    │ findAffectedSchedules│
                    │ (published slots)    │
                    └────────────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Auto-propose       │
                    │ substitutions      │
                    │ (candidate teachers)│
                    └────────────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Manager reviews    │
                    │ & approves sub     │
                    └────────────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ Write TeacherAttendance│
                    │ (original: substituted) │
                    │ (substitute: present)   │
                    └────────────────────┘
                              │
                              ▼
                    ┌────────────────────┐
                    │ After class date   │
                    │ mark substitution  │
                    │ status = applied   │
                    └────────────────────┘
```

### 5.2 Schema Additions

```prisma
model TeacherSubstitution {
  // Add to existing:
  leaveRequestId String? // link back to leave request
  autoProposed   Boolean @default(false)
  
  // Add index
  @@index([leaveRequestId])
}

model TeacherAttendance {
  // Add to existing:
  leaveRequestId String?
  substitutionId String?
  
  // Add relations (already have teacher, branch, school)
  @@index([leaveRequestId])
  @@index([substitutionId])
}
```

### 5.3 Substitution Candidate Algorithm

**Input:** Affected schedule slot (date, dayOfWeek, timeSlot, subject, branch, weekType)

**Candidate Scoring:**

```
For each teacher in school:
  1. Hard filters:
     - Not the original teacher
     - Same branch (or cross-branch allowed if configured)
     - No conflicting published schedule at (date, timeSlot)
     - No conflicting approved substitution at (date, timeSlot)
     - Not on approved leave for that date
     - TeachingLoad exists for the subject (or similar subject)
  
  2. Soft scoring:
     + 100  (available — no schedule at all that day)
     + 50   (teaches same subject in another class)
     + 30   (underloaded — utilization < 80%)
     + 20   (has TeachingLoad for this subject)
     + 10   (has taught this class before)
     - 50   (overloaded — utilization > 110%)
     - 20   (already has 2+ substitutions this week)
     - 10   (last-minute — < 24h notice)
```

**Return:** Top 5 candidates with scores and reasons.

### 5.4 Service Methods

```typescript
// Auto-propose substitutions from approved leave
async proposeSubstitutionsFromLeave(
  leaveRequestId: string,
  currentUser: JwtPayload,
): Promise<{
  leaveRequestId: string;
  proposals: Array<{
    scheduleId: string;
    date: string;
    candidates: Array<{ teacherId; score; reason }>;
    selectedSubstituteId?: string;
  }>;
}>

// Bulk create substitutions from proposal selection
async createSubstitutionsFromProposal(
  leaveRequestId: string,
  selections: Array<{ scheduleId: string; substituteTeacherId: string }>,
  currentUser: JwtPayload,
): Promise<TeacherSubstitution[]>

// Apply executed substitution (after class date passes)
async applySubstitution(
  substitutionId: string,
  currentUser: JwtPayload,
): Promise<TeacherSubstitution>

// Cancel substitution (before applied)
async cancelSubstitution(
  substitutionId: string,
  reason: string,
  currentUser: JwtPayload,
): Promise<TeacherSubstitution>
```

### 5.5 Attendance Auto-Write

When substitution is **approved**:
```
1. Create TeacherAttendance for original teacher:
   { date, teacherId: original, status: 'substituted', substitutionId, source: 'substitution' }
2. Create TeacherAttendance for substitute teacher:
   { date, teacherId: substitute, status: 'present', substitutionId, source: 'substitution' }
```

When substitution is **cancelled** (before date):
```
1. Delete associated TeacherAttendance records
2. Set substitution status = 'cancelled'
```

### 5.6 API Design

```
POST /leave-requests/:id/propose-substitutions
Response: { proposals: [...] }

POST /leave-requests/:id/apply-substitutions
Body: { selections: [{ scheduleId, substituteTeacherId }] }
Response: { created: number; substitutions: TeacherSubstitution[] }

POST /teacher-attendance/substitutions/:id/apply
Response: TeacherSubstitution (status = applied)

POST /teacher-attendance/substitutions/:id/cancel
Body: { reason?: string }
Response: TeacherSubstitution (status = cancelled)

GET /teacher-attendance/substitutions/candidates
Query: { scheduleId: string; date: string }
Response: { candidates: [{ teacherId, firstName, lastName, score, reason }] }
```

### 5.7 Notification Flow

| Event | Recipients | Channel |
|---|---|---|
| Substitution proposed | Original teacher, substitute candidate | In-app + email |
| Substitution approved | Original teacher, substitute, class teacher | In-app + SMS |
| Substitution applied (after class) | Payroll/HR | In-app |
| Substitution cancelled | Original teacher, substitute | In-app |

---

## 6. Module 3 — Teacher Attendance → Payroll

### 6.1 Design Principle

`completedHours` should be derived from actual attendance data, not manual input. The existing manual override must be preserved.

### 6.2 completedHours Calculation Logic

```typescript
async calculateCompletedHours(
  teacherId: string,
  year: number,
  month: number,
): Promise<number> {
  // 1. Get all published schedule slots for this teacher in month
  const scheduledSlots = await countScheduledHoursFromSchedule(teacherId, schoolId, year, month);
  
  // 2. Get all TeacherAttendance records for this teacher in month
  const attendances = await prisma.teacherAttendance.findMany({
    where: { teacherId, date: { gte: monthStart, lte: monthEnd } },
  });
  
  // 3. Build a map: date → status
  const attendanceByDate = new Map(attendances.map(a => [a.date.toISOString().split('T')[0], a.status]));
  
  // 4. For each scheduled day, determine if teacher completed
  let completed = 0;
  for (const slot of scheduledSlots) {
    const dateStr = slot.date;
    const status = attendanceByDate.get(dateStr);
    
    if (status === 'present' || status === 'late') {
      completed += 1; // present or late = completed
    } else if (status === 'substituted') {
      completed += 1; // substitution = completed (original teacher excused)
    } else if (status === 'excused') {
      completed += 1; // excused = completed (paid leave, training, etc.)
    } else if (status === 'absent') {
      completed += 0; // absent = not completed
    } else {
      // No attendance record → assume present (default)
      completed += 1;
    }
  }
  
  return completed;
}
```

### 6.3 Leave Type → Attendance → Payroll Mapping

| Leave Type | TeacherAttendance Status | Payroll Treatment |
|---|---|---|
| sick | `excused` | `completedHours` counts (sick leave paid) |
| paid | `excused` | `completedHours` counts |
| vacation | `excused` | `completedHours` counts |
| training | `excused` | `completedHours` counts |
| business_trip | `excused` | `completedHours` counts |
| maternity | `excused` | `completedHours` counts |
| unpaid | `absent` | `completedHours` does NOT count |
| emergency | `excused` | `completedHours` counts |
| other | `absent` | `completedHours` does NOT count (configurable) |

**Rule:** If `LeaveRequest.affectsPayroll = false`, treat all days as `excused` regardless of type.

### 6.4 Substitution Credit Rules

When a substitution is **applied**:

| Teacher | Payroll Impact |
|---|---|
| Original teacher | No impact — `completedHours` already counts (substituted status) |
| Substitute teacher | Add substituted hours to substitute's `extraCurricularHours` or create a separate `substitutionHours` field |

**Option A (Simple):** Add to `extraCurricularHours`
- Pro: Uses existing payroll field
- Con: Semantically wrong

**Option B (New Field):** Add `substitutionHours` to `PayrollItem`
- Pro: Clean separation
- Con: Schema change

**Recommended:** Option B — add `substitutionHours` and `substitutionAmount` to `PayrollItem`.

### 6.5 Auto-Recalculation Trigger

When any of these events occur, trigger `recalculateCompletedHours` for affected teacher/month:

| Event | Action |
|---|---|
| TeacherAttendance created/updated | Recalc for teacher + month |
| LeaveRequest approved (teacher) | Recalc for requester + month |
| Substitution applied | Recalc for both original + substitute + month |
| Substitution cancelled | Recalc for both teachers + month |

**Implementation:** Use a new `PayrollRecalculationQueue` (Redis-based or in-memory) to debounce recalculations. Don't recalc immediately on every attendance mark — batch and process every 5 minutes.

### 6.6 API Design

```
POST /payroll/monthly/:id/recalculate-completed-hours
Body: { force?: boolean; teacherIds?: string[] }
Response: { updatedCount; skippedCount; details: [{ teacherId; oldCompleted; newCompleted }] }

GET /payroll/monthly/:id/completed-hours-preview
Query: { teacherId?: string }
Response: {
  teacherId: string;
  scheduledHours: number;
  completedHours: number;
  breakdown: {
    present: number;
    late: number;
    excused: number;
    absent: number;
    substituted: number;
    noRecord: number;
  };
  projectedNet: number;
}
```

### 6.7 Schema Additions

```prisma
model PayrollItem {
  // Add:
  substitutionHours       Int      @default(0)
  substitutionAmount      Float    @default(0)
  completedHoursSource    String?  // manual | attendance
  completedHoursCalculatedAt DateTime?
}
```

---

## 7. Module 4 — Intelligent Repair Scheduling

### 7.1 Use Cases

| Scenario | Trigger | Repair Options |
|---|---|---|
| Teacher sick today | Manual mark + auto-detect | Substitute, cancel class, swap room |
| Teacher on leave next week | Approved leave | Pre-book substitute, redistribute lessons |
| Room unavailable | Room closure | Swap room, reschedule to different day |
| Double-booked teacher | Conflict detected | Swap with another teacher's slot |
| Generator failure | Unplaced demands | Suggest alternative teacher/room/times |

### 7.2 Repair Algorithm

**Input:** Disrupted schedule slot(s)

**Step 1: Impact Analysis**
```
- Identify affected classes, teachers, rooms
- Count students impacted
- Check if weekType affects scope (numerator/denominator)
```

**Step 2: Generate Repair Options**

For each affected slot, generate up to 3 repair proposals:

```
Option A: SUBSTITUTE
  - Find best substitute candidate (same algorithm as Module 2)
  - Score: availability, subject match, workload balance
  - Cost: substitute pay

Option B: ROOM SWAP
  - Find alternative room at same (day, period)
  - Score: room type match, capacity
  - Cost: none

Option C: TIME RESCHEDULE
  - Find alternative (day, period) for same teacher/class/subject
  - Score: preference match, spreading
  - Cost: student schedule disruption

Option D: TEACHER SWAP
  - Find another class's same-subject slot to swap
  - Score: mutual benefit
  - Cost: two classes disrupted briefly
```

**Step 3: Rank and Present**

```
Rank proposals by:
  1. Minimal student disruption (fewest students affected)
  2. Preference match score
  3. Cost (substitute pay > 0 is worse than free options)
  4. Timeline proximity (sooner is better for urgent repairs)
```

### 7.3 API Design

```
POST /schedule/repair/analyze
Body: {
  scheduleIds: string[];       // disrupted slots
  date?: string;               // if known
  reason: string;              // e.g., "teacher_sick", "room_closed"
}
Response: {
  impactedSlots: number;
  impactedStudents: number;
  proposals: Array<{
    type: 'substitute' | 'room_swap' | 'reschedule' | 'teacher_swap';
    description: string;
    score: number;
    cost: number;
    affectedClasses: string[];
    actions: Array<{ type: string; before; after }>;
  }>;
}

POST /schedule/repair/apply
Body: {
  proposalIndex: number;
  fromAnalyzeResponse: string; // signed/validated response reference
}
Response: {
  applied: boolean;
  changes: Array<{ scheduleId; field; oldValue; newValue }>;
  newScheduleIds?: string[];
}
```

### 7.4 Frontend UX

**Repair Panel (in schedule detail view):**
- Red alert banner on disrupted slots
- "Suggest Repairs" button → opens side panel
- List of proposals with score badges (green = good, yellow = caution)
- Preview shows before/after timetable snippet
- "Apply" with confirm dialog
- Auto-generate substitution if Option A selected

---

## 8. Module 5 — Operational Analytics

### 8.1 Aggregation Strategy

All analytics are **computed on-demand** from existing data, not pre-materialized (except where noted). This avoids migration complexity and stale data.

**For heavy queries:** Use PostgreSQL materialized views refreshed nightly.

### 8.2 Metrics Design

#### 8.2.1 Teacher Utilization

```sql
-- Actual utilization from published schedules
SELECT 
  teacher_id,
  COUNT(*) FILTER (WHERE week_type = 'all') * 4 +  -- ~4 weeks/month
  COUNT(*) FILTER (WHERE week_type = 'numerator') * 2 +
  COUNT(*) FILTER (WHERE week_type = 'denominator') * 2
  AS actual_monthly_slots
FROM schedules
WHERE status = 'published' AND school_id = ?
GROUP BY teacher_id;
```

**API:**
```
GET /analytics/teacher-utilization
Query: { month; year; branchId? }
Response: {
  teachers: [{
    teacherId; firstName; lastName;
    scheduledHours; completedHours;
    contractualHours; utilizationPercent;
    absenceDays; substitutionDays;
    status: 'underloaded' | 'balanced' | 'overloaded';
  }];
  schoolAvg: number;
  overloadedCount: number;
  underloadedCount: number;
}
```

#### 8.2.2 Room Utilization

```
GET /analytics/room-utilization
Query: { month; year; branchId? }
Response: {
  rooms: [{
    roomId; roomName; roomType;
    totalSlots: number;      // available slots in month
    usedSlots: number;       // scheduled slots
    utilizationPercent: number;
    peakDay: string;         // day with highest usage
    peakSlot: number;        // period with highest usage
  }];
  avgUtilization: number;
}
```

#### 8.2.3 Schedule Density Heatmap

```
GET /analytics/schedule-density
Query: { branchId?; weekType? }
Response: {
  heatmap: Array<{
    dayOfWeek: string;
    timeSlot: number;
    classCount: number;
    teacherCount: number;
    roomCount: number;
    utilizationPercent: number;
  }>;
}
```

#### 8.2.4 Absence Analytics

```
GET /analytics/absence-summary
Query: { month; year; branchId? }
Response: {
  totalTeachers: number;
  absentTeacherDays: number;
  excusedTeacherDays: number;
  lateTeacherDays: number;
  substitutionDays: number;
  absenceRate: number;  // absent / (totalTeachers * schoolDays)
  topAbsentTeachers: Array<{ teacherId; days; rate }>;
  absenceByType: Record<LeaveType, number>;
}
```

#### 8.2.5 Substitution Analytics

```
GET /analytics/substitution-summary
Query: { month; year; branchId? }
Response: {
  totalProposed: number;
  totalApproved: number;
  totalApplied: number;
  totalCancelled: number;
  fillRate: number;        // applied / approved
  avgResponseTimeHours: number;  // proposed → approved
  topSubstitutes: Array<{ teacherId; substitutionCount; totalHours }>;
  uncoveredSlots: number;   // approved leave without substitution
}
```

#### 8.2.6 Solver Quality Metrics

```
GET /analytics/solver-quality
Query: { from; to }
Response: {
  runs: Array<{
    runId; algorithm; status;
    demandsCount; placedCount; failureCount;
    score; durationMs;
  }>;
  avgPlacementRate: number;
  avgScore: number;
  avgDurationMs: number;
  failureTrend: Array<{ date; failureCount }>;
}
```

### 8.3 Materialized Views

```sql
-- Refresh nightly via cron
CREATE MATERIALIZED VIEW mv_teacher_monthly_stats AS
SELECT 
  s.school_id,
  s.branch_id,
  s.teacher_id,
  DATE_TRUNC('month', s.created_at) AS month,
  COUNT(*) FILTER (WHERE s.status = 'published') AS published_slots,
  -- ... more aggregates
FROM schedules s
GROUP BY s.school_id, s.branch_id, s.teacher_id, DATE_TRUNC('month', s.created_at);

CREATE INDEX idx_mv_teacher_monthly_stats_lookup 
ON mv_teacher_monthly_stats(school_id, branch_id, teacher_id, month);
```

---

## 9. Database Plan

### 9.1 New Models

| Model | Purpose | Module |
|---|---|---|
| `SolverPreference` | Teacher/subject/room preferences for solver | 1 |
| `SolverRun` | Track solver executions | 1 |
| `SubjectRoomRequirement` | Subject → room type mapping | 1 |
| `RoomType` enum | Classify rooms | 1 |

### 9.2 Model Extensions

| Model | New Fields | Module |
|---|---|---|
| `TeacherSubstitution` | `leaveRequestId`, `autoProposed` | 2 |
| `TeacherAttendance` | `leaveRequestId`, `substitutionId` | 2, 3 |
| `PayrollItem` | `substitutionHours`, `substitutionAmount`, `completedHoursSource`, `completedHoursCalculatedAt` | 3 |
| `Room` | `roomType`, `capacity` | 1 |

### 9.3 Migration Order

```
1. Add RoomType enum + Room.roomType + Room.capacity
2. Create SubjectRoomRequirement model
3. Create SolverPreference model
4. Create SolverRun model
5. Add TeacherSubstitution.leaveRequestId + autoProposed
6. Add TeacherAttendance.leaveRequestId + substitutionId
7. Add PayrollItem substitution fields + completedHoursSource
```

All migrations are backward-compatible (nullable fields, new tables).

---

## 10. API Plan

### 10.1 New Endpoints

| Method | Path | Module | Roles | Description |
|---|---|---|---|---|
| POST | `/schedule/solver/run` | 1 | Director, VP, BA | Run advanced solver |
| POST | `/schedule/solver/run/:id/commit` | 1 | Director, VP, BA | Commit solver results |
| GET | `/schedule/solver/runs` | 1 | Director, VP, BA | List solver runs |
| GET | `/schedule/solver/runs/:id` | 1 | Director, VP, BA | Solver run detail |
| POST | `/schedule/solver/preferences` | 1 | Director, VP, BA | Create preference |
| GET | `/schedule/solver/preferences` | 1 | Director, VP, BA | List preferences |
| DELETE | `/schedule/solver/preferences/:id` | 1 | Director, VP, BA | Delete preference |
| POST | `/leave-requests/:id/propose-substitutions` | 2 | Director, VP, BA | Auto-propose substitutes |
| POST | `/leave-requests/:id/apply-substitutions` | 2 | Director, VP, BA | Bulk create from proposal |
| POST | `/teacher-attendance/substitutions/:id/apply` | 2 | Director, VP, BA | Mark substitution executed |
| POST | `/teacher-attendance/substitutions/:id/cancel` | 2 | Director, VP, BA | Cancel substitution |
| GET | `/teacher-attendance/substitutions/candidates` | 2 | Director, VP, BA | Find substitute candidates |
| POST | `/payroll/monthly/:id/recalculate-completed-hours` | 3 | Director, Accountant | Auto-fill completedHours |
| GET | `/payroll/monthly/:id/completed-hours-preview` | 3 | Director, Accountant | Preview before commit |
| POST | `/schedule/repair/analyze` | 4 | Director, VP, BA | Analyze repair options |
| POST | `/schedule/repair/apply` | 4 | Director, VP, BA | Apply repair proposal |
| GET | `/analytics/teacher-utilization` | 5 | Director, VP, BA | Teacher utilization |
| GET | `/analytics/room-utilization` | 5 | Director, VP, BA | Room utilization |
| GET | `/analytics/schedule-density` | 5 | Director, VP, BA | Density heatmap |
| GET | `/analytics/absence-summary` | 5 | Director, VP, BA | Absence analytics |
| GET | `/analytics/substitution-summary` | 5 | Director, VP, BA | Substitution analytics |
| GET | `/analytics/solver-quality` | 5 | Director, VP, BA | Solver quality metrics |

### 10.2 WebSocket Events

| Event | Payload | Module |
|---|---|---|
| `solver:run:completed` | `{ runId, placed, failures, score }` | 1 |
| `substitution:proposed` | `{ substitutionId, originalTeacherId, substituteTeacherId }` | 2 |
| `substitution:approved` | `{ substitutionId, approvedById }` | 2 |
| `substitution:applied` | `{ substitutionId, date }` | 2 |
| `payroll:completed-hours:updated` | `{ payrollId, teacherId, oldValue, newValue }` | 3 |
| `schedule:repair:applied` | `{ changes: Array<{ scheduleId, field, old, new }> }` | 4 |

---

## 11. RBAC Plan

### 11.1 Role Matrix

| Capability | Director | VP | Branch Admin | Accountant | Teacher | Student | Parent |
|---|---|---|---|---|---|---|---|
| Run advanced solver | ✅ | ✅ | ✅ (own branch) | ❌ | ❌ | ❌ | ❌ |
| View solver runs | ✅ | ✅ | ✅ (own branch) | ❌ | ❌ | ❌ | ❌ |
| Propose substitutions | ✅ | ✅ | ✅ (own branch) | ❌ | ❌ | ❌ | ❌ |
| Approve substitutions | ✅ | ✅ | ✅ (own branch) | ❌ | ❌ | ❌ | ❌ |
| View own substitutions | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Recalc completedHours | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Preview completedHours | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Apply schedule repair | ✅ | ✅ | ✅ (own branch) | ❌ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ (own branch) | ✅ | ❌ | ❌ | ❌ |
| View own analytics | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### 11.2 Defense-in-Depth Pattern

Continue the established pattern:
1. Controller `@Roles()` for coarse filtering
2. Service `assertCanManage()` / `assertCanRead()` for tenant scope
3. Prisma `where` clauses with `buildTenantWhere()` for DB-level filtering

---

## 12. UX Plan

### 12.1 Module 1 — Advanced Solver UX

**Schedule Generator Page (`/dashboard/schedule/generate`):**
- Two tabs: "Tez yaratish" (Greedy) and "Aqlli yaratish" (Hybrid)
- Hybrid tab shows:
  - Algorithm selector (dropdown: Greedy / Hybrid / Backtrack only)
  - Time limit slider (5s–60s)
  - Preference editor (modal per teacher)
  - Run button with progress indicator
  - Results: placement rate %, score, failure list
  - Visual timetable preview of proposed slots
  - Commit button (with validation summary)

### 12.2 Module 2 — Substitution Workflow UX

**Leave Request Detail (`/dashboard/leave-requests/:id`):**
- If approved + affectsSchedule + teacher:
  - "Ta'sirlangan darslar" section showing affected slots
  - "Almashtirish taklif qilish" button
  - Auto-proposed substitutes with score badges
  - Manager selects substitutes → "Tasdiqlash"

**Substitution Board (`/dashboard/substitutions`):**
- Kanban board: Proposed → Approved → Applied → Cancelled
- Cards show: date, class, subject, original teacher, substitute
- Filter by branch, date, status
- Action buttons: Approve, Apply, Cancel

### 12.3 Module 3 — Payroll Attendance Bridge UX

**Payroll Detail (`/dashboard/payroll/:id`):**
- Per-teacher row:
  - `scheduledHours` with source badge (schedule/manual)
  - `completedHours` with source badge (attendance/manual)
  - Breakdown tooltip: present / late / excused / absent / substituted / no record
  - Warning if `completedHours < scheduledHours * 0.8`
- "Davomatdan qayta hisoblash" button (manager only)

### 12.4 Module 4 — Repair Scheduling UX

**Schedule Grid (`/dashboard/schedule`):**
- Disrupted slots highlighted in red
- Hover shows disruption reason ("Teacher absent", "Room closed")
- "Tuzatish takliflari" button opens side drawer
- Side drawer:
  - List of 3 repair options with score
  - Before/after mini timetable
  - "Qo'llash" with confirm

### 12.5 Module 5 — Analytics UX

**Analytics Dashboard (`/dashboard/analytics/operations`):**
- Tab: "O'qituvchi foydalanish" — bar chart + table
- Tab: "Xona foydalanish" — bar chart + heatmap
- Tab: "Jadval zichligi" — day×period heatmap
- Tab: "Yo'qlik" — line chart + top absent teachers
- Tab: "Almashtirish" — funnel chart + fill rate
- Tab: "Solver sifati" — trend chart + runs table
- Date range picker (month/quarter/year)
- Branch filter (for Director/VP)
- Export to PDF/Excel

---

## 13. Performance Considerations

### 13.1 Solver Performance

| School Size | Demands | Candidates | Target Time |
|---|---|---|---|
| Small (≤20 classes) | ~100 | ~300 | < 3s |
| Medium (≤50 classes) | ~300 | ~900 | < 10s |
| Large (≤100 classes) | ~600 | ~1800 | < 30s |

**Optimizations:**
- In-memory conflict detection (no DB queries during solve)
- Interval trees for O(log n) conflict lookup
- Candidate pruning: skip impossible candidates early
- Time-boxed: return best-found if timeout
- Worker thread isolation (future: offload to background worker)

### 13.2 Analytics Performance

| Query | Strategy | Target |
|---|---|---|
| Teacher utilization | Materialized view (nightly refresh) | < 200ms |
| Room utilization | Materialized view | < 200ms |
| Schedule density | Cached in Redis (1 hour TTL) | < 100ms |
| Absence summary | Indexed query on TeacherAttendance | < 500ms |
| Substitution summary | Indexed query on TeacherSubstitution | < 500ms |

### 13.3 Payroll Recalculation

| Trigger | Strategy | Target |
|---|---|---|
| Attendance mark | Debounced queue (5 min batch) | < 2s per teacher |
| Leave approval | Immediate recalc | < 2s per teacher |
| Substitution applied | Immediate recalc | < 2s per teacher |

---

## 14. Phased Implementation Roadmap

### Phase 5B.1 — Advanced Solver (Sprint 1–3)

**Sprint 1: Foundation**
- Add `RoomType` enum, `Room.roomType`, `SubjectRoomRequirement` model
- Add `SolverPreference` model
- Refactor conflict detector for in-memory operation
- Build in-memory schedule index

**Sprint 2: Hybrid Algorithm**
- Implement enhanced greedy (Stage A)
- Implement backtracking repair (Stage B)
- Implement scoring function
- Implement local search (Stage C)

**Sprint 3: API + UI**
- `POST /schedule/solver/run` endpoint
- Solver results preview UI
- Commit flow
- Tests + benchmarks

### Phase 5B.2 — Teacher Substitution Workflow (Sprint 4–6)

**Sprint 4: Auto-Propose**
- Link `TeacherSubstitution` to `LeaveRequest`
- Implement candidate scoring algorithm
- `POST /leave-requests/:id/propose-substitutions`
- Frontend: leave detail substitution panel

**Sprint 5: Approval + Attendance**
- Bulk create substitutions from proposal
- Auto-write `TeacherAttendance` on approval
- `applied` status transition
- Notification integration

**Sprint 6: Substitution Board**
- Kanban board UI
- Filter, search, actions
- Tests

### Phase 5B.3 — Teacher Attendance → Payroll (Sprint 7–8)

**Sprint 7: completedHours Automation**
- `calculateCompletedHours` service method
- Leave type → attendance → payroll mapping
- `POST /payroll/monthly/:id/recalculate-completed-hours`
- Preview endpoint

**Sprint 8: Integration + Triggers**
- Debounced recalculation queue
- Substitution credit rules
- Frontend: payroll detail with attendance breakdown
- Tests

### Phase 5B.4 — Intelligent Repair (Sprint 9–10)

**Sprint 9: Repair Engine**
- Impact analysis algorithm
- Repair option generation
- Scoring and ranking

**Sprint 10: Repair UI**
- Disruption detection in schedule grid
- Repair side drawer
- Preview and apply flow
- Tests

### Phase 5B.5 — Operational Analytics (Sprint 11–12)

**Sprint 11: Backend Aggregations**
- Materialized views
- Analytics service methods
- All `GET /analytics/*` endpoints

**Sprint 12: Dashboard UI**
- Analytics page with tabs
- Charts (Recharts)
- Export functionality
- Tests

---

## 15. Risk Analysis

### 15.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Solver too slow for large schools | Medium | High | Time-box + fallback to greedy; worker threads |
| In-memory conflict detection diverges from DB | Low | High | Extensive tests; validate against DB on commit |
| Payroll recalc triggers cascade updates | Medium | Medium | Debounced queue; batch processing |
| Materialized views stale | Medium | Low | Nightly refresh + manual refresh button |
| Substitution conflicts at apply time | Medium | Medium | Re-validate conflicts before applying |

### 15.2 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Teachers distrust auto-generated schedules | Medium | Medium | Keep manual override; show reasoning |
| Substitutes reject assignments | Medium | Medium | Notification + opt-out; manual override |
| Payroll errors from attendance automation | Low | High | Preview before commit; audit log; manual override |
| Branch admins scope confusion | Medium | Low | Clear UI labels; branch filter defaults |

### 15.3 Dependency Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `Subject.hoursPerWeek` out of sync with `TeachingLoad` | Medium | Medium | Validation warning in solver; periodic audit |
| Room type data missing (legacy rooms) | High | Medium | Default to `classroom`; admin prompt to classify |
| Preference data empty (cold start) | High | Low | Sensible defaults; gradual adoption |

---

## Appendix A: Data Flow Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  TeachingLoad   │────►│    Subject      │────►│  Solver /       │
│  (approved)     │     │  .hoursPerWeek  │     │  Generator      │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                              ┌────────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │  Schedule       │
                    │  (published)    │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌────────────┐   ┌────────────┐   ┌────────────┐
    │  Payroll   │   │  Repair    │   │  Analytics │
    │  Bridge    │   │  Engine    │   │  Engine    │
    └────────────┘   └────────────┘   └────────────┘
           │
           ▼
    ┌────────────┐
    │  Teacher   │
    │  Attendance│◄──── LeaveRequest (approved)
    └────────────┘
           │
           ▼
    ┌────────────┐
    │ Substitution│
    │  Workflow   │
    └────────────┘
```

## Appendix B: Glossary

| Term | Definition |
|---|---|
| **Demand** | A lesson instance that needs placement (subject + class + teacher) |
| **Candidate** | A viable (day, period, room) combination for a demand |
| **PlacedKeys** | In-memory Set tracking occupied resources during generation |
| **WeekType** | `all` (every week), `numerator` (odd ISO weeks), `denominator` (even ISO weeks) |
| **Solver Score** | Aggregate quality metric (0–100) for a timetable configuration |
| **Backtracking** | Algorithm that undoes previous placements to make room for unplaced demands |
| **Local Search** | Optimization that iteratively improves a solution via small moves |
| **Substitution** | Replacing an absent teacher with another teacher for a specific slot |
| **Repair** | Modifying an existing published schedule to resolve a disruption |

---

*Document version: 1.0*  
*Author: Phase 5B Planning Session*  
*Review cycle: Before each sprint implementation*
