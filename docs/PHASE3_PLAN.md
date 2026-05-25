# Phase 3 Plan: Timetable Lifecycle & 2-Week Schedule Support

> Status: **PLAN ONLY** — awaiting approval before implementation.  
> Dependencies: Phase 2 (Import hardening, Greedy generator, Subject.hoursPerWeek)  
> Commit baseline: `7950c4d`

---

## Executive Summary

Phase 3 introduces two major capabilities:
1. **Timetable lifecycle management** — draft → validate → publish → archive, with write-protection on published schedules.
2. **2-week alternating schedule support** — normal (oddiy), numerator (surat), denominator (maxraj) week types.

All existing schedule consumers (student, parent, teacher, public display, attendance, cron) will be migrated to read **only published** schedules. The schedule workspace will gain version controls and a week-type toggle.

---

## 1. Database Migration Plan

### 1.1 New Enum: `ScheduleStatus`

```prisma
enum ScheduleStatus {
  draft
  validated
  published
  archived
}
```

### 1.2 New Enum: `WeekType`

```prisma
enum WeekType {
  all       // @map("all")     — Oddiy (har hafta)
  numerator // @map("surat")   — Surat (toq hafta)
  denominator // @map("maxraj") — Maxraj (juft hafta)
}
```

> **Note on naming:** Prisma enums use camelCase in schema but kebab-case in generated TypeScript. The `@map` values define DB storage. Uzbek UI labels: `all` → "Oddiy", `numerator` → "Surat", `denominator` → "Maxraj".

### 1.3 Schema Changes to `Schedule` Model

```prisma
model Schedule {
  id             String         @id @default(uuid())
  schoolId       String
  branchId       String
  classId        String
  subjectId      String
  teacherId      String
  roomNumber     String?
  roomId         String?
  dayOfWeek      DayOfWeek
  timeSlot       Int
  startTime      String
  endTime        String
  startDayMinUtc Int?
  endDayMinUtc   Int?
  
  // ── Phase 3 additions ──
  status         ScheduleStatus @default(draft)
  weekType       WeekType       @default(all)
  versionNote    String?        // e.g. "2026-bahor", "Sinov 1"
  publishedAt    DateTime?
  publishedBy    String?        // User.id
  
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  school     School       @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  branch     Branch       @relation(fields: [branchId], references: [id], onDelete: Cascade)
  class      Class        @relation(fields: [classId], references: [id], onDelete: Cascade)
  subject    Subject      @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  teacher    User         @relation("ScheduleTeacher", fields: [teacherId], references: [id])
  room       Room?        @relation(fields: [roomId], references: [id], onDelete: SetNull)
  attendance Attendance[]

  @@index([schoolId, branchId, status])
  @@index([schoolId, branchId, weekType])
  @@index([schoolId, status, weekType])
  @@index([teacherId, dayOfWeek, status])
  @@index([classId, dayOfWeek, status])
  @@index([roomId, dayOfWeek, status])
  @@map("schedules")
}
```

### 1.4 Backward-Compatibility Strategy

| Step | Action | Safety |
|------|--------|--------|
 1 | Create migration adding `status` `@default(draft)` and `weekType` `@default(all)` | **Safe** — all existing rows become `draft`/`all` |
 2 | Run migration in production | **Safe** — no data loss |
 3 | Deploy code that writes `status: published` on create (temporary bridge) | **Safe** — preserves old behavior |
 4 | After all consumers migrated, remove bridge and use proper lifecycle | **Planned** |

> **Critical decision:** Should existing rows be retroactively marked `published` or left as `draft`?
> - **Option A (Recommended):** Migration script updates all existing rows to `status = published`, `publishedAt = createdAt`. This ensures zero disruption to student/parent/teacher views on day one.
> - **Option B:** Leave as `draft`. Requires explicit publish action before any student sees schedules. Risk: all dashboards go blank after deploy.

**Recommendation: Option A** — mark all existing schedules as `published` via migration. The lifecycle features then apply only to *new* changes.

---

## 2. Backend Endpoint Plan

### 2.1 Modified Endpoints

All existing read endpoints gain implicit `status: published` filter. A new query param `includeDrafts` (Director/VP only) allows viewing drafts.

