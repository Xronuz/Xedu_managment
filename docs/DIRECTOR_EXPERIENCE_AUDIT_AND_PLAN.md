# Director Experience Audit & Refactor Plan

**Version:** 1.0  
**Date:** 2026-05-28  
**Scope:** UX curation for the Director role — executive control, approvals, oversight, and delegation. No backend permission reductions unless explicitly noted.

---

## 1. Executive Summary

The Director role currently sees **9 sidebar groups with 26 items**, is **redirected away from their own dashboard** to `/dashboard/ops`, and has **no curated command palette** — every permitted route appears as a nav item. The result is cognitive overload: Directors feel responsible for operational tasks (periods, rooms, classes, subjects, teaching loads) that the ownership matrix explicitly delegates to VP and Branch Admin.

This plan proposes:
- **Sidebar reduction** from 26 items → ~14 curated items
- **Dashboard restoration** as the primary landing (remove forced `/dashboard/ops` redirect)
- **New Director dashboard** showing readiness, approvals, branch health, academic risk, finance summary, and delegated task status
- **Command palette curation** removing noisy operational create-actions
- **RBAC-safe hiding** — nav curation only; backend permissions remain unchanged

---

## 2. Current Navigation Inventory

### 2.1 Sidebar Groups & Items (`DIRECTOR_NAV`)

| # | Group | Item | Href | Classification |
|---|-------|------|------|----------------|
| 1 | **Umumiy ko'rinish** | Operatsion markaz | `/dashboard/ops` | **executive** — daily pulse |
| 1 | | Dashboard | `/dashboard` | **executive** — currently unreachable due to redirect |
| 1 | | Maktab sozlash | `/dashboard/setup` | **data-entry** — 7-step wizard; Director owns only step 1 (school profile) |
| 1 | | Filiallar | `/dashboard/branches` | **executive** — branch creation is Director-owned |
| 1 | | Tasdiqlash inbox | `/dashboard/approvals` | **approval** — primary Director workflow |
| 1 | | Ogohlantirishlar | `/dashboard/alerts` | **oversight** — Director sees all alerts |
| 2 | **Ta'lim** | Dars jadvali | `/dashboard/schedule` | **oversight** — view published schedule; CRUD delegated to VP |
| 2 | | Sinflar | `/dashboard/classes` | **should delegate** — data entry owned by Branch Admin |
| 2 | | Fanlar | `/dashboard/subjects` | **should delegate** — data entry owned by VP |
| 2 | | Baholar | `/dashboard/grades` | **oversight** — view and monitor; entry delegated to teachers |
| 2 | | Imtihonlar | `/dashboard/exams` | **oversight** — view and monitor |
| 2 | | Davomat | `/dashboard/attendance` | **oversight** — institution-wide view |
| 2 | | Akademik kalendar | `/dashboard/academic-calendar` | **oversight** — strategic calendar view |
| 2 | | To'garaklar | `/dashboard/clubs` | **operational** — low Director relevance |
| 3 | **Operatsiyalar** | Ta'til so'rovlar | `/dashboard/leave-requests` | **approval** — requires Director sign-off |
| 3 | | Intizom | `/dashboard/discipline` | **oversight** — monitor; primary action by Branch Admin |
| 3 | | O'qituvchi almashtirish | `/dashboard/teacher-substitutions` | **should delegate** — daily ops owned by Branch Admin |
| 3 | | Do'kon boshqaruvi | `/dashboard/staff/shop` | **operational** — EduCoin shop; low relevance |
| 4 | **Moliya** | Moliya | `/dashboard/finance` | **executive** — high-level finance overview |
| 5 | **Jamoa** | O'quvchilar | `/dashboard/students` | **operational** — student directory |
| 5 | | Xodimlar | `/dashboard/staff` | **executive** — staff management; Director creates VP/Branch Admin |
| 6 | **Sotuv** | CRM — Leadlar | `/dashboard/crm` | **operational** — admissions/sales funnel |
| 7 | **Aloqa** | Kommunikatsiya | `/dashboard/comms` | **operational** — messaging |
| 7 | | Bildirishnomalar | `/dashboard/notifications` | **system** — notification inbox |
| 8 | **Analitika** | Hisobotlar | `/dashboard/reports` | **executive** — executive reports and analytics |
| 8 | | Jadval analitikasi | `/dashboard/analytics/timetable` | **oversight** — timetable quality metrics |
| 9 | **Tizim** | Sozlamalar | `/dashboard/settings` | **system** — profile, security, system config |

### 2.2 Missing from Sidebar (But Permitted)

