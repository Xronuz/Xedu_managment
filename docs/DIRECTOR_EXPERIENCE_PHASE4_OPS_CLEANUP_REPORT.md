# Director Experience Refactor — Phase 4: Ops Center Cleanup Report

**Date:** 2026-05-21  
**Commit:** TBD  
**Scope:** Personalize `/dashboard/ops` for Director role — executive cockpit, not operational console. No backend changes.

---

## 1. Objective

Make `/dashboard/ops` feel like an executive operations cockpit for Directors:
- Surface executive actions, not CRUD operations
- Prioritize critical alerts, suppress low-level noise
- Show ownership on every action and alert
- Highlight delegated blockers
- Keep VP / Branch Admin / Accountant experiences untouched

---

## 2. Audit Findings (Before)

### 2.1 QuickActionsBar — Operational Clutter

| Action | Classification | Director Relevance |
|--------|----------------|-------------------|
| Jadvalni ko'rish | Oversight | Medium |
| Avto-jadval yaratish | **CRUD** | Low — VP task |
| O'rinbosar belgilash | **CRUD** | Low — Branch Admin task |
| Davomatni ko'rish | Oversight | Medium |
| Ish haqini ko'rish | Approval | High |
| Tayyorlikni tekshirish | **CRUD** | Low — delegated |
| Moliyani ko'rish | Oversight | High |
| To'lovlarni ko'rish | Operational | Medium |
| Tariflarni ko'rish | Operational | Medium |
| Hisobotlarni ko'rish | Executive | High |
| Eksport markazi | Operational | Low |

**Problem:** 11 actions, many operational. Director feels like they should click "Avto-jadval yaratish."

### 2.2 OpsAlertsPanel — Alert Noise

**Before:** Shows ALL alerts (critical + warning + info) for ALL owners.

**Problem:** Director sees info-level alerts like "Unread announcements" alongside critical blockers. No prioritization.

### 2.3 ReadinessScoreCard — Good Foundation

**Before:** Already categorized into myActions / delegatedActions / informational.

**Gap:** Director doesn't get a quick "who is blocked" summary without expanding.

### 2.4 TodaySummaryCard — Adequate

**Before:** Compact KPIs (lessons, teachers, substitutions, payroll).

**Verdict:** Keep as-is. Already a good high-level summary.

---

## 3. Changes Made

### 3.1 `quick-actions-bar.tsx` — Director-Curated Actions

**For Director only** (other roles unchanged):

| Action | Icon | Route | Owner Badge |
|--------|------|-------|-------------|
| Tasdiqlash inbox | FileText | `/dashboard/approvals` | Siz |
| Filiallar | Building2 | `/dashboard/branches` | Siz |
| Xodimlar | Briefcase | `/dashboard/staff` | Siz |
| Ish haqi | Wallet | `/dashboard/payroll` | Moliya |
| Hisobotlar | BarChart3 | `/dashboard/reports` | Siz |
| Ogohlantirishlar | Bell | `/dashboard/alerts` | Siz |
| Dars jadvali | Calendar | `/dashboard/schedule` | VP |
| Sozlamalar | Settings | `/dashboard/settings` | Siz |

**Removed from Director view:**
- Avto-jadval yaratish (VP CRUD)
- O'rinbosar belgilash (Branch Admin CRUD)
- Davomatni ko'rish (redundant with dashboard)
- Tayyorlikni tekshirish (redirects to setup wizard)
- To'lovlarni ko'rish (inside Finance)
- Tariflarni ko'rish (inside Finance)
- Eksport markazi (operational)

**Added:**
- Tasdiqlash inbox (primary Director workflow)
- Filiallar (executive)
- Xodimlar (executive)
- Ogohlantirishlar (oversight)
- Dars jadvali (oversight)

**Owner badges** now shown on every action button (Siz / VP / Moliya / Filial).

### 3.2 `ops-alerts-panel.tsx` — Director Alert Prioritization

**New behavior for Director:**
1. **Suppress info alerts** — pure informational alerts hidden (too noisy)
2. **Sort by severity + ownership**:
   - Director-owned critical first
   - Other critical next
   - Director-owned warning next
   - Other warning last