| Endpoint | Change |
|----------|--------|
| `GET /schedule/week` | Filter `status: published` by default. Optional `?weekType=all\|numerator\|denominator`. Optional `?includeDrafts=true` (managers only). |
| `GET /schedule/today` | Filter `status: published`. Infer `weekType` from current ISO week number (odd→numerator, even→denominator) unless `?weekType=...` is provided. |
| `GET /schedule/class/:classId` | Filter `status: published`. Optional `?weekType=...`. |
| `GET /schedule/check-conflict` | Conflict detector must include `status` filter to avoid flagging conflicts against draft slots. |
| `POST /schedule` | Creates with `status: draft` by default. **Block** if a `published` slot already exists for `(class, day, slot, weekType)`. |
| `PUT /schedule/:id` | **Block** direct edits if `status === published`. Return `409 Conflict: Jadval chop etilgan, avval nashrdan oling`. |
| `DELETE /schedule/:id` | **Block** if `status === published`. Require unpublish first. |
| `POST /schedule/generate` | Generate with `status: draft` by default. Add `weekType` to DTO. |
| `POST /schedule/generate/commit` | Save proposed slots as `status: draft`. |
| `POST /import/schedule/commit` | Import as `status: draft` by default. Add `publishAfterImport` flag. |

### 2.2 New Endpoints

```typescript
// ── Lifecycle ──

POST /schedule/:id/validate
  @Roles(DIRECTOR, VICE_PRINCIPAL, BRANCH_ADMIN)
  // status: draft → validated
  // Runs full conflict check across ALL draft+validated slots for this branch.
  // If conflicts found, returns 409 with conflict list.

POST /schedule/:id/publish
  @Roles(DIRECTOR, VICE_PRINCIPAL)
  // status: draft|validated → published
  // Sets publishedAt = now(), publishedBy = currentUser.sub
  // Audit log: action=publish, entity=schedule, entityId=id

POST /schedule/:id/unpublish
  @Roles(DIRECTOR, VICE_PRINCIPAL)
  // status: published → draft
  // Requires confirmation. Audit log: action=unpublish.

POST /schedule/:id/archive
  @Roles(DIRECTOR, VICE_PRINCIPAL)
  // status: published|draft → archived
  // Soft-archive. Keeps data for historical reference.

POST /schedule/bulk-publish
  @Roles(DIRECTOR, VICE_PRINCIPAL)
  Body: { ids: string[], branchId?: string }
  // Publishes all draft/validated slots in batch.
  // Validates no conflicts before publishing.

// ── Week Type ──

GET /schedule/week-type/current
  // Returns { currentWeekType: 'numerator' | 'denominator', isoWeekNumber: number }
  // Deterministic: ISO week number % 2 === 1 → numerator, else denominator.

// ── Audit ──

GET /schedule/:id/history
  @Roles(DIRECTOR, VICE_PRINCIPAL, BRANCH_ADMIN)
  // Returns AuditLog[] for this schedule slot.
```

### 2.3 Modified Services

#### `ScheduleService`

```typescript
// All read methods gain optional status filter (default: ['published'])
async getWeek(user, classId?, options?: { weekType?: WeekType; includeDrafts?: boolean })
async getToday(user, options?: { weekType?: WeekType })
async findByClass(classId, user, options?: { weekType?: WeekType; status?: ScheduleStatus[] })

// Write protection
async create(dto, user) {
  // Check existing published slot
  const existing = await prisma.schedule.findFirst({
    where: {
      classId: dto.classId, dayOfWeek: dto.dayOfWeek, timeSlot: dto.timeSlot,
      weekType: dto.weekType ?? WeekType.ALL,
      status: { in: [ScheduleStatus.published, ScheduleStatus.validated] },
    },
  });
  if (existing && !dto.overwriteExisting) throw new ConflictException('Bu vaqtda chop etilgan jadval mavjud');
  
  // Create as draft
  return prisma.schedule.create({ data: { ...dto, status: ScheduleStatus.draft } });
}

async update(id, dto, user) {
  const slot = await prisma.schedule.findFirst({ where: { id, ...buildTenantWhere(user) } });
  if (slot.status === ScheduleStatus.published) {
    throw new ConflictException('Chop etilgan jadvalni bevosita tahrirlash mumkin emas. Avval nashrdan oling.');
  }
  // ... rest of update
}

async remove(id, user) {
  const slot = await prisma.schedule.findFirst({ where: { id, ...buildTenantWhere(user) } });
  if (slot.status === ScheduleStatus.published) {
    throw new ConflictException('Chop etilgan jadvalni o\'chirish mumkin emas. Avval nashrdan oling.');
  }
  // ... rest of remove
}

// Lifecycle transitions
async validate(id, user) { ... }
async publish(id, user) { ... }
async unpublish(id, user) { ... }
async archive(id, user) { ... }
```

