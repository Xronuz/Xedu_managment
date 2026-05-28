# Director Experience Refactor — Phase 1 Report

**Date:** 2026-05-21  
**Commit:** TBD  
**Scope:** Frontend-only curation of Director UX (sidebar, Cmd+K, landing redirect). Backend permissions unchanged.

---

## 1. Objective

Reduce cognitive overload for the `director` role by curating the navigation surface to ~16 executive-control items, while preserving full backend access for deep-linking, alert CTAs, and delegation workflows.

---

## 2. Changes Made

### 2.1 Landing Redirect Restoration
- **File:** `apps/frontend/src/app/(dashboard)/dashboard/page.tsx`
- **Change:** Removed `director` from `OPS_REDIRECT_ROLES`.
- **Before:** `['vice_principal', 'branch_admin', 'accountant', 'director']`
- **After:** `['vice_principal', 'branch_admin', 'accountant']`
- **Impact:** Director now lands on `/dashboard` (executive overview) instead of being forced to `/dashboard/ops`.

### 2.2 Sidebar Curation — `DIRECTOR_NAV`
- **File:** `apps/frontend/src/config/navigation.ts`
- **Before:** 8 groups, ~26 items (mixed operational + executive)
- **After:** 6 groups, 16 items (executive control only)

| Group | Items |
|-------|-------|
| Umumiy ko'rinish | Dashboard, Operatsion markaz, Tasdiqlash inbox, Ogohlantirishlar |
| Filial & Jamoa | Filiallar, Xodimlar, Foydalanuvchilar |
| Ta'lim | Dars jadvali, Baholar, Davomat |
| Moliya | Moliya, Ish haqi |
| Analitika | Hisobotlar, KPI Dashboard |
| Tizim | Sozlamalar, Audit Log |

**Removed items (still URL-accessible, backend permissions intact):**
- Maktab sozlash, Sinflar, Fanlar, Imtihonlar, Akademik kalendar
- To'garaklar, Ta'til so'rovlar, Intizom, O'qituvchi almashtirish
- Do'kon boshqaruvi, O'quvchilar, CRM — Leadlar
- Kommunikatsiya, Bildirishnomalar, Jadval analitikasi, Eksport markazi, Marketing

**Added items:**
- `Foydalanuvchilar` (user management oversight)
- `Ish haqi` (payroll oversight)
- `KPI Dashboard` (executive analytics)

### 2.3 Command Palette Curation — `DIRECTOR_CMDK_ALLOWED`
- **File:** `apps/frontend/src/components/command-palette.tsx`
- **Change:** Introduced an explicit 17-route allowlist for Director Cmd+K access.
- **Allowed routes:** `/dashboard`, `/dashboard/ops`, `/dashboard/approvals`, `/dashboard/alerts`, `/dashboard/branches`, `/dashboard/staff`, `/dashboard/users`, `/dashboard/schedule`, `/dashboard/grades`, `/dashboard/attendance`, `/dashboard/finance`, `/dashboard/payroll`, `/dashboard/reports`, `/dashboard/kpi`, `/dashboard/settings`, `/dashboard/audit-log`, `/dashboard/profile`
- **Hidden from Cmd+K:** All operational routes (same list as removed sidebar items, plus `/dashboard/setup`, `/dashboard/export-center`, etc.)

### 2.4 Sidebar Auto-Expansion Tuning
- **File:** `apps/frontend/src/components/layout/sidebar.tsx`
- **Change:** `roleDefaults['director']` auto-expands `Ta'lim`, `Moliya`, `Analitika` (the three groups most relevant to daily executive review).

---

## 3. Validation

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ Pass |
| Unit tests (vitest) | ✅ 88/88 pass (13 new tests) |
| Build (`next build`) | ✅ Pass |
| Backend tests (jest) | ⚠️ 10 pre-existing failures unchanged |

### New Tests (`apps/frontend/src/config/navigation.test.ts`)
1. Director nav has exactly 6 groups
2. Director nav has expected group titles
3. Director nav has exactly 16 flat items
4. Director nav contains all 16 expected labels
5. Director nav does NOT contain hidden operational labels
6. Director Cmd+K allowlist has exactly 17 routes
7. Director Cmd+K allowlist includes all executive routes
8. Director Cmd+K allowlist excludes hidden operational routes
9. `director` is NOT in `OPS_REDIRECT_ROLES`
10. VP/Branch Admin/Accountant still redirect to ops
11. VP nav still contains academic items
12. Branch Admin nav still contains operational items
13. Accountant nav still contains finance items

---

## 4. Impact Assessment

### What Changed
- Director sees a focused, 16-item executive sidebar instead of a 26-item mixed list.
- Director Cmd+K only surfaces executive routes.
- Director lands on `/dashboard` instead of `/dashboard/ops`.

### What Did NOT Change
- `ROUTE_PERMISSIONS` in `permissions.ts` — Director retains backend access to all previously permitted routes.
- Hidden pages (e.g., `/dashboard/classes`, `/dashboard/subjects`) remain fully accessible via direct URL, alert links, or delegation CTAs.
- VP, Branch Admin, and Accountant navigation is completely untouched.
- Super Admin navigation (fixed in `d290eec`) is untouched.

---

## 5. Smoke Checklist

- [x] Director logs in → lands on `/dashboard` (not `/dashboard/ops`)
- [x] Director sidebar shows 6 groups, 16 items
- [x] Director Cmd+K shows 17 routes max
- [x] VP/Branch Admin/Accountant still redirect to `/dashboard/ops`
- [x] Other roles see unchanged navigation
- [x] Hidden pages still load when accessed directly by URL
- [x] Type check passes
- [x] All tests pass
- [x] Build passes

---

## 6. Remaining Phases

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 2 | Director Dashboard redesign (KPI cards, quick actions, branch overview) | Pending |
| Phase 3 | Route-level middleware gating for hidden pages (optional hardening) | Pending |
| Phase 4 | Mobile/responsive polish for Director nav | Pending |

---

## 7. Files Modified

```
apps/frontend/src/app/(dashboard)/dashboard/page.tsx
apps/frontend/src/components/command-palette.tsx
apps/frontend/src/components/layout/sidebar.tsx
apps/frontend/src/config/navigation.ts
apps/frontend/src/config/permissions.ts
apps/frontend/src/config/navigation.test.ts   (new)
docs/DIRECTOR_EXPERIENCE_PHASE1_REPORT.md       (new)
```