3. **"Bloklangan" badge** on non-Director critical alerts — signals delegated blocker
4. **Owner badge** on every alert with color coding (Direktor / Mudir o'rinbosari / Filial admin / Moliyachi)

**Title changes:**
- Director: "Muhim ogohlantirishlar"
- Others: "Ogohlantirishlar"

**Empty state changes:**
- Director: "Muhim ogohlantirishlar yo'q — Barcha kritik va ogohlantiruvchi signalar normal"
- Others: unchanged

### 3.3 `readiness-score-card.tsx` — Delegation Summary

**New for Director (collapsed view):**
- Shows **per-owner blocker counts** as small badges below the main summary:
  - `Mudir o'rinbosari: 3 ta`
  - `Filial admin: 2 ta`
  - `Moliyachi: 1 ta`

**Enhanced ownership badges:**
- Readiness item rows now show owner badge with color coding
- Owner labels use `OWNER_BADGE_CLASS` for consistency

### 3.4 `page.tsx` — Director View Indicator

- Header subtitle changes for Director: "Maktab operatsiyalarining strategik nazorati"
- Added "Direktor ko'rinishi" badge in top-right corner
- Other roles see original subtitle

---

## 4. Ownership Surfacing in Ops Center

| Component | Before | After |
|-----------|--------|-------|
| QuickActionsBar | No ownership labels | Owner badge on every button |
| OpsAlertsPanel | Plain text owner name | Color-coded owner badge + "Bloklangan" for delegated |
| ReadinessScoreCard | Text owner name | Color-coded owner badge + per-owner blocker summary |
| TodaySummaryCard | N/A (no owner) | Unchanged |

---

## 5. Role Impact

| Role | Impact |
|------|--------|
| **Director** | Curated 8 executive actions, prioritized alerts, delegation summary, view indicator |
| **VP** | Unchanged — sees all original actions and all alerts |
| **Branch Admin** | Unchanged — sees all original actions and all alerts |
| **Accountant** | Unchanged — sees all original actions and all alerts |

---

## 6. Validation

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ Pass |
| Unit tests (vitest) | ✅ 97/97 pass |
| `next build` | ✅ Pass |

---

## 7. Smoke Checklist

- [x] Director sees 8 curated quick actions (not 11)
- [x] Director quick actions show owner badges
- [x] VP/BranchAdmin/Accountant still see original actions
- [x] Director alert panel suppresses info-level alerts
- [x] Director alerts sorted by severity + ownership
- [x] Director alerts show "Bloklangan" badge for delegated critical alerts
- [x] Director alert panel title is "Muhim ogohlantirishlar"
- [x] Readiness card shows per-owner blocker summary for Director
- [x] Readiness item rows show color-coded owner badges
- [x] Ops page header shows "Direktor ko'rinishi" badge
- [x] Type check passes
- [x] All tests pass
- [x] Build passes

---

## 8. Files Modified

```
apps/frontend/src/components/ops-command-center/quick-actions-bar.tsx     (curated director actions + owner badges)
apps/frontend/src/components/ops-command-center/ops-alerts-panel.tsx      (director alert prioritization + owner badges)
apps/frontend/src/components/ops-command-center/readiness-score-card.tsx  (per-owner blocker summary + owner badges)
apps/frontend/src/app/(dashboard)/dashboard/ops/page.tsx                  (director view indicator + subtitle)
docs/DIRECTOR_EXPERIENCE_PHASE4_OPS_CLEANUP_REPORT.md                      (new)
```

---

## 9. Phase Completion Summary

| Phase | Status | Key Deliverable |
|-------|--------|-----------------|
| Phase 1 — Sidebar + Cmd+K curation | ✅ `abe22b3` | ~16 curated items, landing redirect fix |
| Phase 2 — Dashboard restoration | ✅ `656aa9f` | Stable landing page, no fake data |
| Phase 3 — Executive redesign | ✅ `7e2cc9b` | 3-zone command dashboard |
| Phase 4 — Ops center cleanup | ✅ TBD | Director-personalized ops cockpit |
