# Dars Jadvali (Timetable/Schedule) Module — Audit Report

> **Rule:** No implementation code changes until this audit is reviewed and approved.  
> **Date:** 2026-05-21  
> **Commit:** `5a2f28a` (student domain separation)  
> **Auditor:** Kimi Code CLI

---

## 1. Current State (As-Is)

### 1.1 Frontend

| Component | Location | Notes |
|---|---|---|
| Entry page | `apps/frontend/src/app/(dashboard)/dashboard/schedule/page.tsx` | Role split: `student`/`parent` → `StudentScheduleView`; others → `ScheduleWorkspace` |
| Main workspace | `apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/schedule-workspace.tsx` | **1 243 lines**, monolithic. Exports `ScheduleWorkspace`, `StudentScheduleView`, `WeeklyGrid`, `ListView`, `LessonPanel` |
| API client | `apps/frontend/src/lib/api/schedule.ts` | 9 methods: `getToday`, `getWeek`, `getByClass`, `getTeacherCrossBranch`, `create`, `update`, `remove`, `checkConflict` |
| Import dialog | `apps/frontend/src/components/import/import-dialog.tsx` | Generic dialog; supports `type="schedule"`. Parse + commit flow with preview & branch select |
| Import API | `apps/frontend/src/lib/api/import.ts` | `parseSchedule` / `commitSchedule` wrappers |
| Navigation | `apps/frontend/src/config/navigation.ts` | `/dashboard/schedule` in Director, VP, Branch Admin, Teacher, Student navs |
| Permissions | `apps/frontend/src/config/permissions.ts` | Permitted for `student`, `teacher`, `class_teacher`, `vice_principal`, `director`, `branch_admin`, `parent` |
| Rooms API | `apps/frontend/src/lib/api/rooms.ts` | **Exists but never imported by schedule workspace** |
| WebSocket | — | Backend emits `schedule:updated`, but **frontend does NOT listen** |

**Existing UI Features:**
- Weekly grid (Mon–Sat, 7 slots, hard-coded `SLOT_TIMES`)
- Day-filtered list view toggle
- Create/edit modal with conflict preview (warns but allows override via "Baribir saqlash")
- Excel import via drag-and-drop dialog
- Sidebar analytics: total slots, today’s slots, conflicts count, top-5 teacher load, top-5 class load, upcoming lessons
- `LessonPanel` slide-out with quick links (attendance, class page, messaging)
- Cross-branch greyed-out slots (`isCrossBranch` flag from backend)
- Subject color mapping (10 rotating Tailwind classes)

### 1.2 Backend

| File | Lines | Purpose |
|---|---|---|
| `schedule.service.ts` | 393 | Core CRUD + cache + conflict delegation + timezone math |
| `schedule.controller.ts` | 112 | 9 REST endpoints (v1) |
| `schedule.module.ts` | 14 | Imports `PrismaModule`, `EventsModule`; providers: `ScheduleService`, `ConflictDetectorService` |
| `dto/create-schedule.dto.ts` | 49 | Single DTO reused for create + update (as `Partial`) |
| `schedule.service.spec.ts` | 140 | **Broken / outdated** (see §3.4) |
| `common/utils/conflict-detector.ts` | 283 | `ConflictDetectorService` — UTC-minute overlap checker |
| `modules/import/import.service.ts` | — | `parseSchedule` / `commitSchedule` (ExcelJS) + template generation |
| `modules/import/import.controller.ts` | — | `POST /import/schedule/parse`, `POST /import/schedule/commit` |
| `modules/rooms/rooms.service.ts` | 254 | Room CRUD (separate module, not consumed by schedule frontend) |
| `modules/rooms/rooms.controller.ts` | 72 | Room REST endpoints |

**Endpoints:**

| Method | Path | Roles | Description |
|---|---|---|---|
| GET | `/v1/schedule/check-conflict` | Any JWT | Conflict preview |
| GET | `/v1/schedule/today` | Any JWT | Today’s lessons |
| GET | `/v1/schedule/week` | Any JWT | Weekly schedule; optional `classId` |
| GET | `/v1/schedule/class/:classId` | Any JWT | Class schedule |
| POST | `/v1/schedule` | Director, VP, Branch Admin | Create slot |
| PUT | `/v1/schedule/:id` | Director, VP, Branch Admin | Update slot |
| DELETE | `/v1/schedule/:id` | Director, VP, Branch Admin | Delete slot |
| GET | `/v1/schedule/teacher/:teacherId/cross-branch` | Director, VP, Branch Admin | Multi-branch teacher load (greyed-out UI) |