#### `ConflictDetectorService`

```typescript
interface ClashParams {
  // ... existing fields ...
  weekType?: WeekType;
  status?: ScheduleStatus[]; // default: [published, validated]
}
```

All 3 conflict queries (teacher/room/class) must include:
```prisma
where: {
  // ... existing filters ...
  weekType: params.weekType ?? WeekType.ALL,
  status: { in: params.status ?? [ScheduleStatus.published, ScheduleStatus.validated] },
}
```

> **Why include `validated`?** A `validated` slot is essentially "ready to publish" and should still be treated as a real booking for conflict detection. Only `draft` slots are excluded from the default conflict scope (because drafts can have temporary overlaps during editing).

#### `ScheduleGeneratorService`

```typescript
// GenerateScheduleDto adds:
weekType?: WeekType; // default: all

async generate(dto, user) {
  // ... existing logic ...
  // Filter existing schedules by weekType
  // Proposed slots include weekType
  // All proposed slots get status: draft
}
```

#### `ImportService` (`commitSchedule`)

```typescript
// Import rows get status: draft by default
// Add optional publishAfterImport flag (Director/VP only)
// If publishAfterImport, run bulk-publish after commit
```

#### `AttendanceService`

```typescript
// When reading schedule for attendance context:
// include: { schedule: { where: { status: published } } }
// This ensures attendance is only linked to published slots.
```

> **Open question:** Should `markAttendance` validate that the provided `scheduleId` points to a `published` slot? **Yes** — add a check: `if (schedule.status !== published) throw BadRequestException('Davomat faqat chop etilgan jadval uchun belgilanishi mumkin')`.

### 2.4 Audit Integration

`ScheduleService` currently does **NOT** call `AuditService.log()`. Phase 3 will add audit logging for:

| Action | Trigger | Old Data | New Data |
|--------|---------|----------|----------|
| `create` | `POST /schedule` | null | Full slot data |
| `update` | `PUT /schedule/:id` | Pre-update slot | Post-update slot |
| `delete` | `DELETE /schedule/:id` | Full slot | null |
| `publish` | `POST /schedule/:id/publish` | `{status: draft}` | `{status: published}` |
| `unpublish` | `POST /schedule/:id/unpublish` | `{status: published}` | `{status: draft}` |
| `archive` | `POST /schedule/:id/archive` | `{status: published\|draft}` | `{status: archived}` |
| `bulk-publish` | `POST /schedule/bulk-publish` | List of ids | `{status: published}` |

Inject `AuditService` into `ScheduleService` and call `auditService.log({ action, entity: 'schedule', entityId, oldData, newData })` after each mutation.

---

## 3. Frontend UX Plan

### 3.1 Schedule Workspace (`schedule-workspace.tsx`)

#### A. Week-Type Toggle

Add a toggle button group in the toolbar (next to grid/list view):

```
[Oddiy] [Surat] [Maxraj]
```

- Default: "Oddiy" (`all`)
- When "Surat" or "Maxraj" is selected:
  - `getWeek()` and `getToday()` include `?weekType=numerator|denominator`
  - The grid highlights which slots belong to the current week type
  - Slots of the *other* week type are shown greyed-out or with a subtle badge

#### B. Status Indicators

Each schedule slot card gets a tiny status badge:

| Status | Badge | Visibility |
|--------|-------|------------|
| `published` | No badge (implicit) | Visible to all roles |
| `draft` | 🟡 "Qoralama" | Visible only to managers |
| `validated` | 🔵 "Tasdiqlangan" | Visible only to managers |
| `archived` | ⏸️ "Arxiv" | Hidden by default; toggle to show |

#### C. Lifecycle Actions (Manager-only)

Right-click or entity-panel actions on a slot:

```
Tahrirlash    (only if draft)
Nashr qilish  (only if draft/validated)
Nashrdan olish (only if published)
Arxivlash     (only if draft/published)
O'chirish     (only if draft)
```

#### D. Bulk Actions Bar

When manager selects multiple slots (checkbox selection mode):

```
[5 ta tanlandi]  [Nashr qilish]  [Arxivlash]  [O'chirish]
```

#### E. Draft/Published Filter

Add a filter toggle:

```
[☑️ Chop etilgan] [☑️ Qoralama] [☑️ Arxiv]
```

Default for students/teachers/parents: only ☑️ Chop etilgan.  
Default for managers: all checked.

### 3.2 Generator Dialog (`generator-dialog.tsx`)

Add a `weekType` selector before generation:

