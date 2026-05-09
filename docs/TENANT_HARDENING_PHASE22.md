# Phase 22 — Multi-Tenant Institutional Architecture Hardening

**Status:** Complete  
**Commit:** `TBD`  
**Scope:** Platform architecture hardening (no UI changes)

---

## 1. Multi-Tenant Audit Summary

### Hierarchy
```
School (top-level tenant)
  └── Branch (sub-tenant)
        └── Class / Subject / Schedule / User / etc.
```

**No Organization layer exists.** Multi-tenancy is scoped at the `School` level.

### Models with Tenant Fields
| Scope | Models |
|-------|--------|
| `schoolId` + `branchId` | User, Class, Subject, Schedule, Attendance, Grade, Exam, Payment, FeeStructure, Notification, LeaveRequest, DisciplineIncident, TransportRoute, TransportStudent, Course, CourseEnrollment, Club, Treasury, FinancialShift, Room, Lead, KpiMetric, Branch, BranchModule, UserBranchAssignment, Invitation |
| `schoolId` only | SchoolModule, Subscription, MenuDay, LibraryBook, LibraryLoan, Message, Conversation, SystemConfig, AcademicEvent, ParentMeeting, CourseMaterial, CoinShopItem, CoinTransaction, LeadComment, MonthlyPayroll, SalaryAdvance, PayrollItem |
| No direct tenant | RefreshToken, ParentStudent, ClassStudent, HomeworkSubmission, ConversationParticipant, GroupMessage, ExamQuestion, ExamOption, StudentAnswer, LeaveApproval, ClubMember, ClubJoinRequest, KpiRecord |

### Critical Schema Findings (Documented for Phase 23)
1. **`User.email @unique`** — globally unique, not per-school. Breaks true multi-tenancy for user identity.
2. **`StaffSalary.userId @unique`** — a user can only have one salary record system-wide.
3. **`Treasury.branchId`** is required (`String`), but centralized mode comments describe `branchId: null`.

---

## 2. Query Scoping Fixes Applied

### CRITICAL — Payments Webhooks
**File:** `payments.service.ts`  
**Issue:** Payme/Click webhooks queried payments by ID without any tenant or provider filter. `paymeGetStatement` returned ALL Payme payments globally.

**Fixes:**
- Added `provider: 'payme'` / `provider: 'click'` filter to all individual payment lookups.
- `paymeGetStatement` now returns empty array with a TODO comment explaining the need for per-school merchant configuration.

### CRITICAL — Users Service ID Enumeration
**File:** `users.service.ts`  
**Issue:** `findOne()` used `findUnique({ where: { id } })` then checked school — allowed attackers to probe UUIDs and distinguish between "not found" and "wrong school".

**Fixes:**
- `findOne()`: Changed to `findFirst({ where: { id, schoolId } })` for non-super-admin users.
- `getMe()`: Changed to `findFirst` for defense-in-depth.
- `changePassword()`: Added `schoolId` select to verify scope.
- `checkEmail()`: Scoped email lookup to `schoolId`.

### CRITICAL — Cross-Tenant Notification Injection
**File:** `notifications.service.ts`  
**Issue:** `send()` looked up recipient by ID without school validation, allowing School A to send notifications to School B users.

**Fix:** Recipient lookup now includes `schoolId: currentUser.schoolId!` and throws `ForbiddenException` if recipient not found in same school.

### HIGH — Online Exam Missing Role + Branch Scoping
**File:** `online-exam.controller.ts`, `online-exam.service.ts`  
**Issue:** Controller only used `JwtAuthGuard` — any authenticated user could view/manage exam questions. Service used manual `schoolId` without `buildTenantWhere`.

**Fixes:**
- Added `RolesGuard` and `@Roles()` decorators for teacher-only endpoints.
- Service methods now use `buildTenantWhere(currentUser)` for school+branch scoping.
- `updateQuestion`/`deleteQuestion` now filter through `exam: { ...buildTenantWhere }` relation.

### HIGH — Coins Unscoped Helpers
**File:** `coins.service.ts`  
**Issue:** `earnCoins`/`deductCoins` updated users by ID only without school verification.

**Fix:** Both helpers now verify `user.findFirst({ where: { id: userId, schoolId } })` before updating.

### MEDIUM — Meetings Parent Validation
**File:** `meetings.service.ts`  
**Issue:** Parent lookup and conflict check lacked `schoolId` scope.

**Fix:** Added `schoolId` filter to parent lookup and conflict check.

### MEDIUM — Import Email Enumeration
**File:** `import.service.ts`  
**Issue:** `commitStudents` and `commitUsers` looked up emails globally.

**Fix:** Both now scope email lookup to `schoolId`.

### MEDIUM — Treasury Branch Isolation
**File:** `treasury.service.ts`  
**Issue:** `findOne`, `update`, `remove` only checked `schoolId`. `setFinanceType` accepted arbitrary `schoolId`.

**Fixes:**
- Added branch scoping for non-school-wide roles.
- `setFinanceType` now validates `schoolId` against `currentUser.schoolId`.

### MEDIUM — Financial Shifts Branch Isolation
**File:** `financial-shifts.service.ts`  
**Issue:** `openShift`/`closeShift` didn't verify treasury/shift belonged to user's branch.

**Fix:** Added branch scoping to treasury and shift lookups.

---

## 3. Realtime Tenant Safety

Already safe:
- `EventsGateway` emits to `school:{id}`, `branch:{id}`, `user:{id}` rooms.
- `useRealtimeNotifications` only invalidates caches — no forced refetch.
- No cross-tenant event leaks identified in gateway.

