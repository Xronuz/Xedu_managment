# Phase 8C — Orphan Domain Recovery & Dead Code Resolution Report

**Date:** 2026-05-21  
**Baseline:** v0.1.1-pilot + Batches 1–3  
**Goal:** Resolve remaining orphan / dead / partially implemented domains discovered in Phase 8A.

---

## 1. Domain Decision Matrix

| # | Domain | Classification | Rationale |
|---|--------|---------------|-----------|
| 1 | **Invitation flow** | `partial_but_salvageable` | Core create→email→accept works. Missing management UI. Frontend missing `branchId`. |
| 2 | **Lead / CRM** | `partial_but_salvageable` | Kanban + create + convert works. Missing edit UI. `expectedClass` relation broken. |
| 3 | **DisciplineIncident** | `partial_but_salvageable` | Full CRUD minus edit. `praise` hidden in frontend. `teacher` RBAC mismatch. |
| 4 | **Clubs** | `partial_but_salvageable` | Backend + frontend fully wired. `isAdmin` bug excluded director/branch_admin. No sidebar nav. |
| 5 | **AI frontend API** | `dead_code` | `aiApi` never imported anywhere. All providers are stubs. Config bug disables module for all schools. |
| 6 | **Staff shop** | `partial_but_salvageable` | End-to-end works for Director/VP. `branch_admin` got 403 on all admin endpoints. |

---

## 2. Changes by Domain

### 2.1 Invitation Flow

| Issue | Fix | File(s) |
|-------|-----|---------|
| No `branchId` sent from invite dialog | Auto-inject `user.branchId` into create payload | `invite-user-dialog.tsx` |
| Frontend `Invitation` type mismatch | Changed `invitedById`/`invitedByName` → `createdBy: { id, firstName, lastName }` | `invitations.ts` |
| Dead imports in service | Commented out unused `canManageUser`, `assertCanManage` | `invitations.service.ts` |
| Unused `ResendInvitationDto` import | Added explanatory comment | `invitations.controller.ts` |

**Status:** Core flow is now tenant-isolation correct for branch admins. Management UI (list/resend/revoke) remains a future enhancement.

### 2.2 Lead / CRM

| Issue | Fix | File(s) |
|-------|-----|---------|
| `expectedClass` relation missing in Prisma | Added `expectedClass Class?` relation on `Lead` + `leads Lead[]` on `Class` | `schema.prisma` |
| Backend doesn't return `expectedClass` | Added `expectedClass` to `defaultInclude()` | `leads.service.ts` |
| `accountant` blocked from CRM page | Added `accountant` to `ROUTE_PERMISSIONS['/dashboard/crm']` | `permissions.ts` |

**Status:** `expectedClass` now works end-to-end. Edit lead UI remains a future enhancement.

### 2.3 Discipline Incident

| Issue | Fix | File(s) |
|-------|-----|---------|
| `praise` action missing from frontend type | Added `'praise'` to `DisciplineAction` | `discipline.ts` |
| `praise` missing from action labels | Added `praise: 'Rag‘batlantirish'` to `ACTION_LABELS` | `discipline-workspace.tsx` |
| `teacher` blocked from discipline page | Added `teacher` to `ROUTE_PERMISSIONS['/dashboard/discipline']` | `permissions.ts` |
| No `resolvedBy` tracking | Added `resolvedById` + `resolvedBy` relation to schema; set on resolve | `schema.prisma`, `discipline.service.ts` |

**Status:** Teachers can now access discipline. Praise incidents can be created and viewed. Resolver is tracked.

### 2.4 Clubs

| Issue | Fix | File(s) |
|-------|-----|---------|
| `isAdmin` excluded director & branch_admin | Expanded to `['director', 'vice_principal', 'branch_admin']` | `clubs/page.tsx` |
| Missing from sidebar navigation | Added "To'garaklar" to Director, VP, Branch Admin, Teacher, Student navs | `navigation.ts` |

**Status:** All admin roles can now create/edit clubs. Students and teachers can discover the page from sidebar.

### 2.5 AI Frontend API — Dead Code Removal

| Action | File |
|--------|------|
| Deleted unused frontend API module | `apps/frontend/src/lib/api/ai.ts` |

**Verification:** Zero imports of `aiApi` or `@/lib/api/ai` anywhere in frontend. Not in barrel file.