```
Hafta turi: [Oddiy ▼]
           └─ Surat
           └─ Maxraj
```

Generated slots are always `status: draft`. After generation, manager can bulk-publish.

### 3.3 Student / Parent / Teacher Dashboards

**No UI changes required** — just backend filter changes. However, add a small "Surat / Maxraj" indicator to the `TodayScheduleWidget` so users know which week type is currently active.

### 3.4 Public Display Page (`display/[schoolSlug]`)

- Backend `DisplayService.getTodaySchedule()` must auto-detect current week type from ISO week number.
- Add a small banner: "Bu hafta: Surat haftasi" / "Bu hafta: Maxraj haftasi".

### 3.5 Attendance UI

- When marking attendance, only show published schedule slots in the dropdown.
- If no published slot exists for today, show: "Bugun uchun chop etilgan dars jadvali mavjud emas."

---

## 4. Consumer Migration Checklist

Every place that queries `prisma.schedule` must be updated. Here's the complete list from the audit:

| File | Current Query | Required Change |
|------|--------------|-----------------|
| `schedule.service.ts` — `getWeek` | `buildTenantWhere` | Add `status: published` default; accept `weekType` param |
| `schedule.service.ts` — `getToday` | `buildTenantWhere` | Add `status: published`; infer/auto-detect `weekType` |
| `schedule.service.ts` — `findByClass` | `{classId, schoolId}` | Add `status: published`; accept `weekType` |
| `schedule.service.ts` — `create/update/remove` | — | Add status/validation logic |
| `conflict-detector.ts` | `findMany` | Add `weekType` + `status` filters |
| `schedule-generator.service.ts` | `findMany` | Add `weekType` + `status` filters |
| `import.service.ts` — `parseSchedule` | `findMany` | Add `status` filter for conflict checks |
| `import.service.ts` — `commitSchedule` | `findFirst`/`create` | Create with `status: draft`; check published conflicts |
| `cron.service.ts` | `findMany` | Add `status: published` |
| `parent.service.ts` | `findMany` | Add `status: published`; accept `weekType` |
| `display.service.ts` | `findMany` | Add `status: published`; auto-detect `weekType` |
| `attendance.service.ts` | `include: {schedule}` | Filter `status: published` in include; validate on mark |
| `analytics.service.ts` | `groupBy` | Add `status: published` filter |
| `classes.service.ts` | `updateMany` | No change needed |

---

## 5. Test Plan

### 5.1 Backend Tests

| # | Test | Expected |
|---|------|----------|
| 1 | `GET /schedule/week` returns only `published` slots by default | Pass |
| 2 | `GET /schedule/week?includeDrafts=true` returns drafts for Director | Pass |
| 3 | `GET /schedule/today` auto-detects current week type | Pass |
| 4 | `POST /schedule` creates with `status: draft` | Pass |
| 5 | `POST /schedule` blocks if published slot exists for same `(class, day, slot, weekType)` | Pass |
| 6 | `PUT /schedule/:id` blocks if slot is `published` | 409 Conflict |
| 7 | `DELETE /schedule/:id` blocks if slot is `published` | 409 Conflict |
| 8 | `POST /schedule/:id/publish` transitions draft → published | Pass |
| 9 | `POST /schedule/:id/unpublish` transitions published → draft | Pass |
| 10 | `POST /schedule/bulk-publish` publishes multiple drafts atomically | Pass |
| 11 | Conflict detector ignores `draft` slots by default | Pass |
| 12 | Conflict detector includes `validated` slots | Pass |
| 13 | Generator produces slots with `weekType: numerator` when requested | Pass |
| 14 | Attendance `markAttendance` rejects non-published `scheduleId` | 400 Bad Request |
| 15 | Parent `getChildSchedule` returns only published slots | Pass |
| 16 | Display service auto-detects ISO week parity | Pass |
| 17 | Audit log entry created on publish/unpublish/update | Pass |
| 18 | Branch Admin can publish only own branch | 403 Forbidden |
| 19 | Director can publish across all school branches | Pass |
| 20 | Migration script correctly marks existing rows as `published` | Pass |

### 5.2 Frontend Tests

| # | Test | Expected |
|---|------|----------|
| 21 | Week-type toggle changes query param | Pass |
| 22 | Draft slots show "Qoralama" badge for managers | Pass |
| 23 | Draft slots are hidden from student view | Pass |
| 24 | Published slot edit button is disabled | Pass |
| 25 | Generator dialog includes week-type selector | Pass |
| 26 | Bulk publish action appears when drafts selected | Pass |