No changes required.

---

## 4. Cache + Query Key Hardening (Frontend)

### Logout Cache Safety
**File:** `store/auth.store.ts`, `components/providers/query-provider.tsx`  
**Issue:** Logout relied on full page reload for cache clearing. If ever refactored to client-side nav, stale cache would leak.

**Fix:**
- Auth store dispatches `CustomEvent('xedu:logout')` on logout.
- QueryProvider listens and calls `queryClient.clear()`.

### Optimistic Update Key Mismatch
**File:** `attendance-workspace.tsx`  
**Issue:** Optimistic update key missed `activeBranchId`.

**Fix:** Added `activeBranchId` to the optimistic update `reportKey`.

### Tenant Query Key Helper
**File:** `lib/tenant-query-key.ts`  
**New:** `useTenantQueryKey()` hook and `makeTenantQueryKey()` static helper for standardized cache-isolated keys.

---

## 5. RBAC + ABAC Inheritance

### Online Exam Role Enforcement
Added `@Roles()` decorators to:
- `getQuestions`, `addQuestion`, `updateQuestion`, `deleteQuestion`
- `importFromDocx`, `getExamSessions`

### super_admin Bypass
Documented behavior:
- `buildTenantWhere` returns `{}` for super_admin.
- `RolesGuard` allows super_admin through all checks.
- This is **by design** for platform administration.

---

## 6. Treasury + Finance Isolation

- Treasury CRUD now enforces branch scoping for branch-scoped users.
- `getEffectiveTreasury` for CENTRALIZED mode finds first active treasury by `schoolId` (no branch filter) — this matches the schema where `branchId` is required.
- Financial shifts verify treasury and shift belong to the user's branch.

**Known gap:** CENTRALIZED treasury with `branchId = null` is impossible due to schema requiring `branchId: String`. Phase 23 should address this schema/comment mismatch.

---

## 7. Storage + File Hardening

### Avatar Upload Fix
**File:** `users.controller.ts`, `upload.service.ts`  
**Issue:** Avatar endpoint used `file.originalname` directly without saving the file. Files were lost on every request.

**Fixes:**
- `UploadService.uploadFile()` now accepts optional `tenantPrefix` for scoped paths.
- Avatar endpoint now calls `uploadService.uploadFile(file, 'avatars', user.schoolId)`.
- Path format: `{schoolId}/avatars/{uuid}.ext`

---

## 8. Audit Log Hardening

**File:** `common/audit/audit.service.ts`  
**Issue:** No `branchId` field in `AuditLog` schema.

**Fix:**
- Added `branchId` to `AuditLogOptions` interface.
- `log()` embeds `branchId` into `newData._meta.branchId` for traceability until schema migration adds native column.

---

## 9. Queue / Job Scope

**File:** `common/queue/queue.constants.ts`  
**Issue:** Job payloads lacked tenant context.

**Fix:** Added optional `schoolId` field to:
- `EmailJobData`
- `SmsJobData`
- `AttendanceAlertData`
- `PaymentReminderData`
- `GradeNotificationData`

Callers can now include `schoolId` for observability and future per-tenant rate limiting.

---

## 10. Multi-School UX Safety

- Branch switch: `useSwitchBranch` already calls `queryClient.clear()` — safe.
- Logout: Now explicitly clears cache via `xedu:logout` event — safe.
- No UI for multi-school switching exists today. If added in future, must:
  1. Call `queryClient.clear()`
  2. Reconnect socket to new school room
  3. Invalidate all cached state

---

## 11. Reporting / Analytics Scoping

No changes needed. Analytics service already uses `buildTenantWhere` for all aggregations.

---

## 12. Remaining Phase 23 Candidates

| Priority | Item | Type |
|----------|------|------|
| 🔴 Critical | Fix `User.email` uniqueness to `@@unique([email, schoolId])` | Schema migration |
| 🔴 Critical | Fix `StaffSalary.userId` uniqueness to `@@unique([userId, schoolId])` | Schema migration |
| 🔴 Critical | Fix `Treasury.branchId` required vs optional mismatch | Schema migration |
| 🟡 High | Add `branchId` column to `AuditLog` | Schema migration |
| 🟡 High | Per-school Payme/Click merchant configuration | Architecture |
| 🟡 High | Add `schoolId`/`branchId` to ALL frontend query keys | Frontend refactor |
| 🟡 High | Standardize all services to use `buildTenantWhere` | Refactor |
| 🟡 Medium | Add tenant prefix to ALL upload paths | Code |
| 🟡 Medium | Add `branchId` to queue job payloads | Code |
| 🟢 Low | Add `onDelete` policies to missing foreign keys | Schema |
| 🟢 Low | Organization layer above School | Architecture |

---

## 13. Build Results

- Backend `tsc --noEmit`: ✅ Pass
- Frontend `tsc --noEmit`: ✅ Pass
- Frontend `next build`: ✅ Pass

---

## 14. Rules for Future Developers

1. **Never use `findUnique({ where: { id } })`** on tenant-scoped entities. Use `findFirst({ where: { id, ...buildTenantWhere(user) } })`.
2. **Always use `buildTenantWhere`** for list queries. Do not hardcode `schoolId` alone.
3. **Webhook handlers must scope lookups** by provider + tenant where possible.
4. **Notifications must validate recipient school** before creation.
5. **Upload paths must include tenant prefix**: `{schoolId}/{folder}/{uuid}`.
6. **Frontend query keys should include tenant hash**: use `useTenantQueryKey()`.
7. **Logout must clear cache**: dispatch `xedu:logout` event or call `queryClient.clear()`.
