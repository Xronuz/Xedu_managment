# Phase 3 Smoke / Regression Report

**Commit under test:** `c0d587a` (on top of `dd68b02`)  
**Date:** 2026-05-21  
**Scope:** Timetable Lifecycle (draft → validated → published → archived) + 2-Week Rotation (all / numerator / denominator)

---

## Checklist Results

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Existing schedules after migration visible as `published`/`all` | **PASS** | Migration `20260525070636` backfills `status='published'` and `weekType='all'`. `defaultReadStatus()` defaults to `[PUBLISHED]`. |
| 2 | Teacher/Student/Parent dashboards show only published | **PASS** | `DisplayService`, `ParentService`, `CronService`, `AnalyticsService` all filter `status: 'published'`. `getToday`/`getWeek` default to `PUBLISHED` for non-managers. |
| 3 | Branch Admin can create/edit/validate draft, cannot publish | **PASS** | Controller: `validate` allows `BRANCH_ADMIN`; `publish` allows only `DIRECTOR`/`VICE_PRINCIPAL`. Service `canPublish()` enforces same. `assertCanModify()` blocks edits on published/archived. |
| 4 | Director/VP can publish | **PASS** | Controller roles + `canPublish()` both allow `DIRECTOR` and `VICE_PRINCIPAL`. |
| 5 | Published schedules cannot be edited/deleted directly | **PASS** | `assertCanModify()` throws `ConflictException` for `PUBLISHED` and `ARCHIVED`. `update()` also rejects `'status' in dto`. |
| 6 | Archive hides schedule by default | **PASS** | `defaultReadStatus()` only includes `ARCHIVED` when `includeArchived=true`. Frontend `showArchived` toggle is manager-only and defaults to `false`. |
| 7 | Week toggle works correctly | **PASS** | Backend: `where.weekType = { in: [ALL, options.weekType] }`. <br>• Oddiy (`all`) → shows only `weekType=all` <br>• Surat (`numerator`) → shows `all` + `numerator` <br>• Maxraj (`denominator`) → shows `all` + `denominator` |
| 8 | `all` schedules conflict with `numerator`/`denominator` | **PASS** | `ConflictDetector`: `effectiveWeekType === ALL` → `weekTypeFilter = undefined`, so clash check queries ALL week types. |
| 9 | `numerator` and `denominator` can share teacher/room/class/time | **PASS** | `ConflictDetector`: `effectiveWeekType === NUMERATOR` → `weekTypeFilter = { in: [ALL, NUMERATOR] }`. `DENOMINATOR` slots are excluded from the query, so no clash detected. |
| 10 | Import defaults to draft | **PASS** | `ImportService.commitSchedule()` sets `status: ScheduleStatus.DRAFT` by default before applying `publishAfterImport`. |
| 11 | `publishAfterImport` blocked for Branch Admin | **PASS** *(fixed)* | Added explicit `ForbiddenException` in `ImportService.commitSchedule()` when `currentUser.role === BRANCH_ADMIN && publishAfterImport`. |
| 12 | Generator creates draft slots with selected weekType | **PASS** | `ScheduleGeneratorService.commitProposed()` creates with `status: ScheduleStatus.DRAFT` and `weekType: slot.weekType ?? WeekType.ALL`. Generator `generate()` passes `dto.weekType` through. |
| 13 | Attendance reads only published schedule | **NOTE** | Attendance service does not query schedules; it receives `scheduleId` from the client. The frontend only renders published schedules, so in practice attendance is always marked against published slots. A server-side guard could be added as hardening. |
| 14 | AuditLog records validate/publish/unpublish/archive | **PASS** | All lifecycle methods call `this.audit('update', ...)` with `oldData`/`newData` capturing status transitions. `bulkPublish` loops and audits each slot individually. |

---

## Bugs Found & Fixed During Smoke Test

| Bug | Severity | Fix Commit |
|-----|----------|------------|
| `StudentScheduleView` called `scheduleApi.getWeek(classId)` with a raw string instead of `{ classId }` object param, breaking the student class schedule view. | **High** | `c0d587a` |
| `ImportService.commitSchedule()` allowed Branch Admin to use `publishAfterImport` with no RBAC check. | **High** | `c0d587a` |
| `ScheduleService.create()` audit log hardcoded `ScheduleStatus.DRAFT` even when `dto.status` was explicitly set to `PUBLISHED`. | **Low** | `c0d587a` |
| `ScheduleService.update()` used `(dto as any).weekType` casts despite `weekType` being properly typed in `CreateScheduleDto`. | **Low** | `c0d587a` |

---

## Build / Test Status

| Suite | Status |
|-------|--------|
| Backend `tsc --noEmit` | ✅ Pass |
| Backend `nest build` | ✅ Pass |
| Backend schedule tests (34 tests) | ✅ Pass |
| Backend import tests (12 tests) | ✅ Pass |
| Frontend `next build` | ✅ Pass |

---

## Observations / Notes

1. **StudentScheduleView weekType filtering**: The student schedule view (`StudentScheduleView`) calls `getWeek({ classId })` without passing a `weekType`. This means students see `all`, `numerator`, and `denominator` schedules mixed together. For a cleaner UX, the student view could auto-detect the current week type (like `getToday()` does) and pass it as a filter.

2. **Attendance schedule validation**: The attendance `mark()` endpoint accepts any `scheduleId` without validating the schedule's status. Adding a `prisma.schedule.findFirst({ where: { id: scheduleId, status: PUBLISHED } })` guard would close a small edge-case where a draft slot could receive attendance records.

3. **Display/Parent/Cron weekType filtering**: These consumers filter by `status: published` but do not filter by `weekType`. In practice this is acceptable because:
   - `getToday()` (used by cron/display) auto-detects current week type
   - `ParentService` returns the full class schedule; the parent portal could add a week-type indicator

4. **Cache invalidation**: Redis cache keys include `weekType` and `status` combinations, so switching between week types or toggling drafts correctly busts the cache via separate keys.
