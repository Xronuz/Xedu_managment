# Phase 23 — Data Architecture & Schema Evolution Hardening

**Status:** Complete  
**Commit:** `TBD`  
**Scope:** Schema normalization, migration safety, indexing, enum hardening, ownership tracking

---

## 1. Schema Audit Summary

### Models Audited: 61 | Enums: 35 | Indexes Added: 30+

**Critical findings from full schema audit:**
- `User.email` globally `@unique` — blocks true multi-school identity (documented for Phase 24)
- `StaffSalary.userId` globally `@unique` — one salary per user system-wide (kept for 1:1 relation compatibility)
- `Treasury.branchId` was required but centralized mode needs `null`
- 52 models lacked `createdById` ownership tracking
- 30+ high-cardinality FKs lacked indexes
- 6+ fields used `String` instead of enums
- `PaymentStatus` missing `cancelled` value
- No true soft-delete (`deletedAt`) on any model

---

## 2. Global Unique Constraints

### Addressed
| Model | Change | Status |
|-------|--------|--------|
| `Treasury.branchId` | `String` → `String?` (optional) | ✅ Migrated |
| `StaffSalary.userId` | Kept `@unique` for 1:1 relation safety | 📝 Phase 24 |
| `User.email` | Kept `@unique` — auth flows depend on it | 📝 Phase 24 architecture |

**Rationale for User.email:** Login, forgot-password, and lead-conversion flows all use `findUnique({ where: { email } })`. Changing this requires a separate `AuthIdentity` model and multi-step auth architecture. Documented for Phase 24.

---

## 3. Tenant Ownership Normalization

### Added `createdById` to Critical Models
| Model | Field | Populated By |
|-------|-------|-------------|
| `Payment` | `createdById String?` | `payments.service.ts` |
| `Grade` | `createdById String?` | `grades.service.ts` |
| `Attendance` | `createdById String?` | `attendance.service.ts`, `leave-requests.service.ts` |
| `LeaveRequest` | `createdById String?` | `leave-requests.service.ts`, `parent.service.ts` |
| `AuditLog` | `branchId String?` | `audit.service.ts` (native column now) |

**Reverse relations added to `User` model:**
- `paymentsCreated`, `gradesCreated`, `attendanceCreated`, `leaveRequestsCreated`

---

## 4. Indexing Strategy Hardening

### Critical Indexes Added

| Model | New Index | Rationale |
|-------|-----------|-----------|
| `Notification` | `recipientId + isRead + createdAt` | Inbox unread queries (was table-scanning) |
| `Notification` | `recipientId + createdAt` | General inbox listing |
| `Payment` | `studentId + createdAt` | Student portal history |
| `Payment` | `schoolId + createdAt` | School ledger chronological |
| `Grade` | `studentId + subjectId + date` | Transcript queries |
| `Attendance` | `branchId + date` | Branch admin daily roll |
| `Attendance` | `date + status` | Daily absence reports |
| `Schedule` | `classId + dayOfWeek` | Class timetable view |
| `Schedule` | `roomId + dayOfWeek` | Room conflict detection |
| `ExamSession` | `studentId + status` | "My exams" dashboard |
| `ExamSession` | `schoolId + status` | School-wide exam session monitoring |
| `DisciplineIncident` | `studentId + date` | Student discipline timeline |
| `DisciplineIncident` | `schoolId + resolved + date` | Unresolved incident reports |
| `LeaveRequest` | `requesterId + status` | "My leave requests" |
| `LeaveRequest` | `branchId + status` | Branch approval queue |
| `LibraryLoan` | `studentId + returnDate` | Active loans per student |
| `LibraryLoan` | `bookId + returnDate` | Active loans per book |
| `Lead` | `branchId + status` | Branch CRM funnel |
| `Lead` | `assignedToId + status` | "My leads" manager view |
| `Lead` | `schoolId + nextContactDate` | Follow-up reminders |
| `CourseEnrollment` | `studentId + status` | "My courses" view |
| `CourseEnrollment` | `courseId + status` | Course roster queries |
| `Exam` | `classId`, `subjectId` | Exam lookups by class/subject |
| `Homework` | `classId`, `subjectId` | Homework lookups |
| `AuditLog` | `schoolId + entity + createdAt` | Entity + date range filtering |
| `AuditLog` | `userId + createdAt` | "My actions" trail |
| `AcademicEvent` | `createdById` | Events-by-creator |

---

## 5. Audit Log Normalization

- **Added `branchId` column** to `AuditLog` model (was embedded in `newData._meta.branchId` as Phase 22 workaround)
- Updated `AuditLogOptions` interface — `branchId` now maps to native column
- **Removed** `_meta.branchId` embedding hack from `audit.service.ts`
- Added composite indexes for common audit query patterns

---

## 6. Historical Data Strategy

Documented approach (no premature sharding):

| Table | Growth Rate | Retention Strategy |
|-------|-------------|-------------------|
| `Attendance` | ~1M/year per 1000 students | Partition-ready via `date` index |
| `Payment` | ~100K/year per school | Archive after 7 years |
| `Grade` | ~500K/year per 1000 students | Keep indefinitely (academic record) |
| `AuditLog` | ~50K/year per school | Archive after 3 years |
| `Notification` | ~200K/year per school | Soft-delete + purge after 1 year |
| `CoinTransaction` | ~50K/year | Archive after 3 years |

