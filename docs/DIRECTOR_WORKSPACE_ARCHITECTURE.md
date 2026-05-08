# Xedu Director Workspace Architecture
## Institutional Command Center Design

---

## 1. Workspace Zones

The Director workspace is organized into 7 distinct zones. Each zone has a specific purpose, density level, and interaction model.

### 1.1 Situation Bar (Top Zone)
**Purpose:** Situational awareness at a glance  
**Height:** 56–64px, persistent  
**Density:** High  
**Position:** Below header, above main canvas  

**Contents:**
- **Branch Context Switcher** — active branch with health indicator dot (green/yellow/red)
- **Alert Summary** — "5 ta yangi ogohlantirish" with severity badge
- **Approval Queue** — "12 ta tasdiqlash kutilmoqda" with count
- **AI Risk Signals** — "2 ta xavf signal" when present
- **Academic Context** — current semester, days until exams
- **System Status** — platform availability indicator

**Behavior:**
- Always visible
- Collapsible on scroll (shows compact mode with just dots/counts)
- Color-coded: red = immediate attention, yellow = within 24h, green = nominal
- Clicking any item opens relevant zone (alerts → alert center, approvals → approval inbox)

---

### 1.2 Strategic Overview Canvas (Center Zone)
**Purpose:** Executive briefing surface — the Director's primary work area  
**Width:** ~70% of viewport (responsive: full width on mobile)  
**Density:** Medium-High  

**Contents (top to bottom):**

#### A. Branch Health Map
- Visual status board of all branches
- Not a table — a spatial or card-based overview
- Each branch shows: name, student count trend, attendance status, finance status, staff status
- Color: green (healthy), amber (attention needed), red (intervention required)
- Click → opens Branch Detail in Right Contextual Panel

#### B. Financial Pulse
- Large, scannable number: current month revenue vs target
- Mini sparkline of last 6 months
- Outstanding payments total
- Click → opens Finance Detail in Right Panel or full Finance page

#### C. Academic Snapshot
- Institution-wide attendance trend (simple line)
- Grade distribution overview (mini histogram)
- Upcoming assessment dates
- Click → opens Academic Detail

#### D. Staff Operations Status
- Open positions count
- Pending leave approvals
- Recent hires / departures
- Staff satisfaction indicator (if available)
- Click → opens Staff Detail

**Behavior:**
- Sections are collapsible
- Director can reorder sections (persisted)
- Each section has a "View Full Detail →" action
- Hover on any metric shows comparison to previous period

---

### 1.3 Intelligence Feed (Right Contextual Panel — default state)
**Purpose:** AI-generated insights and operational alerts  
**Width:** ~30% of viewport, 360px minimum  
**Density:** Medium  
**Position:** Right side, below Situation Bar

**Contents:**
- **AI Insights** (ranked by relevance): anomaly detection, trend predictions, resource optimization suggestions
- **This Week at a Glance**: upcoming deadlines, events, actions needed
- **Recent Activity Stream**: institution-wide log of significant events (approvals, transfers, announcements)
- **Operational Alerts**: filtered to Director-level severity

**Behavior:**
- Collapsible to icon strip
- Resizable by dragging left edge
- Content adapts based on what's selected in Center Zone
- New items animate in subtly (fade + slight translateY)

---

### 1.4 Quick Action Surface
**Purpose:** One-click access to common Director actions  
**Position:** Bottom-right floating or docked bar  
**Density:** Low  

**Contents:**
- Create Announcement
- Send Alert
- Approve Pending Items
- Schedule Meeting
- Generate Report
- Switch Branch

**Behavior:**
- Expandable FAB on mobile
- Horizontal dock on desktop
- Keyboard shortcuts: Cmd+1, Cmd+2, etc.
- Recent actions shown below for quick repeat

---

### 1.5 Comparison Workspace (Dedicated View)
**Purpose:** Side-by-side branch and metric comparison  
**Trigger:** "Compare" action from Branch Health Map or dedicated menu  
**Layout:** Full canvas, replaces Strategic Overview

**Contents:**
- 2–4 branch columns
- Metric rows: attendance, finance, academics, staff, satisfaction
- Heatmap cell coloring
- Trend mini-charts per cell
- Export and share actions

**Behavior:**
- Branch selector at top (add/remove branches)
- Metric selector (show/hide rows)
- Time period selector
- "Pin this comparison" for quick return

---

