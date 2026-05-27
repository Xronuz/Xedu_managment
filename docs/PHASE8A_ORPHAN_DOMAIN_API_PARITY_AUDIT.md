# Phase 8A — Orphan Domain & API Parity Audit

**Date:** 2026-05-21  
**Auditor:** Kimi Code CLI (4 concurrent background agents + manual review)  
**Scope:** Backend-only, frontend-only, dead schema, broken API routes, and marketing-only features  
**Baseline:** v0.1.1-pilot  

---

## Executive Summary

| Category | Count | P0 | P1 | P2 | P3 |
|----------|-------|----|----|----|----|
| Broken API routes (guaranteed 404) | 2 | 2 | 0 | 0 | 0 |
| Dead/orphan schema models | 5 | 0 | 3 | 2 | 0 |
| Backend controllers without frontend | 2 | 0 | 1 | 1 | 0 |
| Frontend API modules without backend match | 2 | 0 | 1 | 1 | 0 |
| Partial/mismatched modules | 6 | 0 | 0 | 4 | 2 |
| Coin/gamification gaps | 8 | 0 | 3 | 3 | 2 |
| Marketing/documentation vs reality | 5 | 0 | 1 | 2 | 2 |
| **Total** | **30** | **2** | **9** | **13** | **6** |

**Critical finding:** Two API modules (`invitations.ts`, `export-center.ts`) have **guaranteed 404** due to double `/v1` prefix bugs. The `announcements` backend is completely orphaned because the frontend `announcements` page talks to `notificationsApi` instead. The coin/gamification system is more real than initially assessed but **disabled by default** and has dead/unwired subsystems.

---

## 1. Broken API Routes (P0)

> Discovered by frontend API parity agent (agent-ebthi7if).

### 1.1 `invitations.ts` — Double `/v1` Prefix

| Field | Detail |
|-------|--------|
| **File** | `apps/frontend/src/lib/api/invitations.ts` |
| **Bug** | All 7 methods call `/v1/invitations/*`. `apiClient` baseURL already ends in `/api/v1`, producing **`/api/v1/v1/invitations/*`** |
| **Backend expects** | `/api/v1/invitations/*` |
| **Used?** | Yes — 3 call sites (`accept-invite/page.tsx`, etc.) |
| **Impact** | **Invitation acceptance flow is broken.** New users cannot accept invites via the frontend. |
| **Fix** | Remove `/v1` prefix from all paths in `invitations.ts` |

### 1.2 `export-center.ts` — Double `/v1` in `downloadExport()`

| Field | Detail |
|-------|--------|
| **File** | `apps/frontend/src/lib/api/export-center.ts` |
| **Bug** | `downloadExport()` builds `${NEXT_PUBLIC_API_URL}/v1/exports/${id}/download`. Since `NEXT_PUBLIC_API_URL` already contains `/api/v1`, the URL becomes **`/api/v1/v1/exports/…/download`** |
| **Backend expects** | `/api/v1/exports/:id/download` |
| **Used?** | Yes — 7 call sites |
| **Impact** | **Export downloads are broken.** Users can create exports but cannot download them. |
| **Fix** | Remove the hardcoded `/v1/` segment from `downloadExport()` URL construction |

---

## 2. Prisma Dead / Orphan Models

> Discovered by Prisma dead models agent (agent-0u9rhjjt).

| # | Model | Controller | Frontend | Business Logic | Status | Severity | Action |
|---|-------|-----------|----------|----------------|--------|----------|--------|
| 1 | **AiQuota** | Indirect (`ai.controller.ts`) | `lib/api/ai.ts` (0 consumers) | Enforces limits before AI calls | **Dead** | P1 | Decide: build AI admin page or remove |
| 2 | **UserEntitlement** | `ai.controller.ts` (`/ai/entitlement`) | `lib/api/ai.ts` (0 consumers) | Used in `RequireAiFeatureGuard` | **Dead** | P1 | Decide: wire to settings or remove |
| 3 | **EngagementReputation** | No dedicated controller | No page | Score tracking in services | **Dead** | P1 | Decide: build reputation widget or drop model |
| 4 | **AiUsage** | `ai.controller.ts` (`/ai/usage/*`) | `lib/api/ai.ts` (0 consumers) | Telemetry logging on every AI call | **Dead** | P2 | Build AI usage report or document as internal telemetry |
| 5 | **SolverRun** | `schedule.controller.ts` (`GET /schedule/solver-runs`) | No page | Schedule solver audit trail | **Dead** | P2 | Add "Solver History" to schedule page or remove endpoint |