---

## 6. Risk Areas & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **R1: All dashboards go blank after deploy** if existing rows default to `draft` instead of `published` | **Critical** | Migration script must retroactively set `status = published` on all existing rows |
| **R2: Conflict detector performance** — adding `status` and `weekType` filters to every query may slow down conflict detection | **Medium** | New composite indexes: `@@index([schoolId, status, weekType])`, `@@index([teacherId, dayOfWeek, status, weekType])` |
| **R3: Student/parent confusion** — "Surat / Maxraj" is unfamiliar to some users | **Medium** | Default view is `all` (Oddiy). 2-week toggle is opt-in. Add tooltip explanations. |
| **R4: Branch Admin vs Director publish scope** — Branch Admin might expect to publish their own branch but we restrict to Director/VP | **Low** | Clear RBAC in UI: show "Nashr qilish" only for Director/VP. Branch Admin sees "Tasdiqlash" (validate) instead. |
| **R5: Public display breaks** — display service currently has no auth and reads raw schedules | **Medium** | Update `DisplayService` before deploy. Add `status: published` filter and week-type auto-detection. |
| **R6: Attendance links break** — existing `Attendance.scheduleId` FKs may point to rows that get unpublished/archived | **Low** | Unpublish does not delete the row (only changes status), so FK remains valid. Archive should be rare and communicated. |
| **R7: Cache invalidation complexity** — Redis cache keys don't include status/weekType | **Medium** | Update cache key patterns: `schedule:{schoolId}:{branchId}:week:{classId}:{weekType}:{status}`. Invalidate all status/weekType variants on write. |
| **R8: Generator timeout on 2-week schedules** — doubling the demand (numerator + denominator separately) may hit timeout | **Low** | Generator already has `timeoutMs`. For 2-week, run two separate generator passes (one per week type) to keep each pass small. |

---

## 7. Implementation Sequence (if approved)

### Phase 3A — Schema & Core Backend
1. Create Prisma migration: add `ScheduleStatus`, `WeekType` enums; add fields to `Schedule`; backfill existing rows to `published`
2. Update `packages/types` with new enums
3. Update `ConflictDetectorService` with `weekType` + `status` filters
4. Update `ScheduleService` read methods with `status: published` default + `weekType` param
5. Update `ScheduleService` write methods with status protection
6. Add lifecycle endpoints (`validate`, `publish`, `unpublish`, `archive`, `bulk-publish`)
7. Add audit logging to `ScheduleService`
8. Update `ScheduleGeneratorService` with `weekType` support

### Phase 3B — Consumer Updates
9. Update `ImportService` to create drafts + optional publish-after-import
10. Update `AttendanceService` to validate published-only and filter includes
11. Update `ParentService`, `DisplayService`, `CronService`, `AnalyticsService`
12. Update `ScheduleController` with new endpoints + modified existing ones

### Phase 3C — Frontend
13. Add `WeekType` enum to frontend types
14. Update `scheduleApi` client with `weekType` and `status` params
15. Add week-type toggle to schedule workspace toolbar
16. Add status badges and lifecycle actions to slot cards
17. Add bulk action bar for multi-select
18. Update generator dialog with week-type selector
19. Update `TodayScheduleWidget` with week-type indicator
20. Update public display page with week-type banner

### Phase 3D — Tests & Validation
21. Write backend tests (20 tests)
22. Write frontend tests (6 tests)
23. Run full build + type-check
24. Manual smoke test: student view, parent view, public display, attendance

---

## 8. Open Questions for Approval

Before implementation begins, please confirm:

- [ ] **Existing data migration:** Should all existing schedules be retroactively marked `published`? (Recommended: Yes)
- [ ] **Branch Admin publish rights:** Should Branch Admin be able to publish their own branch, or only Director/VP? (Current plan: only Director/VP can publish; Branch Admin can validate)
- [ ] **Week type auto-detection:** Should `GET /schedule/today` auto-detect `surat/maxraj` from ISO week number, or require explicit `?weekType=` param? (Recommended: auto-detect with override)
- [ ] **Validated status necessity:** Do we need a separate `validated` status, or is `draft → published` sufficient? (Current plan: keep `validated` as an optional intermediate step)
- [ ] **Archive behavior:** Should archived slots be completely hidden from all queries, or visible via an "Include archived" toggle? (Current plan: hidden by default, toggle for managers)
- [ ] **Import default:** Should imported schedules default to `draft` or `published`? (Current plan: `draft`, with optional `publishAfterImport` flag)