### 1.6 Approval Inbox (Dedicated View or Overlay)
**Purpose:** Centralized approval workflow  
**Layout:** Email-like inbox interface

**Contents:**
- List view: requester, type, amount (if applicable), urgency, age
- Preview pane: detail without leaving list
- Bulk action bar (appears on multi-select)
- Filter: type, branch, urgency, date range
- Sort: urgency, date, requester

**Types:**
- Leave requests
- Expense reimbursements
- Fee structure changes
- Staff role changes
- Branch budget transfers
- Procurement requests

**Behavior:**
- Bulk approve/reject with comment
- Delegate to Vice Principal
- Schedule for later
- Auto-approve rules (below threshold)

---

### 1.7 Alert Center (Dedicated View or Overlay)
**Purpose:** Centralized operational alert management  
**Layout:** Inbox-style with severity grouping

**Contents:**
- Grouped by: System, Academic, Financial, Security, AI-Generated
- Each alert: title, branch, severity, timestamp, suggested action
- Acknowledge / Dismiss / Escalate actions
- Alert detail with historical context

---

## 2. Director Homepage Structure

### Block Order (Top to Bottom)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (existing)                                           │
├─────────────────────────────────────────────────────────────┤
│ SITUATION BAR                                               │
│ [Branch●] [Alerts 5●] [Approvals 12] [AI 2] [Semester: II] │
├─────────────────────────────────────┬───────────────────────┤
│                                     │                       │
│ STRATEGIC OVERVIEW CANVAS           │ INTELLIGENCE FEED     │
│  (~70% width)                       │  (~30% width)         │
│                                     │                       │
│ ┌─────────────────────────────────┐ │ ┌───────────────────┐ │
│ │ BRANCH HEALTH MAP               │ │ │ AI Insights       │ │
│ │ [Chilonzor ●] [Yunusobod ●]     │ │ │ • Attendance drop │ │
│ │ [Sergeli ●●]  [Yakkasaroy ●]    │ │ │ • Revenue anomaly │ │
│ └─────────────────────────────────┘ │ └───────────────────┘ │
│                                     │                       │
│ ┌─────────────────────────────────┐ │ ┌───────────────────┐ │
│ │ FINANCIAL PULSE                 │ │ │ This Week         │ │
│ │ ₤245,000,000 / ₤280,000,000     │ │ │ • Exam week starts│ │
│ │ ████████████████████░░░░ 87%    │ │ │ • Fee deadline    │ │
│ │ Outstanding: ₤42M               │ │ │ • Staff meeting   │ │
│ └─────────────────────────────────┘ │ └───────────────────┘ │
│                                     │                       │
│ ┌─────────────────────────────────┐ │ ┌───────────────────┐ │
│ │ ACADEMIC SNAPSHOT               │ │ │ Activity Stream   │ │
│ │ Attendance: 94.2% ▲             │ │ │ • VP approved...  │ │
│ │ Grades: ████████░░ 4.2/5        │ │ │ • Branch 3 added..│ │
│ │ Next exam: 14 days              │ │ │ • System alert... │ │
│ └─────────────────────────────────┘ │ └───────────────────┘ │
│                                     │                       │
│ ┌─────────────────────────────────┐ │                       │
│ │ STAFF OPERATIONS                │ │                       │
│ │ Open: 3 | Pending leave: 7      │ │                       │
│ │ Turnover risk: 2 staff          │ │                       │
│ └─────────────────────────────────┘ │                       │
│                                     │                       │
├─────────────────────────────────────┴───────────────────────┤
│ QUICK ACTION SURFACE (floating or bottom dock)              │
│ [Announce] [Alert] [Approve] [Report] [Meeting] [Switch]    │
└─────────────────────────────────────────────────────────────┘
```

### Density Rules

| Zone | Density | Rationale |
|------|---------|-----------|
| Situation Bar | High | At-a-glance, no scrolling |
| Branch Health | Medium-High | Overview + drill-down affordance |
| Financial Pulse | Medium | One big number + context |
| Academic Snapshot | Medium | Trends over tables |
| Staff Ops | Medium | Summary, not directory |
| Intelligence Feed | Medium | Scannable list |
| Quick Actions | Low | Immediate recognition |

### Interaction Style by Block

| Block | Primary Action | Secondary Action | Detail View |
|-------|---------------|------------------|-------------|
| Branch Health Map | Click branch card | Hover for mini preview | Right Panel → Branch Detail |
| Financial Pulse | Click for full finance | Hover for month breakdown | Right Panel → Finance Detail |
| Academic Snapshot | Click for academics | Hover for class breakdown | Full Page → Academic Reports |
| Staff Ops | Click for staff list | Hover for dept preview | Right Panel → Staff Detail |
| AI Insights | Click for full insight | Dismiss / Pin | Right Panel → Insight Detail |
| Activity Stream | Click event | — | Right Panel → Event Detail |

---

## 3. Interaction Model

### Opens in Modal
- Confirmation dialogs ("Tasdiqlaysizmi?")
- Quick create: announcement, note, reminder
- Simple detail preview (student card, staff card)
- Branch switcher (quick switch, not full navigation)

### Opens in Right Contextual Panel
- Branch detail view
- Approval detail + action form
- Staff member profile
- Financial report detail
- Analytics drill-down
- AI insight explanation + recommended actions
- Event / activity detail

**Panel behavior:**
- Slides in from right (300ms, ease-out)
- Pushes content left (or overlays on tablet)
- Has tabs for different aspects
- Close via X, Escape, or clicking outside
- Previous panel state remembered during session

### Opens in Full Page
- Branch Comparison Workspace
- Detailed financial reports
- Staff management directory
- Academic calendar planning
- Fee structure management
- Settings / configuration
- Bulk operations interface
- Report builder / export

### Supports Bulk Actions
- Approval Inbox (bulk approve / reject / delegate)
- Announcements (bulk send to selected branches)
- Staff (bulk transfer between branches, bulk role change)
- Financial (bulk invoice generation, bulk payment reminders)
- Alerts (bulk acknowledge)

**Bulk action UI:**
- Checkbox per row
- Floating toolbar appears on selection (bottom of viewport)
- Toolbar shows count + available actions
- Actions contextually filtered by selection type

### Supports Drill-Down Navigation
```
Director Home
  → Branch Health Map
    → Click Branch
      → Right Panel: Branch Overview
        → Click Finance Tab
          → Right Panel: Branch Finance Detail
            → Click "View Full Report"
              → Full Page: Branch Financial Report
                → Click Export
                  → Modal: Export Options