| Route | Why Missing | Impact |
|-------|-------------|--------|
| `/dashboard/users` | Not in `DIRECTOR_NAV` | Directors must use Cmd+K or direct URL to manage users |
| `/dashboard/payments` | Comment says "inside Moliya tabs" | Acceptable if Finance page has clear tabs |
| `/dashboard/payroll` | Comment says "inside Moliya tabs" | **Problematic** — payroll approval is Director-exclusive; should be top-level |
| `/dashboard/fee-structures` | Comment says "inside Moliya tabs" | Acceptable |
| `/dashboard/kpi` | Not in `DIRECTOR_NAV` | Only accessible via Cmd+K |
| `/dashboard/insights` | Not in `DIRECTOR_NAV` | Only accessible via Cmd+K |
| `/dashboard/export-center` | Not in `DIRECTOR_NAV` | Only accessible via Cmd+K |
| `/dashboard/marketing` | Not in `DIRECTOR_NAV` | Only accessible via Cmd+K |

### 2.3 Classification Summary

| Category | Count | Items |
|----------|-------|-------|
| **executive** | 4 | Operatsion markaz, Dashboard, Filiallar, Moliya |
| **approval** | 2 | Tasdiqlash inbox, Ta'til so'rovlar |
| **oversight** | 6 | Dars jadvali, Baholar, Imtihonlar, Davomat, Akademik kalendar, Jadval analitikasi |
| **operational** | 7 | O'quvchilar, CRM, Kommunikatsiya, Bildirishnomalar, To'garaklar, Do'kon boshqaruvi, Intizom |
| **data-entry** | 1 | Maktab sozlash (only step 1 is Director-owned) |
| **should delegate** | 4 | Sinflar, Fanlar, O'qituvchi almashtirish, Xodimlar (partial) |
| **system** | 1 | Sozlamalar |
| **missing** | 5 | Foydalanuvchilar, Ish haqi, KPI, Insights, Eksport markazi |

---

## 3. Director Dashboard & Ops Audit

### 3.1 Critical Finding: Dashboard Redirect

In `dashboard/page.tsx`:
```tsx
const OPS_REDIRECT_ROLES = ['director', 'vice_principal', 'branch_admin', 'accountant'];
// ...
router.replace('/dashboard/ops');
```

**Impact:** The `DirectorDashboard` component (626 lines, with Situation Bar, Executive Briefing, Branch Health Map, Financial Pulse, Academic Snapshot, Staff Operations, Intelligence Feed, Smart Insights, Activity Stream) is **effectively dead code**. Directors never land on `/dashboard`. They must manually navigate back or type the URL.

**Recommendation:** Remove `director` from `OPS_REDIRECT_ROLES`. The Director's primary landing should be their own dashboard.

### 3.2 Ops Command Center (`/dashboard/ops`)

Current layout:
```
┌────────────────────────────┬────────────────────────────┐
│  Readiness Score Card      │  Today Summary Card        │
├────────────────────────────┴────────────────────────────┤
│  Quick Actions Bar (2/3)   │  Ops Alerts Panel (1/3)   │
└─────────────────────────────────────────────────────────┘
```

**Strengths:**
- Readiness card correctly shows ownership buckets (My Actions / Delegated / Informational)
- Today Summary gives compact KPIs (lessons, teachers, substitutions, payroll)
- Alerts panel shows owner labels and action CTAs

**Problems:**
- Quick Actions Bar has 11 items for Director, many operational ("Avto-jadval yaratish", "O'rinbosar belgilash")
- No delegated-task status by role (can't see what VP or Branch Admin hasn't done)
- No approval queue preview
- No finance summary
- No academic risk signals

### 3.3 Approvals Inbox (`/dashboard/approvals`)

**Strengths:**
- Unified split-view for leave + discipline
- Multi-select + bulk actions
- Real-time updates via Socket.io

**Problems:**
- No urgency sorting (age-based sorting is weak)
- No delegation action ("VPga yuborish")
- No auto-approve threshold
- Missing approval types: fee structure changes, staff role changes, branch budget transfers

### 3.4 Alerts Center (`/dashboard/alerts`)

**Strengths:**
- Derived alerts from real data (not static notifications)
- Severity grouping
- Bulk acknowledge

**Problems:**
- Director sees **all** alerts but the UI doesn't distinguish "your action needed" vs "informational"
- No escalation preview ("Branch Admin 48h davomida faol emas → VPga topshirish")
- No alert routing rules

### 3.5 Setup Wizard (`/dashboard/setup`)

**Problem:** Director is expected to complete a 7-step wizard but only owns step 1 (school profile). Steps 2–7 are delegated. The wizard doesn't guide delegation — it just shows incomplete steps.

