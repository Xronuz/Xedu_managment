# Director Experience Refactor — Phase 2: Dashboard Restoration Report

**Date:** 2026-05-21  
**Commit:** TBD  
**Scope:** Restore `/dashboard` as a stable, useful Director landing page. No backend changes. No sidebar changes (Phase 1 preserved).

---

## 1. Objective

After Phase 1 removed the forced `/dashboard/ops` redirect, the Director landing page needed to become a stable, useful executive overview. Phase 2 focuses on:
- Fixing stale/broken dashboard sections
- Removing fake AI data displays
- Adding clear Ops Center CTA
- Adding curated Quick Actions
- Ensuring safe empty/loading states

---

## 2. Audit Findings (Before)

### 2.1 Stale / Problematic Items

| Item | Issue | Decision |
|------|-------|----------|
| `AiRiskCard` | Links to `/dashboard/insights`; displays AI-generated risk counts that may be synthetic | **Removed** from sidebar |
| `EduCoinCard` | Links to `/dashboard/coins`; not in curated nav | **Removed** from sidebar |
| `IntelligenceFeed` | Complex sidebar panel with AI-derived risk signals and links to uncurated routes | **Removed** from sidebar |
| `SmartInsights` | Shows "AI insights" with risk distribution data | **Removed** from sidebar |
| `ActivityStream` | Overly complex activity feed with AI risk references | **Removed** from sidebar |
| `AI xususiyatlar` section | Placeholder cards for Teacher Pro and AI Insights | **Removed** from sidebar |
| Inline leave approval | Director could approve/reject leave requests inline on dashboard | **Removed** — should be done in `/dashboard/approvals` |
| Inline discipline list | Full discipline case list rendered inline | **Removed** — simplified to count + link |
| `aiAnalyticsApi.getDashboard()` | Called but data treated as authoritative; no empty guard | **Guarded** — `riskSignals` set to 0 unless real data proven |

### 2.2 Route Links Analysis

All routes referenced by the old dashboard (`/dashboard/insights`, `/dashboard/discipline`, `/dashboard/exams`, `/dashboard/leave-requests`, `/dashboard/announcements`, `/dashboard/education`, `/dashboard/coins`) **still exist** in the application and Director retains backend permission to access them. They are simply hidden from the curated sidebar. The links were not "broken" in the 404 sense, but they directed users away from the executive focus.

**Phase 2 fix:** Quick Actions and main CTAs now point exclusively to **curated routes** from Phase 1.

---

## 3. Changes Made

### 3.1 `apps/frontend/src/app/(dashboard)/dashboard/_components/director-dashboard.tsx`

**Complete rewrite** — reduced from ~626 lines to ~340 lines.

**Kept (stable sections):**
- `WorkspaceShell` + `WorkspaceHeader` + `SituationBar`
- `BranchHealthMap` — branch overview with user counts
- `FinancialPulse` — finance summary with safe empty state
- `AcademicSnapshot` — attendance, classes, students, exams
- `StaffOperations` — teacher/staff counts + pending attention

**Added:**
- **Ops Center CTA button** in header (`Zap` icon → `/dashboard/ops`)
- **Approval Preview** section — shows pending leaves + discipline counts with links to `/dashboard/approvals` and `/dashboard/alerts`. No inline approve/reject buttons.
- **Quick Actions grid** — 8 buttons linking to curated routes:
  - Tasdiqlash inbox → `/dashboard/approvals`
  - Filiallar → `/dashboard/branches`
  - Xodimlar → `/dashboard/staff`
  - Foydalanuvchilar → `/dashboard/users`
  - Ish haqi → `/dashboard/payroll`
  - Hisobotlar → `/dashboard/reports`
  - Operatsion markaz → `/dashboard/ops`
  - Sozlamalar → `/dashboard/settings`
- **KPI Snapshot Card** in sidebar — links to `/dashboard/kpi`, shows count or "Ma'lumot yo'q"
- **Recent Operations Summary** in sidebar — 3-item list (approvals, discipline, exams)
- **Today widget** in sidebar — date + school-wide stats

**Removed:**
- `ExecutiveBriefing` (replaced by simpler Approval Preview)
- `IntelligenceFeed`, `SmartInsights`, `ActivityStream`
- `AiRiskCard`, `EduCoinCard`
- `AI xususiyatlar` section
- `AcademicCalendarWidget`
- `RightContextualPanel` (slide-over branch detail)
- Inline leave request approval buttons
- Inline discipline case list
- `RealtimePulse` events array
- `reviewMutation` (leave approval mutation)
- `aiAnalyticsApi` import and usage
- `coinsApi` import and usage

**Guarded against fake data:**
- `riskSignals` in `SituationBarData` explicitly set to `0` instead of deriving from `aiSummary`
- KPI card shows "— / Ma'lumot yo'q" when no metrics exist
- Finance pulse already had safe empty state (kept)

### 3.2 Tests Added