**Note:** Backend `ai` module (controller, services, providers, Prisma models) is preserved. It has solid architecture but is non-functional due to a config scope bug. Documented as deferred.

### 2.6 Staff Shop

| Issue | Fix | File(s) |
|-------|-----|---------|
| `branch_admin` got 403 on all admin endpoints | Added `UserRole.BRANCH_ADMIN` to `ADMIN_ROLES` | `coins.controller.ts` |

**Status:** Branch admins can now manage shop items, view balances, and view orders.

---

## 3. Schema Changes

| Change | Models | Migration needed? |
|--------|--------|-------------------|
| `DisciplineIncident.resolvedById` + `resolvedBy` relation | `DisciplineIncident`, `User` | Yes |
| `Lead.expectedClass` relation | `Lead`, `Class` | Yes |

Both changes are backward-compatible (nullable fields). Run:
```bash
cd apps/backend && npx prisma migrate dev --name add_discipline_resolved_by_and_lead_expected_class
```

---

## 4. Files Changed

### Backend (5 files)
1. `src/modules/coins/coins.controller.ts` — Added `BRANCH_ADMIN` to `ADMIN_ROLES`
2. `src/modules/discipline/discipline.service.ts` — Set `resolvedById` on resolve
3. `src/modules/invitations/invitations.service.ts` — Removed dead imports
4. `src/modules/invitations/invitations.controller.ts` — Documented unused DTO
5. `src/modules/leads/leads.service.ts` — Added `expectedClass` to `defaultInclude()`
6. `prisma/schema.prisma` — Added `resolvedById`/`resolvedBy` to `DisciplineIncident`, `expectedClass` relation to `Lead`, opposite relations on `User` and `Class`

### Frontend (7 files)
1. `src/app/(dashboard)/dashboard/clubs/page.tsx` — Fixed `isAdmin`
2. `src/app/(dashboard)/dashboard/discipline/_components/discipline-workspace.tsx` — Added `praise` to `ACTION_LABELS`
3. `src/components/invitation/invite-user-dialog.tsx` — Auto-inject `branchId`
4. `src/config/navigation.ts` — Added clubs to 5 role navs
5. `src/config/permissions.ts` — Added `teacher` to discipline, `accountant` to CRM
6. `src/lib/api/ai.ts` — **Deleted** (dead code)
7. `src/lib/api/discipline.ts` — Added `'praise'` to `DisciplineAction`
8. `src/lib/api/invitations.ts` — Fixed `Invitation` type (`createdBy`)

---

## 5. Verification

| Check | Result |
|-------|--------|
| Prisma schema validation | ✅ Valid |
| Frontend `pnpm build` | ✅ Pass |
| Frontend `pnpm test` | ✅ 64/64 pass |
| Backend tests (full suite) | ✅ 474 pass, 10 fail (pre-existing: auth 7, attendance 2, notifications 1) |
| No new test failures introduced | ✅ Confirmed |

---

## 6. Remaining Deferred Items

| Domain | Item | Why Deferred |
|--------|------|-------------|
| Invitations | List/resend/revoke management UI | Requires new page/component; core flow is now correct |
| CRM | Edit lead dialog | Requires significant UI work; read+create+convert already works |
| CRM | Delete/assign/comment-delete UI | Backend endpoints exist but no UI callers |
| Discipline | Edit incident endpoint + UI | Not in original design; create+resolve+delete covers 95% of use |
| AI | Full generative AI module | Solid backend architecture but needs provider integration + config fix |
| Clubs | Unit tests | No existing test infrastructure for this module |

---

## 7. Commit Message Suggestion

```
refactor: recover orphan domains and remove dead product surface

- Staff shop: fix branch_admin RBAC (was 403 on all admin endpoints)
- Clubs: fix isAdmin to include director/branch_admin; add to sidebar nav
- Discipline: add praise action to frontend; fix teacher route permission;
  track resolvedById in schema and service
- CRM: fix expectedClass Prisma relation; add accountant to route permissions
- Invitations: auto-inject branchId in invite dialog; fix createdBy type
- AI frontend API: remove dead ai.ts module (zero consumers, all stubs)
- Schema: DisciplineIncident.resolvedById, Lead.expectedClass relation
```
