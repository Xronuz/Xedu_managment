# Phase 8B.2A — Announcements Frontend/Backend Parity Fix

**Date:** 2026-05-21  
**Scope:** Wire orphaned announcements frontend to announcements backend  
**Baseline:** v0.1.1-pilot  

---

## 1. Problem Statement

The backend `announcements` module had full CRUD + read/acknowledge endpoints but was completely orphaned:
- The frontend `/dashboard/announcements` page existed
- But it imported and used `notificationsApi` for everything
- No `announcementsApi` frontend client existed
- The `Announcement` and `AnnouncementReceipt` database tables were unused

---

## 2. Backend Audit (Read-Only)

| Endpoint | Method | RBAC | Purpose |
|----------|--------|------|---------|
| `POST /announcements` | Create | SUPER_ADMIN, DIRECTOR, VICE_PRINCIPAL | Create announcement with audience resolution |
| `GET /announcements` | List all | SUPER_ADMIN, DIRECTOR, VICE_PRINCIPAL, BRANCH_ADMIN | Admin view with receipt counts |
| `GET /announcements/my` | List mine | AnyAuthenticated | Recipient view with read/ack status |
| `GET /announcements/:id` | Get one | DIRECTOR, VP, BRANCH_ADMIN, TEACHER, CLASS_TEACHER, ACCOUNTANT, LIBRARIAN, STUDENT, PARENT | Single announcement + user receipt |
| `POST /announcements/:id/read` | Mark read | AnyAuthenticated | Upsert receipt with read timestamp |
| `POST /announcements/:id/acknowledge` | Acknowledge | AnyAuthenticated | Required only if `requireAck=true` |
| `PATCH /announcements/:id` | Update | SUPER_ADMIN, DIRECTOR, VICE_PRINCIPAL | Only if status is `draft` |
| `DELETE /announcements/:id` | Cancel | SUPER_ADMIN, DIRECTOR, VICE_PRINCIPAL | Soft-delete (status → `cancelled`) |

**Key backend features:**
- Audience auto-resolution by roles, class, branches
- Read receipts (`AnnouncementReceipt`)
- Acknowledgment support (`requireAck` flag)
- Priority levels (`low`, `normal`, `urgent`)
- Status lifecycle (`draft` → `scheduled` → `active` → `expired`/`cancelled`)
- School-scoped (no cross-school leakage)
- Branch-scoped targeting supported

**Backend modifications:** None. Zero files changed.

---

## 3. Frontend API Client

**New file:** `apps/frontend/src/lib/api/announcements.ts`

| Method | Endpoint | Matches Backend? |
|--------|----------|-----------------|
| `findAll(params?)` | `GET /announcements` | ✅ |
| `findMy(params?)` | `GET /announcements/my` | ✅ |
| `getOne(id)` | `GET /announcements/:id` | ✅ |
| `create(payload)` | `POST /announcements` | ✅ |
| `update(id, payload)` | `PATCH /announcements/:id` | ✅ |
| `cancel(id)` | `DELETE /announcements/:id` | ✅ |
| `markAsRead(id)` | `POST /announcements/:id/read` | ✅ |
| `acknowledge(id)` | `POST /announcements/:id/acknowledge` | ✅ |

**No `/v1` prefix** — follows the same pattern as all other working API modules.

---

## 4. Frontend Page Wiring

**Rewritten:** `apps/frontend/src/app/(dashboard)/dashboard/announcements/page.tsx`

### Before
- Used `notificationsApi.broadcast()` to send notifications
- Used `notificationsApi.getMyNotifications()` for history
- History was session-local state only (not persisted)
- Simple compose form with abstract target groups
- No read/acknowledge support
- No status tracking

### After
- Uses `announcementsApi.create()` — creates real `Announcement` records with audience
- Uses `announcementsApi.findMy()` — shows persisted announcements for current user
- Uses `announcementsApi.findAll()` — admin view of all school announcements
- Supports `markAsRead` and `acknowledge` actions
- Shows priority badges, status badges, receipt counts
- Supports cancel for active announcements
- Target groups mapped to actual `UserRole` values

### Tab-Based Layout

| Tab | Visible To | Content |
|-----|-----------|---------|
| **Mening e'lonlarim** | Everyone | Recipient view — my announcements with read/ack actions |
| **Barcha e'lonlar** | Admin roles (director, VP, branch_admin, super_admin) | Admin view — all announcements with status, read counts, cancel action |
| **Yangi e'lon** | Creator roles (director, VP, super_admin) | Compose form with title, body, priority, target group, require-ack checkbox |

