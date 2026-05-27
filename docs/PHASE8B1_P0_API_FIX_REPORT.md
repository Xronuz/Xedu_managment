# Phase 8B.1 — P0 API Route Fixes

**Date:** 2026-05-21  
**Scope:** Fix guaranteed broken production flows (P0 from Phase 8A audit)  
**Baseline:** v0.1.1-pilot  

---

## 1. Issues Fixed

### P0.1 — Invitations API Double `/v1` Prefix

| | Before | After |
|--|--------|-------|
| **File** | `apps/frontend/src/lib/api/invitations.ts` | same |
| **Root cause** | All 7 methods called `/v1/invitations/*`. `apiClient` baseURL already ends in `/api/v1`, producing `/api/v1/v1/invitations/*` (404). | Paths changed to `/invitations/*`. |
| **Backend expects** | `/api/v1/invitations/*` | unchanged |
| **Actual URL now** | `https://xedu.uz/api/v1/v1/invitations/...` ❌ | `https://xedu.uz/api/v1/invitations/...` ✅ |

**Methods fixed:**
- `create` — `POST /invitations`
- `getAll` — `GET /invitations`
- `getOne` — `GET /invitations/:id`
- `resend` — `POST /invitations/:id/resend`
- `revoke` — `DELETE /invitations/:id`
- `validateToken` — `GET /invitations/validate`
- `accept` — `POST /invitations/accept`

**Call sites checked:**
- `apps/frontend/src/app/(auth)/accept-invite/page.tsx:80` — `validateToken`
- `apps/frontend/src/app/(auth)/accept-invite/page.tsx:101` — `accept`
- `apps/frontend/src/components/invitation/invite-user-dialog.tsx:43` — `create`

**Impact:** Invitation acceptance flow was completely broken. New users could not accept invites. Now fixed.

---

### P0.2 — Export Download URL Double `/v1`

| | Before | After |
|--|--------|-------|
| **File** | `apps/frontend/src/lib/api/export-center.ts` | same |
| **Root cause** | `downloadExport()` built `${NEXT_PUBLIC_API_URL}/v1/exports/${id}/download`. Since `NEXT_PUBLIC_API_URL` already includes `/api/v1`, the URL became `/api/v1/v1/exports/:id/download` (404). | Path segment changed to `/exports/${id}/download`. |
| **Backend expects** | `/api/v1/exports/:id/download` | unchanged |
| **Actual URL now** | `https://xedu.uz/api/v1/v1/exports/.../download` ❌ | `https://xedu.uz/api/v1/exports/.../download` ✅ |

**Call sites checked:**
- `apps/frontend/src/app/(dashboard)/dashboard/export-center/_components/export-job-detail.tsx:82` — `window.open(url, '_blank')`
- `apps/frontend/src/app/(dashboard)/dashboard/export-center/_components/export-history-table.tsx:155` — `window.open(url, '_blank')`

**Impact:** Users could create exports but could not download completed files. Now fixed.

---

## 2. Regression Tests Added

### `apps/frontend/src/lib/api/invitations.test.ts` (new)

- 8 tests covering all 7 invitation API methods
- Each test verifies the correct path is passed to `apiClient` (no `/v1/invitations` prefix)
- Final regression guard iterates all methods and asserts no path contains `/v1/invitations`

### `apps/frontend/src/lib/api/export-center.test.ts` (new)

- 3 tests covering `downloadExport()` URL construction
- Tests production (`https://xedu.uz/api/v1`) and localhost (`http://localhost:3001/api/v1`) conventions
- Regression guard tests multiple base URLs and asserts no `/v1/v1/` segment appears

---

## 3. Verification Results

| Check | Result |
|-------|--------|
| Frontend tests | ✅ **55 passed** (was 44 + 11 new = 55) |
| Frontend build (`next build`) | ✅ Clean — all pages built successfully |
| Frontend type-check (`tsc --noEmit`) | ✅ Clean — zero errors |
| Backend changes | ✅ None — zero backend files modified |
| Broken imports | ✅ None |
| Route permission changes | ✅ None |

---

## 4. Files Changed

```
 apps/frontend/src/lib/api/invitations.ts        | 14 +++++++-------
 apps/frontend/src/lib/api/export-center.ts      |  2 +-
 apps/frontend/src/lib/api/invitations.test.ts   | 84 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
 apps/frontend/src/lib/api/export-center.test.ts | 42 ++++++++++++++++++++++++++++++++++++++
```

---

## 5. Remaining Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `NEXT_PUBLIC_API_URL` does NOT include `/api/v1` in some deployment | Low | All other API modules and `client.ts` assume `/api/v1` is in the env var. This is the project convention documented in `.env.example` and `Dockerfile`. |
| Other API modules have similar double `/v1` bugs | Medium | The audit found only these two. `import.ts` and `audit-log.ts` already handle URL construction correctly by stripping `/api/v1` first. A broader grep for `/v1/` in `lib/api/*.ts` returned no other suspicious patterns. |
| Download URL missing auth header | Existing behavior | `downloadExport` returns a raw URL opened via `window.open()`. The backend `download` endpoint requires JWT auth via cookie (same-site). This was already the case before the fix and is unchanged. |

---

*Fix complete. Both P0 production bugs resolved with regression tests.*