**Recommendation:** Transform setup wizard into a "delegation tracker" for Director: show who was assigned which step, their progress, and escalation triggers.

---

## 4. Ownership Alignment Analysis

### 4.1 Readiness Checklist vs Director Sidebar

| Task | Owner | In Sidebar? | Sidebar Item | Verdict |
|------|-------|-------------|--------------|---------|
| School profile | Director | ✅ (indirect) | Maktab sozlash (step 1) | Keep but clarify |
| Branches | Director | ✅ | Filiallar | Keep |
| Periods | Branch Admin | ✅ | Maktab sozlash (step 2) | **Hide from Director nav** |
| Rooms | Branch Admin | ✅ | Maktab sozlash (step 3) | **Hide from Director nav** |
| Classes | Branch Admin | ✅ | Sinflar + Maktab sozlash (step 4) | **Hide from Director nav** |
| Subjects | VP | ✅ | Fanlar + Maktab sozlash (step 5) | **Hide from Director nav** |
| Teaching loads | VP | ✅ | Maktab sozlash (step 6) | **Hide from Director nav** |
| Timetable publish | VP | ✅ | Dars jadvali + Maktab sozlash (step 7) | Keep as oversight |

### 4.2 Alert Ownership vs Sidebar

| Alert | Owner | Director Sees? | Director Action? | Verdict |
|-------|-------|----------------|------------------|---------|
| setup:periods | Branch Admin | ✅ | No action | Informational; okay if labeled |
| setup:rooms | Branch Admin | ✅ | No action | Informational |
| setup:classes | Branch Admin | ✅ | No action | Informational |
| setup:subjects | VP | ✅ | No action | Informational |
| setup:teachingLoads | VP | ✅ | No action | Informational |
| schedule:unpublished | VP | ✅ | Can escalate | Keep with escalation CTA |
| staff:absentWithoutSub | Branch Admin | ✅ | Can escalate | Keep with escalation CTA |
| staff:pendingLeaves | VP | ✅ | Approves jointly | Keep |
| payroll:missing | Accountant | ✅ | Can escalate | Keep with escalation CTA |
| payroll:missingAttendance | Accountant | ✅ | Can escalate | Keep with escalation CTA |

---

## 5. Proposed Director Navigation

### 5.1 New Sidebar Structure

**Groups: 5 (down from 9)**  
**Items: ~14 (down from 26)**

```
┌─ UMUMIY KO'RINISH ─────────────────────────┐
│  Dashboard              → /dashboard        │  executive
│  Operatsion markaz      → /dashboard/ops    │  executive
│  Tasdiqlash inbox       → /dashboard/approvals │  approval
│  Ogohlantirishlar       → /dashboard/alerts │  oversight
├─ FILIAL & JAMOA ───────────────────────────┤
│  Filiallar              → /dashboard/branches │  executive
│  Xodimlar               → /dashboard/staff  │  executive
│  Foydalanuvchilar       → /dashboard/users  │  executive (NEW)
├─ TA'LIM (overview) ────────────────────────┤
│  Dars jadvali           → /dashboard/schedule │  oversight
│  Baholar                → /dashboard/grades │  oversight
│  Davomat                → /dashboard/attendance │  oversight
├─ MOLIYA ───────────────────────────────────┤
│  Moliya                 → /dashboard/finance │  executive
│  Ish haqi               → /dashboard/payroll │  approval (NEW)
├─ ANALITIKA ────────────────────────────────┤
│  Hisobotlar             → /dashboard/reports │  executive
│  KPI Dashboard          → /dashboard/kpi    │  executive (NEW)
├─ TIZIM ────────────────────────────────────┤
│  Sozlamalar             → /dashboard/settings │  system
│  Audit Log              → /dashboard/audit-log │  system
```

### 5.2 Removed from Sidebar (Still Permitted)

| Item | Reason | Access Path |
|------|--------|-------------|
| Maktab sozlash | 6/7 steps delegated; Director only owns school profile | Via readiness card → "Maktab profilini yangilash" |
| Sinflar | Data entry owned by Branch Admin | Cmd+K or delegated task link |
| Fanlar | Data entry owned by VP | Cmd+K or delegated task link |
| Imtihonlar | Oversight redundant with Baholar + Reports | Via Reports → Imtihonlar tab |
| To'garaklar | Low Director relevance | Cmd+K |
| Intizom | Primary action by Branch Admin | Via alerts or delegated task |
| O'qituvchi almashtirish | Daily ops by Branch Admin | Via alerts or Ops center |
| Do'kon boshqaruvi | Operational EduCoin shop | Cmd+K |
| O'quvchilar | Student directory; Director rarely needs direct access | Via Reports or Cmd+K |
| CRM — Leadlar | Admissions ops; relevant only if Director owns admissions | Cmd+K |
| Kommunikatsiya | Messaging; not executive priority | Cmd+K |
| Bildirishnomalar | System inbox; not executive priority | Header notification drawer |
| Jadval analitikasi | Deep metric; belongs in Reports → Jadval tab | Via Reports |
| Akademik kalendar | Strategic calendar view kept in dashboard widget | Via dashboard AcademicCalendarWidget |