### Target Group Mapping

| UI Label | Backend `targetRoles` |
|----------|----------------------|
| Barcha xodimlar | teacher, class_teacher, accountant, librarian, branch_admin, vice_principal, director |
| Barcha o'qituvchilar | teacher, class_teacher |
| Sinf rahbarlari | class_teacher |
| Barcha ota-onalar | parent |
| Barcha o'quvchilar | student |
| O'rinbosarlar | vice_principal |
| Moliya bo'limi | accountant |
| Kutubxonachilar | librarian |

---

## 5. RBAC Verification

| Action | Frontend Check | Backend Guard | Leakage Risk |
|--------|---------------|---------------|-------------|
| View "my" announcements | Tab visible to all | `AnyAuthenticated` + school scope | ✅ None |
| View "all" announcements | `isAdmin` helper | SUPER_ADMIN/DIRECTOR/VP/BRANCH_ADMIN | ✅ None |
| Create announcement | `isCreator` helper | SUPER_ADMIN/DIRECTOR/VP | ✅ None |
| Mark as read | Button visible if unread | `AnyAuthenticated` + receipt ownership | ✅ None |
| Acknowledge | Button visible if required | `AnyAuthenticated` + `requireAck` check | ✅ None |
| Cancel | Button visible for active/draft | SUPER_ADMIN/DIRECTOR/VP + school scope | ✅ None |

**School scoping:** Backend `findAll`, `findMy`, `findOne`, `update`, `cancel` all filter by `schoolId` from JWT.
**Branch scoping:** Backend `resolveAudience` respects `branchIds` and `branchAssignments`.

---

## 6. Tests

### New Test File: `apps/frontend/src/lib/api/announcements.test.ts`

- 9 tests covering all 8 API methods
- Each test verifies correct path (no `/v1/announcements` double prefix)
- Regression guard iterates all methods and asserts no path contains `/v1/announcements`

### Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| `announcements.test.ts` | 9 | ✅ Passed |
| `invitations.test.ts` | 8 | ✅ Passed |
| `export-center.test.ts` | 3 | ✅ Passed |
| `utils.test.ts` | 44 | ✅ Passed |
| **Total** | **64** | **✅ All passed** |

---

## 7. Build & Type-Check Results

| Check | Result |
|-------|--------|
| Frontend tests (`vitest run`) | ✅ **64 passed** |
| Frontend build (`next build`) | ✅ Clean |
| Frontend type-check (`tsc --noEmit`) | ✅ Clean |
| Backend type-check (`tsc --noEmit`) | ✅ Clean |
| Backend tests (`jest`) | ✅ No changes — pre-existing 468 passed / 10 failed |

---

## 8. Files Changed

```
 apps/frontend/src/lib/api/announcements.ts              | 154 +++++++
 apps/frontend/src/app/(dashboard)/dashboard/announcements/page.tsx | 403 +++++++++++++++----
 apps/frontend/src/lib/api/announcements.test.ts         |  89 +++++
```

**New files:** 2 (`announcements.ts`, `announcements.test.ts`)  
**Modified files:** 1 (`announcements/page.tsx`)  
**Deleted files:** 0  
**Backend files touched:** 0

---

## 9. Remaining Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Branch-scoped announcements not fully tested | Medium | Backend supports `targetBranchIds` but frontend only sends `targetRoles`. Branch-specific targeting can be added later without breaking existing flow. |
| Class-specific announcements not supported in UI | Medium | Backend supports `targetClassId` but frontend compose form doesn't expose class picker. Can be added as enhancement. |
| Scheduled announcements don't auto-publish | Low | Backend has `scheduledAt` field but no cron job verified. The `cleanupExpired` method exists but auto-publish of scheduled announcements may need a cron. |
| Students/Parents can't access page due to route permissions | Low | Current `permissions.ts` only allows director/VP/teacher/class_teacher/branch_admin. If students/parents need announcements, route permissions must be expanded. |
| No real-time updates | Low | Announcements page doesn't use WebSocket. Users must refresh to see new announcements. Acceptable for pilot. |

---

*Fix complete. The announcements backend is no longer orphaned — it now has a fully functional frontend surface with proper RBAC, read receipts, and acknowledgment support.*