### 1.3 Database Schema

```prisma
model Schedule {
  id             String    @id @default(uuid())
  schoolId       String
  branchId       String
  classId        String
  subjectId      String
  teacherId      String
  roomNumber     String?   // Legacy free-text
  roomId         String?   // FK → Room
  dayOfWeek      DayOfWeek // monday…sunday
  timeSlot       Int
  startTime      String    // "HH:MM" local time
  endTime        String    // "HH:MM" local time
  startDayMinUtc Int?      // Weekly UTC minute offset (conflict detection)
  endDayMinUtc   Int?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  school     School       @relation(...)
  branch     Branch       @relation(...)
  class      Class        @relation(...)
  subject    Subject      @relation(...)
  teacher    User         @relation("ScheduleTeacher", ...)
  room       Room?        @relation(...)
  attendance Attendance[]

  @@index([schoolId, branchId])
  @@index([schoolId, dayOfWeek])
  @@index([teacherId, dayOfWeek])
  @@index([branchId, dayOfWeek])
  @@index([classId, dayOfWeek])
  @@index([roomId, dayOfWeek])
  @@map("schedules")
}
```

**Related models:** `Room`, `Subject` (has `teacherId`), `Class`, `Attendance` (has optional `scheduleId`).

**Schema characteristics:**
- Flat table: every row is a lesson slot.
- **No versioning / draft / publish lifecycle.**
- **No `weekType` (surat/maxraj, A/B week).**
- **No `Period` / `BellTime` reference table.** `timeSlot` is a bare integer.
- **No date-range validity** (`effectiveFrom` / `effectiveTo`).
- **No substitution / exception model.**
- **No `TeachingLoad` model** tied to schedule.
- `roomNumber` (String) coexists with `roomId` (UUID FK) — data-duplication risk.

### 1.4 Excel Import

**`ImportService.parseSchedule()`** reads Excel with columns:
`A: classId | B: subjectId | C: teacherId | D: dayOfWeek | E: timeSlot | F: startTime | G: endTime | H: roomNumber`

**`ImportService.commitSchedule()`** inserts rows in a transaction:
- Derives `branchId` from `class.branchId`.
- Skips if `(schoolId, dayOfWeek, timeSlot, classId)` already exists (naïve uniqueness check).
- **Does NOT run `ConflictDetectorService`** — may create teacher/room conflicts silently.

Template generation endpoint exists: `GET /v1/import/templates/schedule`.

### 1.5 Attendance Integration

- `Attendance.scheduleId` is an **optional** FK.
- `MarkAttendanceDto` accepts `scheduleId?: string`.
- Attendance marking currently works primarily by `classId + date`; `scheduleId` is underutilized in the UI.
- Attendance reports (`getReport`, `getStudentHistory`) include `schedule → subject` join.

### 1.6 RBAC & Tenant Scoping

- **Backend:** `RolesGuard` + `@Roles(DIRECTOR, VICE_PRINCIPAL, BRANCH_ADMIN)` on write endpoints.
- **Backend queries:** `buildTenantWhere(currentUser)` filters by `schoolId` (and `branchId` if user has one).
- **Frontend:** `const canManage = ['director', 'vice_principal'].includes(user?.role ?? '')` — **excludes `branch_admin`**.

### 1.7 Tests

| Test file | Status | Issue |
|---|---|---|
| `schedule.service.spec.ts` | 🔴 **Broken** | Missing `ConflictDetectorService` provider; missing `redis.get` mock; `checkConflict` tests mock old direct-query logic (now delegates to `ConflictDetectorService`); zero coverage for `create`, `update`, `getWeek`, `getToday`, `findByClass`, `getTeacherCrossBranch` |
| `attendance.service.spec.ts` | 🔴 **Broken** | Missing `RedisService` provider |

---

## 2. Problems (Bugs & Design Debt)

### 2.1 🔴 Critical Bugs

#### BUG-1: `create()` stores wrong `branchId` for Director
```typescript
const branchId = cls.branchId;              // correctly fetched
// ...
branchId: currentUser.branchId!,            // BUG: Director has branchId=null
```
When a **Director** (`branchId: null`) creates a schedule, the row stores `null` as `branchId`, breaking branch scoping, conflict detection, and cross-branch UI.

**Fix:** `branchId: branchId` (use the variable derived from `class.branchId`).