### Partial / Hidden Models (P2)

| Model | Status | Notes |
|-------|--------|-------|
| **LeadComment** | Partial | Child of Lead; no dedicated controller or API module, but CRM page likely renders inline |
| **SchoolModule** / **BranchModule** | Partial | Feature flags; read in `SuperAdminService` and tenant guards; no admin UI for toggling |

### Models Mentioned in Docs but NOT in Schema

| Name | Notes |
|------|-------|
| `ClubActivity` | Never created. Only `Club`, `ClubMember`, `ClubJoinRequest` exist. |
| `CrmActivity` | Never created. Lead history stored in `LeadComment`. |
| `CrmSource` | Enum `LeadSource` exists, not a model. |
| `Reward` / `RewardPurchase` | Never created. Shop uses `CoinShopItem` + `CoinTransaction`. |
| `MarketingCampaign` | Never created. Marketing module only aggregates `Lead` data. |
| `LandingPage` | No model. There is a React component in `app/page.tsx`. |

---

## 3. Backend Controllers Without Frontend Surface

> Discovered by backend controllers agent (agent-afj9n5cb).

### 🔴 Dead / Orphaned

| # | Controller | Key Endpoints | Front Page | Front API | Actually Used? | Severity | Action |
|---|-----------|---------------|------------|-----------|----------------|----------|--------|
| 1 | **announcements** | Full CRUD + read/acknowledge | **YES** (`dashboard/announcements`) | **NO** — no `announcements.ts` API | **NO** — page imports `notificationsApi` | **P1** | Either delete backend or rewrite frontend page to use `announcementsApi` |
| 2 | **ai** | `/ai/status`, `/ai/usage/*`, `/ai/quota/*`, `/ai/entitlement`, `/ai/demo/generate` | **NO** | **YES** (`ai.ts`) | **NO** — `aiApi` is never imported | **P2** | Delete `lib/api/ai.ts`. Keep backend if AI is planned. |

### 🟡 Partial / Naming Mismatch

| # | Controller | Issue | Severity | Action |
|---|-----------|-------|----------|--------|
| 3 | **marketing** | Only `getDashboard()` called; `getFunnel`, `getSources`, `getMonthlyTrend` defined but never invoked | P2 | Wire remaining endpoints or prune unused methods |
| 4 | **engagement** | Only `getConfig`/`updateConfig` used; achievements, recovery, 5 analytics endpoints defined but never called | P2 | Build UI for achievements/recovery/analytics or prune endpoints |
| 5 | **export** | Backend module named `export`, frontend API named `export-center` | P3 | Rename for consistency |
| 6 | **financial-shifts** | `shiftsApi` lives inside `treasury.ts`; no dedicated file | P3 | Extract into `lib/api/financial-shifts.ts` |
| 7 | **teacher-attendance** | `teacher-substitutions.ts` API calls `/teacher-attendance/...` endpoints | P3 | Rename frontend API or split backend module |
| 8 | **upload** | Used inline via `apiClient.post('/upload/document', ...)` in homework page | P3 | Create `lib/api/upload.ts` wrapper |

### 🟢 Real / Fully Connected (42 modules)

The following have backend controller, matching frontend API, and active imports:

`academic-calendar`, `ai-analytics`, `attendance`, `auth`, `branches`, `canteen`, `classes`, `clubs`, `coins`, `discipline`, `display`, `exams`, `fee-structures`, `finance`, `grades`, `homework`, `import`, `invitations`, `kpi`, `leads`, `learning-center`, `leave-requests`, `library`, `meetings`, `messaging`, `notifications`, `online-exam`, `ops-command-center`, `parent`, `payments`, `payroll`, `periods`, `reports`, `rooms`, `schedule`, `students`, `subjects`, `super-admin`, `system-config`, `teaching-load`, `transport`, `treasury`, `users`.

### ⚪ Infra / No UI Required