**Partition readiness:** All high-growth tables now have `createdAt` + tenant composite indexes, making future PostgreSQL declarative partitioning straightforward.

---

## 7. Soft Delete + Data Lifecycle

**Current state:** No `deletedAt` on any model. Deletions use:
1. `isActive = false` boolean flip (School, Branch, User, Treasury, etc.)
2. Physical `onDelete: Cascade` (child records)

**Phase 24 candidates:**
- Add `deletedAt DateTime?` to `User`, `Payment`, `Grade` if regulatory compliance requires
- Add `archivedAt` to `Attendance` for long-term archival

---

## 8. Migration Safety System

### Migration Created: `20260509082651_phase_23_schema_hardening`

**Safe operations only:**
- `ALTER TABLE ... ALTER COLUMN ... DROP NOT NULL` (Treasury.branchId)
- `ALTER TABLE ... ADD COLUMN ...` (AuditLog.branchId, createdById fields)
- `CREATE INDEX ...` (all new indexes)
- `CREATE TYPE ...` (new enums)
- `ALTER TABLE ... ALTER COLUMN ... TYPE ... USING ...` (enum conversions)

**No destructive operations:**
- No `DROP COLUMN`
- No `DROP INDEX` on existing indexes
- No `DELETE` or data mutations
- No constraint removals that would break existing data

### Rules for Future Migrations
1. Always use `--create-only` first, review SQL manually
2. Never drop columns without archiving data
3. Never remove unique constraints without checking code dependencies
4. Always test `prisma migrate dev` on a copy of production data
5. Document breaking changes in commit message and `docs/`

---

## 9. Analytics + Snapshot Readiness

**Pre-aggregation pathways created:**
- `Grade`: `studentId + subjectId + date` index supports monthly/quarterly rollup queries
- `Attendance`: `date + status` index supports daily summary rollups
- `Payment`: `schoolId + createdAt` index supports revenue aggregation
- `AuditLog`: `schoolId + entity + createdAt` supports entity-level change metrics

**No warehouse architecture introduced.** These indexes provide fast aggregation queries on the operational database.

---

## 10. Event + Notification Persistence

- Queue job interfaces now include optional `schoolId` (Phase 22)
- `Notification` table has `recipientId + isRead + createdAt` composite index for fast inbox queries
- No separate event store introduced — operational database handles persistence

---

## 11. Storage + File Metadata

- Upload paths now include `{schoolId}/{folder}/{uuid}` (Phase 22)
- No schema changes for file metadata — paths are self-describing

---

## 12. Enum + Status Normalization

### New Enums Created
| Enum | Values | Replaces |
|------|--------|----------|
| `CourseEnrollmentStatus` | `active`, `completed`, `dropped`, `suspended` | `CourseEnrollment.status String` |
| `CourseMaterialType` | `document`, `video`, `link`, `pdf`, `audio` | `CourseMaterial.type String` |
| `RoomType` | `classroom`, `lab`, `hall`, `gym`, `other` | `Room.type String` |
| `CoinTransactionType` | `earn`, `deduct` | `CoinTransaction.type String` |
| `CoinTransactionReason` | `grade_excellent`, `attendance_weekly`, `discipline_praise`, `manual_award`, `shop_purchase`, `discipline_warning`, `manual_deduct` | `CoinTransaction.reason String` |
| `FeeFrequency` | `monthly`, `yearly`, `quarterly`, `weekly`, `one_time` | `FeeStructure.frequency String` |

### Updated Enums
| Enum | Change |
|------|--------|
| `PaymentStatus` | Added `cancelled` (was missing despite code using it) |

### Enum Casing Convention
**Mixed casing exists:**
- `SCREAMING_SNAKE_CASE`: `ClubRequestStatus`, `ShiftStatus`, `LeadStatus`
- `lowercase_snake_case`: `PaymentStatus`, `AttendanceStatus`, `LeaveStatus`

**Documented convention:** Use `lowercase_snake_case` for new enums. Normalize existing enums in Phase 24 if needed.

---

## 13. Queue / Job Architecture

No changes in Phase 23. Phase 22 added `schoolId` to all job interfaces.

---

## 14. Observability Safeguards

- All new indexes are non-blocking `CREATE INDEX` operations
- Schema changes validated via `prisma format` + `prisma generate` before migration
- Code changes (`as any` casts) are documented with TODO comments for future type safety
- DTOs should be updated to use `@IsIn([...])` with enum values instead of `@IsString()`

---

## 15. Build Results

- Backend `tsc --noEmit`: ✅ Pass
- Frontend `tsc --noEmit`: ✅ Pass
- Prisma `migrate dev`: ✅ Applied successfully
- Prisma `generate`: ✅ Client generated

---

## 16. Phase 24 Candidates

| Priority | Item |
|----------|------|
| 🔴 Critical | `User.email` → separate `AuthIdentity` model for true multi-school auth |
| 🔴 Critical | `StaffSalary.userId` → change 1:1 to 1:many for multi-school salaries |
| 🟡 High | Add `deletedAt` to `User`, `Payment`, `Grade` for compliance |
| 🟡 High | Standardize all enums to `lowercase_snake_case` |
| 🟡 High | Update all DTOs to use `@IsIn()` with enum values |
| 🟡 Medium | Add `updatedById` to critical models |
| 🟡 Medium | Add `onDelete: SetNull` to missing nullable FKs |
| 🟢 Low | Add `organizationId` layer above `School` |
| 🟢 Low | Partition `Attendance` by `date` range |