#### BUG-2: Sunday maps to Friday (`todayKey`)
In **three places** (`ScheduleWorkspace`, `StudentScheduleView`, `WeeklyGrid`):
```typescript
const i = new Date().getDay();
return DAYS[i === 0 ? 4 : i - 1]?.key ?? DayOfWeek.MONDAY;
```
`DAYS` has 6 entries (Mon–Sat). Sunday (`0`) → index `4` = **Friday**.

**Fix:** `i === 0 ? 5 : i - 1` (Sunday → Saturday).

#### BUG-3: Frontend `canManage` denies Branch Admin
Frontend hides create/edit/delete UI for `branch_admin`, but backend allows it. RBAC mismatch.

**Fix:** Add `'branch_admin'` to `canManage` array.

### 2.2 🟡 High-Priority Issues

#### ISSUE-4: `checkConflict()` hardcodes slot math
```typescript
const slotHour = 7 + Math.floor(((params.timeSlot - 1) * 45) / 60);
```
Assumes all schools start at 07:00 with 45-minute slots. Schools with different bell schedules get incorrect conflict detection.

#### ISSUE-5: `commitSchedule()` skips conflict detection
Import bypasses `ConflictDetectorService`. A bulk import can silently create overlapping teacher/room assignments.

#### ISSUE-6: `roomNumber` free-text vs `roomId` UUID disconnect
- Frontend create/edit modal only has `<Input>` for `roomNumber`.
- Backend supports `roomId` (FK to `Room`).
- Frontend never fetches rooms or shows a dropdown.
- Data drift risk: `roomNumber` and `room.name` can diverge.

#### ISSUE-7: `getToday()` Sunday handling mismatch
`getToday()` maps Sunday to Saturday (backend), but `todayKey` maps Sunday to Friday (frontend).

#### ISSUE-8: Teacher filter pagination risk
```typescript
usersApi.getAll({ page: 1, limit: 100 })
```
If a branch has >100 staff, teachers beyond page 1 are missing from the filter dropdown.

### 2.3 🟢 Medium / Low Issues

| # | Issue | Location |
|---|---|---|
| 9 | `scheduleApi.update` TypeScript type is wrong — omits `classId`, `subjectId`, `teacherId` which are sent at runtime | `lib/api/schedule.ts` |
| 10 | Frontend hard-codes 7 slots (`SLOT_TIMES` array); DTO allows `timeSlot >= 1` with no upper bound; some schools may need 8+ slots | `schedule-workspace.tsx` |
| 11 | No WebSocket listener for `schedule:updated` — stale data for concurrent editors | `schedule-workspace.tsx` |
| 12 | `GET /schedule/today` and `GET /schedule/teacher/:id/cross-branch` defined in API client but **never invoked** | `lib/api/schedule.ts` |
| 13 | Parent must manually pick a class; no auto-link to `user.studentId` or children | `StudentScheduleView` |
| 14 | No print stylesheet or PDF export | — |
| 15 | No copy/duplicate slot action | — |
| 16 | No bulk edit / multi-select | — |
| 17 | `Subject` has a single `teacherId`; no multi-teacher subject support | `schema.prisma` |
| 18 | `import.service.ts` `commitSchedule` uses `prisma.$transaction` but catches outer errors only; individual row failures stop the entire batch | `import.service.ts` |
| 19 | `CourseScope` enum exists in migration but missing from `schema.prisma` | Schema drift |

---

## 3. Target Goal (To-Be) — ProRector-Level Timetable

### 3.1 Required Capabilities

| # | Capability | Priority | Notes |
|---|---|---|---|
| 1 | **Manual timetable entry** | P0 | Already exists; fix critical bugs first |
| 2 | **Automatic timetable generation** | P1 | Constraint solver (backtracking / CSP) |
| 3 | **Conflict detection** (teacher / class / room) | P0 | Already exists; fix hardcoded slot math |
| 4 | **2-week rotation** (surat/maxraj, odd/even week) | P1 | Add `weekType` field |
| 5 | **Excel tarifikatsiya import** | P1 | Extend existing import with teaching-load columns |
| 6 | **Interactive drag-and-drop editor** | P1 | `@hello-pangea/dnd` or similar |
| 7 | **Teacher / class / room preview & availability** | P1 | Reuse `getTeacherCrossBranch`; add room availability |
| 8 | **Export (Excel / PDF)** | P1 | Add export endpoints + frontend buttons |
| 9 | **Draft → Validate → Publish versioning** | P1 | Add `status` + `version` + `effectiveFrom/To` |
| 10 | **RBAC + branch/school scoping** | P0 | Already exists; fix `branch_admin` frontend gap |
| 11 | **Attendance integration** | P0 | `scheduleId` exists; improve UI linkage |
| 12 | **Bell schedule / period customization** | P1 | Add `Period` model |
| 13 | **Substitution & cancellation** | P2 | Add `ScheduleChange` model |
| 14 | **Teaching load analytics** | P2 | Link scheduled hours to `StaffSalary` |