| Controller | Purpose |
|-----------|---------|
| **health** | Liveness/readiness probes |
| **gateway** | WebSocket events gateway |

---

## 4. Frontend API Mismatches

> Discovered by frontend API parity agent (agent-ebthi7if).

### P1 — Route Mismatch

| # | API Module | Issue | Used? |
|---|-----------|-------|-------|
| 1 | **reports.ts** | `getReportCard` calls `/reports/report-card/${studentId}` but backend expects `/reports/report-card/:studentId/pdf`. Method is dead code (0 call sites). | No |
| 2 | **ai.ts** | `checkQuota` sends `/ai/quota?feature=xyz` but backend `@Get('quota/:feature')` requires path segment. Entire module unused. | No |

### P2 — Wrapper Modules (Routes Real, Architectural Debt)

These are thin wrappers around endpoints in other controllers:

| API Module | Wraps Backend Controller | Used? |
|-----------|--------------------------|-------|
| `analytics.ts` | `reports.controller.ts` (`/reports/analytics/*`) | Yes (9 calls) |
| `schedule-generator.ts` | `schedule.controller.ts` | Yes (5 calls) |
| `schedule-repair.ts` | `schedule.controller.ts` | Yes (2 calls) |
| `timetable-analytics.ts` | `schedule.controller.ts` | Yes (7 calls) |
| `teacher-substitutions.ts` | `teacher-attendance.controller.ts` | Yes (9 calls) |

### P2 — Routing Quirks

| API Module | Quirk |
|-----------|-------|
| `auth.ts` | `authApi.me` calls `/users/me` (users controller), not `/auth/me` |
| `reports.ts` | `getFinance` calls `/payments/report` (payments controller), not `/reports/finance` |
| `treasury.ts` | Mixes `treasuryApi` → `treasury.controller.ts` + `shiftsApi` → `financial-shifts.controller.ts` |

### P3 — Barrel File Gaps

29 API modules bypass `lib/api/index.ts` and are imported directly by path. Either add them to the barrel or document the intentional pattern.

---

## 5. Coin / Gamification Deep Audit

> Discovered by coins/gamification agent (agent-itg6ikyz).

### Schema (All Real)

| Model | Status | Details |
|-------|--------|---------|
| `User.coins` | ✅ Real | `Int @default(0)` |
| `CoinTransaction` | ✅ Real | Full ledger: type, reason (18 values), balance snapshot, metadata JSONB, reversal tracking |
| `CoinShopItem` | ✅ Real | Name, description, cost, emoji, stock, isActive |
| `Achievement` | ✅ Real | Criteria JSON, rewardCoins, category, isPositive |
| `UserAchievement` | ✅ Real | Progress JSON `{current, target}`, unlockedAt |
| `EngagementReputation` | ⚠️ Dead | Schema exists but no frontend surface, no dedicated controller |

### Backend Earning Triggers

| Trigger | File | Status | Notes |
|---------|------|--------|-------|
| Grade ≥ 90% | `grades.service.ts:111-121` | ✅ **Real** | Hardcoded `COIN_RULES.GRADE_EXCELLENT = 10`. Ignores per-school config. |
| Grade update → 90%+ | `grades.service.ts:336-342` | ✅ **Real** | Idempotency check via `metadata.gradeId` |
| Grade deleted rollback | `grades.service.ts:368-379` | ✅ **Real** | Reverses previously earned coins |
| Discipline "praise" | `discipline.service.ts:166-170` | ✅ **Real** | Hardcoded `DISCIPLINE_PRAISE = 100` |
| Weekly perfect attendance | `coins.service.ts:614-663` | ✅ **Real** | Cron `@Cron(EVERY_WEEK)`. Reads per-school config. |
| Manual teacher award | `coins.service.ts:427-467` | ✅ **Real** | Rate-limited (50/day/teacher, 20/week/student) |
| Recovery bonus | `recovery.service.ts:94-124` | ✅ **Real** | Awards `engagement_recovery_rate` coins (default 5) |
| **Exam high score** | `exam-engagement.service.ts:38-97` | ❌ **Dead** | `evaluateExamResult()` is **never called anywhere** |
| **Homework submission** | — | ❌ **Missing** | Zero coin references in `homework.service.ts` |
| **Achievement unlock** | `achievement.service.ts:145-192` | ⚠️ **Partial** | `checkAndProgress()` only called from dead `exam-engagement.service.ts` |