---

## 6. Route Keep / Hide / Delegate Decision Table

| Route | Backend Permits Director? | Sidebar Verdict | Rationale |
|-------|---------------------------|-----------------|-----------|
| `/dashboard` | ✅ | **Keep** | Primary landing; restore from redirect |
| `/dashboard/ops` | ✅ | **Keep** | Daily operational pulse |
| `/dashboard/approvals` | ✅ | **Keep** | Core Director workflow |
| `/dashboard/alerts` | ✅ | **Keep** | Oversight surface |
| `/dashboard/branches` | ✅ | **Keep** | Director owns branch creation |
| `/dashboard/staff` | ✅ | **Keep** | Director creates VP/Branch Admin |
| `/dashboard/users` | ✅ | **Add** | Missing from nav; Director creates users |
| `/dashboard/schedule` | ✅ | **Keep** | Oversight; view published schedule |
| `/dashboard/grades` | ✅ | **Keep** | Oversight; monitor grade distribution |
| `/dashboard/attendance` | ✅ | **Keep** | Oversight; institution-wide view |
| `/dashboard/finance` | ✅ | **Keep** | Executive finance overview |
| `/dashboard/payroll` | ✅ | **Add** | Director-exclusive approval; must be top-level |
| `/dashboard/reports` | ✅ | **Keep** | Executive intelligence |
| `/dashboard/kpi` | ✅ | **Add** | Executive KPIs; currently Cmd+K only |
| `/dashboard/settings` | ✅ | **Keep** | System settings |
| `/dashboard/audit-log` | ✅ | **Keep** | Compliance oversight |
| `/dashboard/setup` | ✅ | **Hide** | 6/7 steps delegated; replace with readiness card actions |
| `/dashboard/classes` | ✅ | **Hide** | Data entry → Branch Admin |
| `/dashboard/subjects` | ✅ | **Hide** | Data entry → VP |
| `/dashboard/exams` | ✅ | **Hide** | Redundant with Reports |
| `/dashboard/homework` | ✅ | **Hide** | Operational → teachers |
| `/dashboard/academic-calendar` | ✅ | **Hide** | Accessible via dashboard widget |
| `/dashboard/clubs` | ✅ | **Hide** | Low relevance |
| `/dashboard/leave-requests` | ✅ | **Hide** | Redundant with Approvals inbox |
| `/dashboard/discipline` | ✅ | **Hide** | Primary action → Branch Admin |
| `/dashboard/teacher-substitutions` | ✅ | **Hide** | Daily ops → Branch Admin |
| `/dashboard/staff/shop` | ✅ | **Hide** | Operational |
| `/dashboard/students` | ✅ | **Hide** | Directory access via Reports |
| `/dashboard/crm` | ✅ | **Hide** | Operational admissions |
| `/dashboard/comms` | ✅ | **Hide** | Messaging |
| `/dashboard/notifications` | ✅ | **Hide** | Header drawer is sufficient |
| `/dashboard/analytics/timetable` | ✅ | **Hide** | Deep metric → Reports |
| `/dashboard/payments` | ✅ | **Hide** | Inside Finance tabs |
| `/dashboard/fee-structures` | ✅ | **Hide** | Inside Finance tabs |
| `/dashboard/insights` | ✅ | **Hide** | AI analytics; Cmd+K or Reports |
| `/dashboard/marketing` | ✅ | **Hide** | Operational |
| `/dashboard/teaching-loads` | ✅ | **Hide** | Data entry → VP |
| `/dashboard/reports/workload` | ✅ | **Hide** | Deep metric → Reports |
| `/dashboard/export-center` | ✅ | **Hide** | Operational export tool |
| `/dashboard/education` | ✅ | **Hide** | Redirects to schedule |
| `/dashboard/resources` | ✅ | **Hide** | Resource library |
| `/dashboard/library` | ✅ | **Hide** | Library management |
| `/dashboard/learning-center` | ✅ | **Hide** | Learning center |
| `/dashboard/canteen` | ✅ | **Hide** | Canteen management |
| `/dashboard/transport` | ✅ | **Hide** | Transport management |
| `/dashboard/coins` | ✅ | **Hide** | EduCoin system |
| `/dashboard/announcements` | ✅ | **Hide** | Announcements → dashboard quick action |
| `/dashboard/messages` | ✅ | **Hide** | Messages |
| `/dashboard/meetings` | ✅ | **Hide** | Meetings |
| `/dashboard/profile` | ✅ | **Keep (header only)** | Profile via header dropdown |