---

## 4. Gap Analysis

| Requirement | Current | Gap | Effort |
|---|---|---|---|
| Manual entry | ✅ Working (with branchId bug) | Fix BUG-1 | Small |
| Auto generation | ❌ None | Build CSP solver service | Large |
| Conflict detection | ✅ `ConflictDetectorService` | Fix ISSUE-4 (hardcoded slots) | Small |
| 2-week rotation | ❌ No `weekType` | Schema migration + frontend toggle | Medium |
| Excel tarifikatsiya import | ⚠️ Basic schedule import only | Add teacher-load columns + validation | Medium |
| Drag-and-drop | ❌ No DnD | Add DnD library + update mutations | Medium |
| Teacher/class/room preview | ⚠️ Teacher cross-branch exists | Add room availability grid | Medium |
| Export | ❌ No export | Excel: reuse `exceljs`; PDF: `puppeteer` or `pdfkit` | Medium |
| Draft → Validate → Publish | ❌ No status/version | Schema migration + state machine + publish logic | Large |
| RBAC + scoping | ✅ Backend OK | Fix BUG-3 (frontend `branch_admin`) | Small |
| Attendance integration | ⚠️ `scheduleId` exists | Link attendance UI to schedule slots | Small |
| Bell schedule | ❌ Hard-coded slots | Add `Period` model + admin config | Medium |
| Substitution | ❌ No model | Add `ScheduleChange` model + UI | Large |
| Teaching load analytics | ⚠️ `StaffSalary.weeklyLessonHours` exists | Derive from `Schedule` counts | Medium |

---

## 5. Reuse vs Refactor Decisions

### ✅ Reuse (Keep As-Is, Minor Fixes)

| Component | Rationale |
|---|---|
| `ConflictDetectorService` | Solid UTC-minute overlap logic. Only needs configurable period definitions instead of hardcoded 45-min math. |
| `buildTenantWhere` + `RolesGuard` | Already covers school/branch scoping. No changes needed. |
| Redis cache layer (`getJson`/`setJson` + invalidation) | Pattern is correct. Just ensure cache keys include `weekType` when added. |
| `ImportService` framework (parse → preview → commit) | Generic dialog and flow work well. Extend with new columns, don’t rewrite. |
| `Schedule` Prisma model (core fields) | Sufficient for basic slots. Add columns, don’t replace. |
| `roomsApi` (backend) | Already functional. Just wire into schedule frontend. |

### 🔧 Refactor (Restructure)

| Component | Rationale |
|---|---|
| `schedule-workspace.tsx` (1 243 lines) | Split into: `WeeklyGrid`, `ListView`, `ScheduleFilters`, `SlotModal`, `SidebarStats`, `useScheduleSocket`. Monolith is unmaintainable. |
| `schedule.service.ts` `create()` branchId logic | Single-line fix, but critical. Extract branch resolution into helper. |
| `schedule.service.spec.ts` | Completely rewrite. Current tests don’t compile and cover <10% of service. |
| `ImportService.commitSchedule()` | Must call `ConflictDetectorService.assertNoClash()` before each insert. |

### ❌ Remove / Deprecate

| Component | Rationale |
|---|---|
| `roomNumber` string field (frontend usage) | Deprecate in favor of `roomId` dropdown. Keep in DB for legacy data migration. |
| Hard-coded `SLOT_TIMES` array | Replace with configurable `Period` query. |

### 🆕 Create New

| Component | Purpose |
|---|---|
| `Period` model + service | Define bell schedules per school/branch |
| `ScheduleGeneratorService` | CSP / backtracking auto-timetable solver |
| `ScheduleTemplate` / `TimetableVersion` model | Draft → publish lifecycle container |
| `ScheduleChange` model | Substitutions, cancellations, room swaps |
| `TeachingLoadService` | Derive actual vs planned hours from `Schedule` |
| Export endpoints (`GET /schedule/export/excel`, `GET /schedule/export/pdf`) | Download timetables |

---