`apps/frontend/src/app/(dashboard)/dashboard/_components/director-dashboard.test.tsx`
- Renders without crashing with empty API data
- Shows Operatsion markaz CTA button
- Shows Approval Preview section
- Shows Quick Actions section with all 8 curated routes
- Does NOT show fake AI metric labels when data unavailable
- Shows KPI snapshot card linking to `/dashboard/kpi`

---

## 4. Validation

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ Pass |
| Unit tests (vitest) | ✅ 94/94 pass (6 new tests) |
| `next build` | ✅ Pass |
| Backend tests (jest) | ⚠️ 10 pre-existing failures unchanged |

---

## 5. Role and Routing Consistency

| Role | Behavior | Status |
|------|----------|--------|
| Director | Lands on `/dashboard`, sees restored executive dashboard | ✅ |
| VP | Still redirects to `/dashboard/ops` | ✅ (unchanged) |
| Branch Admin | Still redirects to `/dashboard/ops` | ✅ (unchanged) |
| Accountant | Still redirects to `/dashboard/ops` | ✅ (unchanged) |
| Super Admin | Still sees `SuperAdminDashboard` | ✅ (unchanged) |
| Teacher/Class Teacher | Still sees `TeacherDashboard` | ✅ (unchanged) |
| Student/Parent | Still redirects to respective portals | ✅ (unchanged) |
| Xedu logo → `/dashboard` | Works for Director | ✅ |
| Sidebar active state | Works for all curated routes | ✅ |

---

## 6. Smoke Checklist

- [x] Director logs in → lands on `/dashboard` (not `/dashboard/ops`)
- [x] Dashboard renders without crashes when all APIs return empty
- [x] Ops Center button visible and clickable
- [x] Quick Actions show 8 curated routes
- [x] Approval Preview shows counts + links (no inline actions)
- [x] Branch Health Map renders with empty state
- [x] Finance Pulse renders with empty state
- [x] Academic Snapshot renders with empty state
- [x] Staff Operations renders with empty state
- [x] KPI card shows placeholder when no data
- [x] No "AI Tahlil", "EduCoin", or "Analitik xavf" labels visible
- [x] Type check passes
- [x] All tests pass
- [x] Build passes

---

## 7. APIs Used

| API | Endpoint | Usage | Empty Guard |
|-----|----------|-------|-------------|
| `attendanceApi.getTodaySummary` | `/attendance/today-summary` | SituationBar, AcademicSnapshot | `presentPct ?? 0` |
| `classesApi.getAll` | `/classes` | AcademicSnapshot (class count) | `[]` fallback |
| `usersApi.getAll` | `/users?limit=1000` | StaffOperations, BranchHealthMap | `[]` fallback |
| `leaveRequestsApi.getAll({status:'pending'})` | `/leave-requests` | ApprovalPreview, StaffOperations | `[]` fallback |
| `disciplineApi.getAll` | `/discipline` | ApprovalPreview, StaffOperations | `.catch(() => ({data:[]}))` |
| `financeApi.getDashboard` | `/finance/dashboard` | FinancialPulse, SituationBar | `{}` fallback |
| `branchesApi.getAll` | `/branches` | BranchHealthMap, SituationBar | `.catch(() => [])` |
| `examsApi.getUpcoming(7)` | `/exams/upcoming` | AcademicSnapshot | `.catch(() => [])` |
| `kpiApi.getDashboard` | `/kpi/dashboard` | KPI Snapshot Card | `.catch(() => ({items:[]}))` |

**Removed APIs:**
- `aiAnalyticsApi.getDashboard()` — no longer called
- `coinsApi.getStudentBalances()` — no longer called

---

## 8. No-Fake-Data Decisions

| Data Source | Before | After |
|-------------|--------|-------|
| AI risk distribution | Shown as "Xavf" chip in SituationBar with `atRisk` count | Set to `0`; chip hidden unless real signals exist |
| AI student insights | `SmartInsights` panel with "AI-derived" sentences | **Removed** |
| EduCoin balances | Card showing student coin count | **Removed** |
| AI analytics API | Called and displayed prominently | **Not called** |

If these APIs return real data in the future, they can be re-introduced behind explicit feature flags.

---

## 9. Remaining Phases

| Phase | Scope | Status |
|-------|-------|--------|
| Phase 1 | Sidebar + Cmd+K curation, landing redirect | ✅ Complete |
| Phase 2 | Dashboard restoration (stable landing page) | ✅ Complete |
| Phase 3 | Full dashboard redesign (KPI cards, quick actions, branch overview) | Pending |
| Phase 4 | Mobile/responsive polish for Director nav | Pending |

---

## 10. Files Modified

```
apps/frontend/src/app/(dashboard)/dashboard/_components/director-dashboard.tsx     (rewritten)
apps/frontend/src/app/(dashboard)/dashboard/_components/director-dashboard.test.tsx (new)
docs/DIRECTOR_EXPERIENCE_PHASE2_DASHBOARD_RESTORATION_REPORT.md                    (new)
```