### Spending / Deduction Triggers

| Trigger | File | Status |
|---------|------|--------|
| Shop purchase | `coins.service.ts:377-423` | ✅ Real |
| Discipline "warning" | `discipline.service.ts:171-176` | ✅ Real |
| Manual deduct | `coins.service.ts:452-455` | ✅ Real |
| Accountability deductions | `accountability.service.ts:109-180` | ✅ Real |
| Grade dropped below 90% | `grades.service.ts:343-347` | ✅ Real |

### Frontend Pages

| Route | Status | Notes |
|-------|--------|-------|
| `/dashboard/student/shop` | ✅ Real | Balance, history, purchase |
| `/dashboard/coins` | ✅ Real | Dual-mode: student + admin |
| `/dashboard/staff/shop` | ❌ **Orphaned** | Identical admin UI, but **zero references** — not in nav, permissions, or links |
| `/dashboard/settings/engagement` | ✅ Real | Master toggle + feature flags + thresholds |

### Critical: Disabled by Default

```ts
// engagement-config.service.ts:123-148
const DEFAULTS: EngagementConfig = {
  engagement_enabled: false,        // ← MASTER SWITCH OFF
  engagement_positive: true,
  engagement_accountability: false,
  engagement_achievements: false,
  engagement_streaks: false,
  engagement_leaderboard: false,
  engagement_shop: false,
  engagement_teacher_award: false,
  engagement_teacher_deduct: false,
  // ...
};
```

**Impact:** Even though backend code exists, no school will see gamification unless a Director explicitly visits `/dashboard/settings/engagement` and toggles the master switch.

### Classification Matrix

| Component | Classification | Severity |
|-----------|---------------|----------|
| Schema (all gamification tables) | Real | — |
| Core coin service (earn/deduct/shop) | Real | — |
| Grade-based coin award | Real | P2 |
| Discipline praise/warning coins | Real | P2 |
| Weekly attendance bonus cron | Real | P2 |
| Manual teacher award | Real | — |
| Shop purchase flow | Real | — |
| Accountability deductions | Real | P2 |
| Recovery system | Real | P2 |
| Engagement config & settings UI | Real | — |
| **Exam result coin integration** | **Dead** | **P0** |
| **Achievement evaluation engine** | **Partial** | **P1** |
| **Homework submission coins** | **Missing** | **P1** |
| **Admin shop page (`/staff/shop`)** | **Orphaned** | **P1** |
| **Student achievements/badges UI** | **Missing** | **P1** |
| **Header coin balance display** | **Missing** | **P2** |
| **Hardcoded coin values** (ignore config) | **Partial** | **P1** |
| **Disabled by default** | **Config** | **P1** |

---

## 6. Marketing / Documentation Claims vs Code Reality

| # | Claim | Source | Evidence | Status | Severity | Action |
|---|-------|--------|----------|--------|----------|--------|
| 1 | **"Online Exam Engine — DocX import"** | `XEDU_SYSTEM_DESIGN_REPORT.md:1229` | No DocX import endpoint. No `.docx` parsing library. | **Marketing-only** | P2 | Remove from docs or build |
| 2 | **"Real-time proctoring"** | `XEDU_SYSTEM_DESIGN_REPORT.md:1229` | No proctoring controller. No webcam access. No anti-cheat beyond basic timer. | **Marketing-only** | P1 | Remove from docs |
| 3 | **"AI/risk scoring"** | `COMPETITOR_ANALYSIS.md:154` | `insights/page.tsx` shows mock risk cards. AI providers stubbed. `ai-analytics.ts` queries raw grades/attendance, not AI models. | **Stub** | P2 | Document as "AI-ready infrastructure, not active" |
| 4 | **"Gamification / Coin system"** | `COMPETITOR_ANALYSIS.md:83` | Real schema + services. Grade/discipline/weekly triggers wired. BUT: disabled by default, exam trigger dead, achievements unwired. | **Partial** | P1 | Enable by default or document opt-in |
| 5 | **"Native mobile app"** | `TEACHER_JOURNAL_GAP_AUDIT.md:730` | No React Native. No Flutter. No native codebase. | **Marketing-only** | P3 | Remove from docs |
| 6 | **"Video conferencing / meetings"** | `meetings/page.tsx` | Frontend + backend exist. But no Zoom/Meet/Jitsi integration. Meetings are scheduled events only. | **Partial** | P3 | Document as "meeting scheduling, no video" |
| 7 | **"PWA / Mobile app"** | `PILOT_CHECKLIST.md:94` | Responsive Tailwind. No `manifest.json`. No service worker. No push notifications. | **Partial** | P2 | Document as "web-responsive, PWA planned" |