## 6. Implementation Plan (Phased)

### Phase 0 — Stabilization (Do First)
**Goal:** Fix critical bugs and broken tests before adding features.

1. **Fix BUG-1:** `create()` → use `cls.branchId` instead of `currentUser.branchId!`.
2. **Fix BUG-2:** Correct `todayKey` Sunday mapping in 3 frontend locations.
3. **Fix BUG-3:** Add `'branch_admin'` to `canManage` in frontend.
4. **Fix schedule tests:** Add `ConflictDetectorService` + `RedisService.get` mocks; rewrite `checkConflict` tests; add coverage for `create`, `update`, `getWeek`.
5. **Fix ISSUE-4:** Make `checkConflict()` use actual `startTime`/`endTime` from payload instead of deriving from `timeSlot`.

### Phase 1 — Foundation
**Goal:** Add period/bell customization and room integration.

1. **Schema:** Add `Period` model (`schoolId`, `branchId`, `slotNumber`, `startTime`, `endTime`, `isBreak`, `label`).
2. **Backend:** `PeriodsModule` (CRUD).
3. **Frontend:** Replace hard-coded `SLOT_TIMES` with `useQuery` fetch of `Period`s.
4. **Frontend:** Wire `roomsApi` into schedule modal (dropdown instead of free-text `roomNumber`).
5. **Backend:** Update `ConflictDetectorService` to use `Period` definitions instead of hardcoded 45-min math.

### Phase 2 — Auto-Generation & Import
**Goal:** Build the solver and improve import.

1. **Backend:** `ScheduleGeneratorService` — CSP solver with constraints:
   - Teacher availability (no conflicts)
   - Room capacity & type matching
   - Class subject hour quotas
   - Period preferences
2. **Backend:** `POST /schedule/generate` endpoint (Director/VP only).
3. **Frontend:** "Avto-jadval" button with constraint config modal.
4. **Import:** Extend `parseSchedule` to accept `weekType` and teaching-load columns.
5. **Import:** Add conflict pre-check in `commitSchedule()`.

### Phase 3 — Versioning & 2-Week Rotation
**Goal:** Add draft/publish and surat/maxraj support.

1. **Schema:** Add `weekType` enum (`ALL`, `ODD`, `EVEN`) to `Schedule`.
2. **Schema:** Add `TimetableVersion` model (`id`, `schoolId`, `branchId`, `name`, `status: draft|published|archived`, `effectiveFrom`, `effectiveTo`, `createdAt`).
3. **Backend:** All reads filter by `status = published` unless `?includeDraft=true`.
4. **Backend:** `POST /schedule/:versionId/publish`, `POST /schedule/:versionId/archive`.
5. **Frontend:** Version selector dropdown; draft badge; publish confirmation.
6. **Frontend:** Week-type toggle (odd/even/all) in grid view.

### Phase 4 — UX Polish & Export
**Goal:** Drag-and-drop, export, substitutions.

1. **Frontend:** Integrate `@hello-pangea/dnd` for drag-and-drop rescheduling.
2. **Backend:** `PUT /schedule/:id/move` optimized endpoint for DnD.
3. **Backend:** `GET /schedule/export/excel` (reuse `exceljs`).
4. **Backend:** `GET /schedule/export/pdf` (headless browser or `pdfkit`).
5. **Schema + Backend:** `ScheduleChange` model for substitutions/cancellations.
6. **Frontend:** Substitution modal (select replacement teacher / room / cancellation reason).

### Phase 5 — Teaching Load & Tarifikatsiya
**Goal:** Link schedule to payroll/analytics.

1. **Backend:** `TeachingLoadService` — aggregate scheduled hours per teacher per week.
2. **Backend:** Compare `scheduledHours` vs `StaffSalary.weeklyLessonHours` → overload warning.
3. **Frontend:** Teacher load dashboard (hours by subject, overload alerts).
4. **Frontend:** Tarifikatsiya preview linked to actual schedule data.

---

## 7. Risk Areas