---

## 7. Director Dashboard Redesign Plan

### 7.1 Remove Forced Redirect

In `dashboard/page.tsx`:
```tsx
// BEFORE:
const OPS_REDIRECT_ROLES = ['director', 'vice_principal', 'branch_admin', 'accountant'];

// AFTER:
const OPS_REDIRECT_ROLES = ['vice_principal', 'branch_admin', 'accountant'];
// Director stays on /dashboard
```

### 7.2 Dashboard Layout (Text Wireframe)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ HEADER (existing)                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│ SITUATION BAR (sticky, 56px)                                            │
│ [Filial: Barcha ●] [Tasdiqlash: 12] [Ogohlantirish: 5●] [Tayyorlik: 72%]│
├─────────────────────────────────────────────┬───────────────────────────┤
│                                             │                           │
│ LEFT CANVAS (~65%)                          │ RIGHT PANEL (~35%)        │
│                                             │                           │
│ ┌─ SCHOOL READINESS ──────────────────────┐ │ ┌─ DELEGATED TASKS ─────┐ │
│ │ Score: 72% ████████████░░░░             │ │ │ VP: 2 vazifa (jadval) │ │
│ │ [Maktab profili ✓] [Filial ✓]           │ │ │ Branch Admin: 3 vazifa│ │
│ │ [Dars soatlari ●] [Xonalar ●]           │ │ │ Accountant: 1 vazifa  │ │
│ │ [Sinflar ●] [Fanlar ●]                  │ │ │                       │ │
│ │ Click item → delegated owner detail     │ │ │ [Batafsil →]          │ │
│ └─────────────────────────────────────────┘ │ └─────────────────────────┘ │
│                                             │                           │
│ ┌─ APPROVALS QUEUE (preview) ─────────────┐ │ ┌─ ACADEMIC RISK ───────┐ │
│ │ ● Ta'til: 8 ta (3 ta muhim)             │ │ │ ● 2 ta sinf davomat   │ │
│ │ ● Intizom: 4 ta                         │ │ │   70% dan past        │ │
│ │ [Barchasini ko'rish →]                  │ │ │ ● 15 ta o'quvchi      │ │
│ └─────────────────────────────────────────┘ │ │   xavf zonasida       │ │
│                                             │ │ [Batafsil →]          │ │
│ ┌─ BRANCH HEALTH MAP ─────────────────────┐ │ └─────────────────────────┘ │
│ │ Chilonzor  ████████░░ 82%  ●            │ │                           │
│ │ Yunusobod  ██████████░ 91%  ●           │ │ ┌─ FINANCE PULSE ───────┐ │
│ │ Sergeli    ██████░░░░ 64%  ●●           │ │ │ Oylik: 245M / 280M    │ │
│ │ [Solishtirish →]                        │ │ │ Qarzdorlik: 42M       │ │
│ └─────────────────────────────────────────┘ │ │ [Moliya →]            │ │
│                                             │ └─────────────────────────┘ │
│ ┌─ ACADEMIC SNAPSHOT ─────────────────────┐ │                           │
│ │ Davomat: 94.2% ▲ | Sinflar: 24 |        │ │ ┌─ QUICK ACTIONS ───────┐ │
│ │ Imtihon: 14 kun                           │ │ │ [Tasdiqlash] [E'lon]  │ │
│ │ [Hisobotlar →]                          │ │ │ [Xodim qo'shish]      │ │
│ └─────────────────────────────────────────┘ │ │ [Ish haqi →]          │ │
│                                             │ │ [Filial →]            │ │
│ ┌─ STAFF OVERVIEW ────────────────────────┐ │ └─────────────────────────┘ │
│ │ O'qituvchilar: 48 | Xodimlar: 12        │ │                           │
│ │ Ta'til so'rovlar: 8 | Intizom: 4        │ │ ┌─ ACTIVITY STREAM ─────┐ │
│ │ [Xodimlar →]                            │ │ │ • VP jadval nashr etdi│ │
│ └─────────────────────────────────────────┘ │ │ • Branch Admin sinf   │ │
│                                             │ │   qo'shdi             │ │
│ ┌─ RECENT ALERTS (top 3) ─────────────────┐ │ │ • Accountant ish haqi │ │
│ │ ● Jadval nashr etilmagan (VP)           │ │ │   hisobladi           │ │
│ │ ● Xonalar ro'yxati bo'sh (Branch Admin) │ │ └─────────────────────────┘ │
│ │ ● Ish haqi hisoblanmagan (Accountant)   │ │                           │
│ │ [Barchasi →]                            │ │ ┌─ SMART INSIGHTS ──────┐ │
│ └─────────────────────────────────────────┘ │ │ │ AI: Davomat pasayish  │ │
│                                             │ │ │ tendensiyasi aniqlandi│ │
│                                             │ │ └─────────────────────────┘ │
├─────────────────────────────────────────────┴───────────────────────────┤
│ QUICK ACTION DOCK (bottom-right, floating)                              │
│ [E'lon yaratish] [Tasdiqlash] [Xodim qo'shish] [Hisobot] [Moliya]      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Dashboard Section Specifications

| Section | Data Source | Owner | Interaction |
|---------|-------------|-------|-------------|
| **School Readiness** | `/schools/{id}/readiness` | Director (school profile + branches) | Click item → show delegated owner + progress + escalate button |
| **Approvals Queue** | `/ops/alerts` + leave/discipline APIs | Director | Inline approve/reject; click → full approvals inbox |
| **Branch Health Map** | `branchesApi.getAll()` + aggregated metrics | Director | Click branch → right panel with branch detail |
| **Academic Snapshot** | `attendanceApi`, `classesApi`, `examsApi` | Director (oversight) | Click → Reports → Davomat/Baholar tabs |
| **Staff Overview** | `usersApi`, `leaveRequestsApi`, `disciplineApi` | Director | Click → Xodimlar page |
| **Delegated Tasks** | `/schools/{id}/readiness/role` | VP / Branch Admin / Accountant | Shows incomplete items by role with owner name |
| **Academic Risk** | `aiAnalyticsApi.getDashboard()` | Director (oversight) | Click → Insights or Reports |
| **Finance Pulse** | `financeApi`, `paymentsApi` | Director (oversight) | Click → Moliya page |
| **Recent Alerts** | `/ops/alerts` | All roles | Click → Alerts center |
| **Activity Stream** | Audit log / recent events | All roles | Click → event detail |
| **Smart Insights** | `aiAnalyticsApi` | AI-generated | Click → insight detail + recommended action |

---

## 8. Quick Actions Matrix

### 8.1 Current Quick Actions (Ops Center)

Director sees 11 actions: Jadvalni ko'rish, Avto-jadval yaratish, O'rinbosar belgilash, Davomatni ko'rish, Ish haqini ko'rish, Tayyorlikni tekshirish, Moliyani ko'rish, To'lovlarni ko'rish, Tariflarni ko'rish, Hisobotlarni ko'rish, Eksport markazi.

**Problem:** Too many operational actions. "Avto-jadval yaratish" and "O'rinbosar belgilash" are VP/Branch Admin tasks.

### 8.2 Proposed Quick Actions

| Action | Icon | Route | Rationale |
|--------|------|-------|-----------|
| **Tasdiqlash** | FileText | `/dashboard/approvals` | Primary Director workflow |
| **E'lon yaratish** | Megaphone | Modal → `/dashboard/announcements` | Strategic communication |
| **Xodim qo'shish** | Users | `/dashboard/users/new` | Director creates VP/Branch Admin |
| **Filial qo'shish** | Building2 | `/dashboard/branches/new` | Director owns branches |
| **Ish haqi ko'rish** | Award | `/dashboard/payroll` | Director approves payroll |
| **Hisobotlar** | BarChart3 | `/dashboard/reports` | Executive intelligence |
| **Moliya** | TrendingUp | `/dashboard/finance` | Finance oversight |
| **Operatsion markaz** | Activity | `/dashboard/ops` | Daily pulse |

**Removed:** Avto-jadval yaratish, O'rinbosar belgilash, Davomatni ko'rish, To'lovlarni ko'rish, Tariflarni ko'rish, Eksport markazi, Tayyorlikni tekshirish (redundant with dashboard readiness card).

---

## 9. Command Palette Curation

### 9.1 Current State

Command palette shows **43 items** for Director, including noisy operational pages.

### 9.2 Proposed Director Cmd+K Items

| # | Label | Href | Why Keep |
|---|-------|------|----------|
| 1 | Dashboard | `/dashboard` | Primary landing |
| 2 | Operatsion markaz | `/dashboard/ops` | Daily pulse |
| 3 | Tasdiqlash inbox | `/dashboard/approvals` | Core workflow |
| 4 | Ogohlantirishlar | `/dashboard/alerts` | Oversight |
| 5 | Filiallar | `/dashboard/branches` | Branch management |
| 6 | Xodimlar | `/dashboard/staff` | Staff management |
| 7 | Foydalanuvchilar | `/dashboard/users` | User management |
| 8 | Dars jadvali | `/dashboard/schedule` | Oversight |
| 9 | Baholar | `/dashboard/grades` | Oversight |
| 10 | Davomat | `/dashboard/attendance` | Oversight |
| 11 | Moliya | `/dashboard/finance` | Executive |
| 12 | Ish haqi | `/dashboard/payroll` | Approval |
| 13 | Hisobotlar | `/dashboard/reports` | Executive |
| 14 | KPI Dashboard | `/dashboard/kpi` | Executive |
| 15 | Sozlamalar | `/dashboard/settings` | System |
| 16 | Audit Log | `/dashboard/audit-log` | Compliance |
| 17 | Profil | `/dashboard/profile` | Personal |

**Removed from Cmd+K:** Sinflar, Fanlar, Imtihonlar, Uy vazifalari, To'garaklar, Ta'til so'rovlar (redundant with Approvals), Intizom, O'qituvchi almashtirish, Do'kon boshqaruvi, O'quvchilar, CRM, Kommunikatsiya, Bildirishnomalar, E'lonlar, Xabarlar, Marketing, Jadval analitikasi, Eksport markazi, O'quv yuklamalari, Resurslar, Kutubxona, EduCoin, Transport, Akademik kalendar.

**Rationale:** If a page is hidden from sidebar AND not a high-frequency destination, it should not be in Cmd+K either. Cmd+K is for rapid navigation to high-value surfaces, not a exhaustive route list.

---

## 10. RBAC Consistency Notes

### 10.1 Principle: UX Curation ≠ Permission Reduction

All backend `@Roles()` decorators remain unchanged. Director still legally CAN access every route they currently can. The changes are purely frontend navigation curation:
- Sidebar items are removed from `DIRECTOR_NAV`
- Command palette items are filtered out
- Dashboard redirect is removed so Director lands on their own dashboard

**If a Director needs to access a hidden page**, they can:
1. Use the direct URL (e.g., `/dashboard/classes`)
2. Be linked from an alert or delegated task card
3. Use Cmd+K if we keep the item there (but we propose removing it)

### 10.2 Edge Cases

| Scenario | Handling |
|----------|----------|
| Director clicks alert about "Sinflar yaratilmagan" | Alert CTA routes to `/dashboard/classes` — backend allows, page renders |
| Director manually types `/dashboard/subjects` | Backend allows, page renders |
| Director is also acting as VP (future role switching) | Future enhancement; for now, use direct URL |
| Setup wizard delegation tracker needs `/dashboard/setup` | Readiness card shows "Topshirilgan vazifalar" with links to setup steps |

### 10.3 Frontend Route Guard Safety

`canAccessRoute()` in `permissions.ts` and `middleware.ts` are NOT affected. Director retains access to all 40+ routes. Only `DIRECTOR_NAV` and `NAV_ITEMS` (command palette) are curated.

---

## 11. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Director can't find hidden pages when needed | Medium | Hidden pages remain accessible via direct URL and alert CTAs. Add "Barcha sahifalar" toggle in settings for power users. |
| Team members confused by nav differences | Low | Nav is already role-based. Director nav change is documented here. |
| `/dashboard/ops` redirect removal breaks VP/Branch Admin/Accountant flow | Medium | Only remove `director` from `OPS_REDIRECT_ROLES`. Other roles still redirect. |
| Dashboard redesign is large scope | High | Implement in 3 phases (see §12). Phase 1 is nav curation only — immediate value. |
| Existing `DirectorDashboard` component is stale (626 lines) | Medium | Audit component for API compatibility before reactivating. Most APIs are already used in `/dashboard/ops`. |
| Finance tabs (To'lovlar, Ish haqi, Tariflar) unclear inside Moliya | Medium | Verify Finance page has clear tab navigation. If not, add Moliya sub-pages to sidebar under "Moliya" group. |
| Missing `Foydalanuvchilar` in sidebar was intentional | Low | Verify with stakeholders. Adding it aligns with Director's user creation privileges. |

---

## 12. Implementation Phases

### Phase 1: Navigation Curation (1–2 days)
**Goal:** Immediate clutter reduction. No new components.

- [ ] Remove `director` from `OPS_REDIRECT_ROLES` in `dashboard/page.tsx`
- [ ] Rewrite `DIRECTOR_NAV` in `navigation.ts` (5 groups, ~14 items)
- [ ] Add missing items: `Foydalanuvchilar`, `Ish haqi`, `KPI Dashboard`
- [ ] Remove items: Maktab sozlash, Sinflar, Fanlar, Imtihonlar, To'garaklar, Intizom, O'qituvchi almashtirish, Do'kon boshqaruvi, O'quvchilar, CRM, Kommunikatsiya, Bildirishnomalar, Jadval analitikasi, Akademik kalendar
- [ ] Filter `NAV_ITEMS` in `command-palette.tsx` for Director (keep ~17 items)
- [ ] Update sidebar group collapse defaults for new structure
- [ ] Update mobile nav (inherits from `getNavForRole`)
- [ ] Update header dropdown quick links if needed
- [ ] Smoke test: build passes, nav renders, no 404s

### Phase 2: Dashboard Restoration (2–3 days)
**Goal:** Make `/dashboard` the Director landing page.

- [ ] Audit `director-dashboard.tsx` for API compatibility
- [ ] Remove or conditionally disable redirect to `/dashboard/ops`
- [ ] Ensure `DirectorDashboard` renders correctly on `/dashboard`
- [ ] Add link from dashboard to `/dashboard/ops` ("Operatsion markazga o'tish")
- [ ] Test: Director lands on dashboard, can navigate to ops

### Phase 3: Dashboard Redesign (1–2 weeks)
**Goal:** Executive-focused dashboard with delegated task tracking.

- [ ] Build `SchoolReadinessCard` (delegation-aware, shows owner + progress)
- [ ] Build `ApprovalsPreview` (top 5 pending, inline actions)
- [ ] Build `BranchHealthMap` (reuse existing or enhance)
- [ ] Build `DelegatedTasksPanel` (grouped by VP / Branch Admin / Accountant)
- [ ] Build `AcademicRiskSummary` (from AI analytics)
- [ ] Build `FinancePulse` (compact, from Finance API)
- [ ] Build `StaffOverview` (teacher/staff counts + pending leaves)
- [ ] Build `RecentAlertsStrip` (top 3 critical)
- [ ] Update `QuickActionDock` (curated actions)
- [ ] Wire all sections to existing APIs
- [ ] Add empty states and loading skeletons
- [ ] Responsive testing

### Phase 4: Ops Center Cleanup (2–3 days)
**Goal:** Align Ops Center with new Director mental model.

- [ ] Curate `QuickActionsBar` in ops center (remove operational actions)
- [ ] Enhance `ReadinessScoreCard` with delegation tracker
- [ ] Add "My Approvals" preview to ops center
- [ ] Ensure ops center remains primary landing for VP/Branch Admin/Accountant

### Phase 5: Polish & Validation (2–3 days)
**Goal:** Stakeholder sign-off and edge case handling.

- [ ] Director user journey walkthrough
- [ ] Verify all hidden pages remain accessible via URL
- [ ] Test alert CTAs route correctly
- [ ] Test command palette curation
- [ ] Test mobile nav
- [ ] Update documentation
- [ ] Commit and deploy

---

## 13. References

- `docs/OPS_OWNERSHIP_MATRIX.md` — Ownership matrix for readiness, alerts, friction signals
- `docs/DIRECTOR_WORKSPACE_ARCHITECTURE.md` — 7-zone workspace design (Situation Bar, Strategic Overview, Intelligence Feed, etc.)
- `docs/DIRECTOR_VISUAL_LANGUAGE.md` — Density system, interaction energy, grouping without borders
- `apps/frontend/src/config/navigation.ts` — Current `DIRECTOR_NAV`
- `apps/frontend/src/config/permissions.ts` — `ROUTE_PERMISSIONS` and `canAccessRoute()`
- `apps/frontend/src/app/(dashboard)/dashboard/page.tsx` — Dashboard redirect logic
- `apps/frontend/src/app/(dashboard)/dashboard/_components/director-dashboard.tsx` — Existing Director dashboard component
- `apps/backend/src/modules/ops-command-center/ops-command-center.service.ts` — Readiness logic with ownership
- `apps/backend/src/modules/health/ops-dashboard.controller.ts` — Role-specific dashboard data

---

> **Note:** This plan is UX-curation only. No backend permission changes are proposed. Director retains full legal access to all routes. The goal is to reduce cognitive overload by surfacing only executive-relevant navigation while keeping operational pages accessible via direct URLs, alert CTAs, and delegated task links.