---

## 7. Summary Matrix

### By Recommended Action

| Action | Count | Items |
|--------|-------|-------|
| **Fix** | 4 | invitations.ts `/v1` prefix, export-center.ts `/v1` prefix, announcements page API wiring, exam-engagement service wiring |
| **Build** | 6 | Achievement auto-unlock, homework submission coins, student badges page, reputation widget, AI usage report, solver history |
| **Remove** | 5 | `lib/api/ai.ts`, dead `exam-engagement.service.ts`, DocX claims, proctoring claims, native app claims |
| **Hide / Document** | 7 | AI stub status, PWA status, video meeting status, engagement opt-in, email SMTP dependency, barrel export pattern |
| **Decide** | 3 | EngagementReputation model, AiQuota/UserEntitlement models, admin shop page (`/staff/shop`) |
| **Refactor** | 5 | Rename export-center→export, extract financial-shifts API, extract upload API, hardcoded coin values, rename teacher-substitutions API |

### By Status

| Status | Count |
|--------|-------|
| Real (fully working) | 42 controllers + 42 API modules |
| Partial (works but gaps) | 8 |
| Dead (code exists, unwired/unused) | 7 |
| Broken (guaranteed 404) | 2 |
| Marketing-only (no code) | 4 |

---

## 8. Pilot Expansion Priority Recommendations

**Before expanding pilot to new schools:**

### Must Fix (P0 — 1-2 days)
1. **Fix `invitations.ts` double `/v1`** — Invitation acceptance is broken
2. **Fix `export-center.ts` `downloadExport()` double `/v1`** — Export downloads are broken

### High Priority (P1 — 3-5 days)
3. **Wire announcements frontend** — Either connect `announcements/page.tsx` to `announcementsApi` or drop the backend
4. **Enable engagement by default OR document opt-in** — Currently invisible to all schools
5. **Wire `evaluateExamResult()` into exam grading** — Dead code in `exam-engagement.service.ts`
6. **Remove `lib/api/ai.ts`** — Dead code, zero consumers
7. **Decide on `/staff/shop`** — Either link it in nav/permissions or delete the duplicate page

### Medium Priority (P2 — 5-7 days)
8. **Wire achievement `checkAndProgress()` into grade creation + homework submission**
9. **Build student achievements/badges page** (tab on `/dashboard/coins` or new page)
10. **Make grades/discipline services respect per-school `engagementConfig`** instead of hardcoded `COIN_RULES`
11. **Add coin balance chip to global header** when `role === 'student'`
12. **Document AI stub, PWA, video meeting status** in user-facing docs

### Low Priority (P3 — Defer post-pilot)
13. Rename/refactor API modules for naming consistency (export-center, teacher-substitutions, treasury shifts)
14. Extract `upload.ts` from inline `apiClient` calls
15. Add solver history drawer to schedule page
16. Build AI usage report or document as internal telemetry
17. Clean up marketing-only claims from docs

**Total estimated effort for P0+P1+P2: 9-14 days**

---

## Appendix: Agent Attribution

| Agent | Task | Key Findings |
|-------|------|-------------|
| agent-0u9rhjjt | Prisma dead models | 5 dead models, 2 partial, 7 docs-mentioned-but-missing |
| agent-afj9n5cb | Backend controllers | 52 controllers mapped: 42 real, 6 partial, 2 dead, 2 infra |
| agent-ebthi7if | Frontend API parity | 2 P0 broken routes, 2 P1 mismatches, 5 P2 wrapper modules |
| agent-itg6ikyz | Coins/gamification | System real but disabled by default; exam-engagement dead; staff shop orphaned |

*Audit complete. 30 findings across 6 categories. 2 P0, 9 P1, 13 P2, 6 P3.*