| Risk | Impact | Mitigation |
|---|---|---|
| **BUG-1 (wrong branchId)** | High — corrupts branch scoping for all Director-created schedules | Fix immediately in Phase 0 |
| **Auto-generator complexity** | High — CSP is NP-hard; may be slow for large schools | Start with greedy + backtracking; add timeout; allow manual override |
| **Schema migration on `Schedule` (versioning)** | Medium — many foreign keys and indexes | Add `TimetableVersion` as a wrapper, don’t mutate `Schedule` primary key logic |
| **2-week rotation UX confusion** | Medium — users may forget to set `weekType` | Default to `ALL`; clear visual indicators in grid |
| **Import conflict bypass** | Medium — bulk imports can create invalid data | Add `ConflictDetectorService` call in `commitSchedule` before Phase 2 release |
| **Frontend monolith refactor** | Low-Medium — risk of regressions in 1 243-line file | Extract one component at a time; preserve existing behavior |
| **Drag-and-drop accessibility** | Low — keyboard users may be excluded | Ensure DnD has keyboard fallback (click-to-move) |

---

## 8. Test Plan

### 8.1 Unit Tests (Backend)

| Target | Coverage Required |
|---|---|
| `ScheduleService.create()` | Valid creation, branchId resolution, teacher-subject mismatch, conflict rejection, cache invalidation, WebSocket emission |
| `ScheduleService.update()` | Partial update, conflict detection with `excludeId`, teacher-subject validation, cache invalidation |
| `ScheduleService.getWeek()` | Tenant scoping (branch vs school-wide), `isCrossBranch` flag, cache hit/miss |
| `ScheduleService.getToday()` | Correct day mapping (including Sunday), tenant scoping |
| `ScheduleService.findByClass()` | Class filter, includes, cache |
| `ScheduleService.getTeacherCrossBranch()` | Cross-branch annotation, viewerBranchId logic |
| `ConflictDetectorService` | Teacher overlap, room overlap, class overlap, timezone edge cases (DST), non-overlapping adjacent slots |
| `ScheduleGeneratorService` (new) | Valid solution for small dataset, timeout handling, constraint validation |

### 8.2 Integration Tests

| Scenario | Steps |
|---|---|
| Create + conflict | Create slot A; attempt overlapping slot B → assert 409 |
| Update + move | Create slot; update day/time; assert old cache invalidated |
| Import + conflict | Import Excel with conflicting teacher → assert skipped / error |
| Publish version | Create draft version; publish; assert old version archived, new version active |
| 2-week rotation | Create odd-week slot; query even-week view → assert slot hidden |
| DnD move | Drag slot from Mon-1 to Tue-2; assert update mutation + conflict check |

### 8.3 E2E / Frontend Tests

| Scenario | Check |
|---|---|
| Branch admin can create | Login as `branch_admin`; assert "+" button visible and functional |
| Sunday todayKey | Set system date to Sunday; assert active day tab is Saturday |
| Room dropdown | Open create modal; assert room dropdown populated from `roomsApi` |
| Socket live update | Open schedule in 2 tabs; create slot in tab A; assert tab B refreshes |
| Teacher auto-filter | Login as `teacher`; assert schedule defaults to "My lessons" filter |
| Export Excel | Click export; assert `.xlsx` download with correct data |

---

## 9. Summary Table — Reuse vs Build

| Area | Decision | Effort |
|---|---|---|
| Core CRUD (`ScheduleService`) | **Reuse** + bug fixes | Small |
| Conflict detection | **Reuse** + configurable periods | Small |
| RBAC / tenant scoping | **Reuse** as-is | None |
| Redis caching | **Reuse** + key updates for new fields | Small |
| Excel import framework | **Reuse** + extend columns | Medium |
| Frontend workspace | **Refactor** — split monolith | Medium |
| Auto-generation | **Build new** `ScheduleGeneratorService` | Large |
| Period / bell schedule | **Build new** `PeriodsModule` | Medium |
| Versioning (draft/publish) | **Build new** `TimetableVersion` model + logic | Large |
| 2-week rotation | **Extend** `Schedule` with `weekType` | Medium |
| Export (Excel/PDF) | **Build new** export endpoints | Medium |
| Drag-and-drop | **Build new** DnD wrapper | Medium |
| Substitution | **Build new** `ScheduleChange` model | Large |
| Teaching load analytics | **Extend** existing payroll + schedule linkage | Medium |

---

## 10. Quick Wins (Can Ship Immediately)

1. Fix `branchId` in `ScheduleService.create()` (1 line).
2. Fix `todayKey` Sunday mapping in 3 frontend spots (3 lines).
3. Add `'branch_admin'` to `canManage` (1 line).
4. Integrate `roomsApi` into schedule modal (replace `<Input>` with `<Select>`).
5. Add `timeSlot` upper bound in DTO (`@Max(8)` or dynamic from `Period` count).
6. Fix schedule tests to compile and cover core paths.

---

*End of audit report. No code changes were made during this audit.*