```

---

## 4. Workspace Philosophy

### Director vs Teacher

| Dimension | Director | Teacher |
|-----------|----------|---------|
| **Time horizon** | Weekly / Monthly / Semester | Daily / Lesson |
| **Scope** | Institution-wide, multi-branch | Single class, single branch |
| **Decision type** | Strategic, approval, resource allocation | Operational, instructional, evaluative |
| **Primary question** | "Is everything running correctly?" | "What do I teach today?" |
| **Data needs** | Trends, comparisons, anomalies | Individual student data, lesson plans |
| **Interaction frequency** | Several times per day, brief sessions | Continuous throughout day |
| **UI metaphor** | Command center, briefing room | Workbench, classroom |

### Director vs Accountant

| Dimension | Director | Accountant |
|-----------|----------|------------|
| **Focus** | Financial health and trends | Transaction accuracy and compliance |
| **Granularity** | Institution, branch level | Transaction, invoice level |
| **Action** | Approve budgets, set targets | Process payments, reconcile accounts |
| **Primary question** | "Are we financially healthy?" | "Did every payment process correctly?" |
| **UI metaphor** | Financial dashboard, investment terminal | Ledger, accounting software |

### Why Strategic Layout

The Director does not operate the institution — the Director governs it.

**Operational UI (what we currently have):**
- Sidebar with all possible links
- Dashboard with equal-weight widgets
- Everything is a CRUD table
- User must know what they're looking for

**Strategic UI (what we need):**
- Information presented as situational awareness
- System surfaces what needs attention
- Actions are contextual to the insight
- Layout guides decision-making, not just navigation

**Key shift:** From "browse and find" to "surface and act."

---

## 5. Operational UX Improvements

### 5.1 Whitespace Problems

**Current:**
- Too much padding between unrelated widgets
- Not enough visual grouping within related information
- Empty space feels accidental, not intentional

**Fix:**
- Tighter grouping within zones (8–12px gaps between related items)
- Generous space between zones (48–64px) to create clear mental separation
- Use background tonal shifts instead of borders to define zones

### 5.2 Density Problems

**Current:**
- Uniform density across all widgets
- KPI cards have same visual weight as tables
- No hierarchy of importance

**Fix:**
- Variable density: critical numbers are large and sparse, detailed lists are compact
- Use size, color intensity, and position to signal importance
- Most important information gets the most whitespace around it

### 5.3 Missing Interactions

| Missing Pattern | Impact |
|-----------------|--------|
| Contextual right panel | User must navigate away to see details |
| Command palette (Cmd+K) | Power users cannot navigate efficiently |
| Bulk actions | Approving 20 leave requests takes 20 clicks |
| Comparison mode | Cannot compare branches side-by-side |
| Pin/follow-up | Cannot mark items for later review |
| Annotation on data | Cannot add notes to reports |
| Activity timeline | No sense of what happened recently |
| Smart defaults | Branch switcher always shows full list |

### 5.4 Missing Enterprise Patterns

| Pattern | Description | Priority |
|---------|-------------|----------|
| Floating bulk toolbar | Appears on multi-select with contextual actions | High |
| Right contextual panel | Slide-in detail without navigation | High |
| Comparison drawer | Bottom panel for 2–4 way comparison | Medium |
| Command/search palette | Cmd+K for universal search + quick actions | High |
| Activity timeline | Chronological institution events | Medium |
| Pinned widgets | Director-customizable homepage sections | Medium |
| Alert center | Centralized alert inbox with severity | High |
| Approval inbox | Email-like approval workflow | High |
| Operational heatmap | Branch × Metric matrix with color coding | Medium |
| Branch switch intelligence | Smart branch switcher with health + recency | Medium |
| Smart notifications | "Approve all leaves under 3 days" | Low |
| Operational scorecards | Branch-level balanced scorecard | Medium |

---

## 6. Enterprise Patterns Specification

### 6.1 Floating Bulk Toolbar

```
┌────────────────────────────────────────┐
│  7 ta element tanlandi          [×]    │
│  [Tasdiqlash] [Rad etish] [Topshirish] │
└────────────────────────────────────────┘
```

- Appears: 8px from bottom, centered, when 2+ items selected
- Animates: translateY(20px) + opacity(0→1), 200ms ease-out
- Dismisses: clicking X, clicking outside, or deselecting all
- Contextual: actions change based on item type (leave → approve/reject, expense → approve/reject/req info)
- Mobile: full-width, fixed to bottom

### 6.2 Right Contextual Panel

```
┌──────────────────────────┬─────────────┐
│                          │ ┌─────────┐ │
│  Main Canvas             │ │ Branch  │ │
│                          │ │ Detail  │ │
│                          │ │         │ │
│                          │ │ Tabs:   │ │
│                          │ │ Overview│ │
│                          │ │ Finance │ │
│                          │ │ Staff   │ │
│                          │ │ Academic│ │
│                          │ └─────────┘ │
└──────────────────────────┴─────────────┘
```

- Width: 420px desktop, full-screen mobile
- Backdrop: slight darkening of main canvas (not modal-level)
- Tabs: scrollable if many
- History: can open panel within panel (breadcrumbs)
- Close: X button, Escape, swipe right on mobile, click backdrop

### 6.3 Comparison Drawer

```
┌──────────────────────────────────────────┐
│ Taqqoslash                    [×] [Full] │
├──────────┬──────────┬──────────┬─────────┤
│ Chilonzor│ Yunusobod│ Sergeli  │Yakkasar │
├──────────┼──────────┼──────────┼─────────┤
│ Davomat  │  94.2%   │  91.3%   │  88.7%  │
│          │    ●     │    ●     │    ●●   │
├──────────┼──────────┼──────────┼─────────┤
│ To'lov   │  96%     │  89%     │  82%    │
│          │    ●     │    ●     │    ●●   │
├──────────┼──────────┼──────────┼─────────┤
│ Baho     │  4.3     │  4.1     │  3.9    │
│          │    ●     │    ●     │    ●●   │
└──────────┴──────────┴──────────┴─────────┘
```

- Triggered from: Branch Health Map "Taqqoslash" or dedicated menu
- Opens as: bottom drawer (desktop) or full page (mobile)
- Branch selector: dropdown to add/remove branches (max 4)
- Metric selector: toggle rows on/off
- Time range: selector for comparison period
- Export: PDF/Excel button
- Cells: color-coded (green > institution avg, amber ±5%, red < -5%)

### 6.4 Command Palette (Cmd+K)

```
┌─────────────────────────┐
│  Qidirish yoki buyruq   │
│  > _                    │
├─────────────────────────┤
│  Tezkor harakatlar      │
│  • E'lon yaratish       │
│  • Tasdiqlash inboxi    │
│  • Hisobot yaratish     │
│  • Filial almashtirish  │
├─────────────────────────┤
│  So'nggi                │
│  • Chilonzor filiali    │
│  • Davomat hisoboti     │
│  • Xodimlar ro'yxati    │
├─────────────────────────┤
│  Qidirish natijalari    │
│  • Aziz Karimov (o'quv) │
│  • Matematika fani      │
│  • Dekabr oylik hisobot │
└─────────────────────────┘
```

- Trigger: Cmd+K (desktop), search icon (mobile)
- Categories: Quick Actions, Recent, Search Results, Navigation
- Typeahead search across: branches, staff, students, reports, pages
- Action execution without navigation where possible
- History: last 10 actions

### 6.5 Activity Timeline

- Layout: vertical timeline, right side of Intelligence Feed or dedicated panel
- Grouping: Today, Yesterday, This Week, Earlier
- Event types: Approval, Transfer, Alert, System, User Action
- Each event: icon + actor + action + target + time
- Filter: by branch, type, actor
- Click: open detail in Right Panel

### 6.6 Pinned Widgets

- Director can pin any report view, branch detail, or metric to homepage
- Pinned items appear in Strategic Overview Canvas
- Can be reordered via drag
- Persisted across sessions
- Maximum 6 pinned widgets

### 6.7 Alert Center

- Dedicated view, accessible from Situation Bar
- Grouped by: System, Academic, Financial, Security, AI
- Severity: Critical (red), Warning (amber), Info (slate)
- Each alert: title + branch + time + suggested action
- Bulk: acknowledge all, dismiss all by type
- Auto-clear: info alerts after 7 days

### 6.8 Approval Inbox

- Email-like layout: list left, preview right
- Columns: Requester | Type | Amount | Branch | Urgency | Age
- Urgency: Overdue (red), Today (amber), Later (slate)
- Actions per item: Approve, Reject, Request Info, Delegate
- Bulk actions: Approve Selected, Reject Selected
- Filters: Type, Branch, Urgency, Date Range
- Default sort: Urgency desc, then Date asc

### 6.9 Operational Heatmap

- Matrix view: Branches (rows) × Metrics (columns)
- Cells: color intensity based on performance vs target
- Click cell → drill to detail
- Hover → tooltip with exact value + trend
- Export as image or data

### 6.10 Branch Switch Intelligence

```
┌─────────────────────────────────┐
│ Aktiv filial                    │
├─────────────────────────────────┤
│ ● Chilonzor       [Sog'lom]     │
│ ● Yunusobod       [Sog'lom]     │
│ ●● Sergeli        [E'tibor]     │ ← amber dot
│ ● Yakkasaroy      [Sog'lom]     │
│ ─────────────────────────────── │
│ So'nggi:                        │
│ → Yunusobod (2 soat oldin)      │
│ → Sergeli (kecha)               │
└─────────────────────────────────┘
```

- Smart ordering: recently visited + attention-needed first
- Health dot: green/amber/red per branch
- Quick stats: student count, today's attendance
- One-click switch without full page reload

---

## 7. Implementation Priority

### Phase 1: Foundation (Week 1)
1. Situation Bar component
2. Right Contextual Panel infrastructure
3. Strategic Overview Canvas layout
4. Branch Health Map

### Phase 2: Intelligence (Week 2)
5. Intelligence Feed
6. AI Insights integration
7. Activity Timeline
8. Alert Center

### Phase 3: Action (Week 3)
9. Approval Inbox
10. Quick Action Surface
11. Floating Bulk Toolbar
12. Command Palette

### Phase 4: Comparison (Week 4)
13. Comparison Drawer
14. Operational Heatmap
15. Branch Switch Intelligence
16. Pinned Widgets

---

## 8. Technical Notes

### State Management
- Panel state: URL query params (`?panel=branch&id=123`) for shareability
- Pinned widgets: localStorage + backend sync
- Comparison state: URL hash for shareable comparisons

### Performance
- Overview data: cached for 60 seconds
- Panel detail: fetched on demand
- Activity timeline: paginated, real-time updates via SSE

### Responsive Behavior
- Desktop: Full 7-zone layout
- Tablet: Collapsible side panel, stacked zones
- Mobile: Single column, Situation Bar compact, Bottom sheet for panels

---

*Document version: 1.0*  
*Status: Architecture Design — Ready for Implementation Planning*
