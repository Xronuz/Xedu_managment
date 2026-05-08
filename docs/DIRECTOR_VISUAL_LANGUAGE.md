# Xedu Director Workspace — Visual & Interaction Language
## Enterprise Operational Design System

---

## 0. Core Philosophy

> The Director workspace is not a dashboard. It is an institutional operating environment.

**What this means visually:**
- Information is always active, never decorative
- Every element earns its place through utility
- Density is strategic, not uniform
- Whitespace is structural, not ornamental
- Interactions are immediate, not theatrical
- The interface feels alive because data is live

**Visual references (mental model):**
- **Linear** — calm density, purposeful restraint, no decorative chrome
- **Stripe Dashboard** — operational clarity, dense data surfaces, contextual actions
- **Bloomberg Terminal** — always-on information, compact layouts, live indicators
- **SAP Fiori** — list-detail workflows, enterprise patterns, task-oriented
- **Apple Internal Tools** — precision, tonal hierarchy, zero visual noise

**Anti-references (what we avoid):**
- Crypto dashboards with neon glows and percentage tickers
- Dribbble concepts with floating 3D elements and glassmorphism
- Consumer SaaS with oversized illustrations and playful empty states
- Generic admin templates with card grids and chart widgets

---

## 1. Density System

### 1.1 The Density Gradient

Enterprise interfaces do not have uniform density. Density is a tool for controlling attention.

```
DENSITY SPECTRUM

ULTRA-COMPACT          COMPACT              MEDIUM                SPACIOUS
├─ Situation Bar       ├─ Data tables       ├─ Overview cards      ├─ Hero numbers
├─ Activity lists      ├─ Filter bars       ├─ Branch maps         ├─ Section headers
├─ Timeline items      ├─ Inbox rows        ├─ Insight cards       ├─ Primary actions
├─ Status badges       ├─ Tab bars          ├─ Form fields         ├─ Empty states
```

### 1.2 Zone-by-Zone Density Rules

| Zone | Density | Padding | Gap | Rationale |
|------|---------|---------|-----|-----------|
| **Situation Bar** | Ultra-compact | py-2 px-4 | gap-3 | Always visible, must scan in <1s |
| **Data Tables** | Compact | py-2.5 px-3 | — | Maximum rows per viewport |
| **Inbox Lists** | Compact | py-3 px-4 | gap-0.5 | Email-like scanability |
| **Overview Cards** | Medium | p-5 | gap-4 | Breathing room for key numbers |
| **Detail Panels** | Medium | p-5 | gap-5 | Comfortable reading + action space |
| **Action Areas** | Spacious | p-6 | gap-4 | Clear affordance, no misclicks |
| **Section Dividers** | Spacious | py-12 | — | Mental reset between zones |

### 1.3 Strategic Whitespace Rules

**Whitespace is never "leftover." It is always structural.**

**Rule 1: Tight Inside, Loose Between**
- Elements WITHIN a group: 4–8px gaps
- Groups WITHIN a zone: 12–16px gaps
- Zones ON the canvas: 32–48px gaps
- This creates implicit grouping without borders

**Rule 2: Directional Whitespace**
- More space ABOVE important elements (they "sit" in their space)
- Less space BELOW supporting elements (they "lead into" the next)
- Asymmetric padding: `pt-6 pb-3` for headers, `pt-3 pb-6` for conclusions

**Rule 3: Informational Breathing**
- After 3–4 dense rows, insert 16px visual break
- After a major section, insert 48px break
- Never stack more than 7 compact items without a break

**Rule 4: Active vs Passive Space**
- Active space: around interactive elements (buttons, inputs, links)
- Passive space: around display elements (text, numbers, status)
- Active space = 1.5x passive space

### 1.4 Grouping Without Borders

Enterprise interfaces use background tonal shifts instead of visible borders.

```
GROUPING HIERARCHY

Level 1 — Page Zone:        background tonal shift (white → #FAFBFB)
Level 2 — Section:          subtle background shift (#FAFBFB → #F7F8F8)
Level 3 — Card/Panel:       no border, soft shadow (0 1px 3px rgba(0,0,0,0.04))
Level 4 — Inner Group:      8px gap + aligned left edge
Level 5 — Item Row:         1px separator line at 6% opacity
```

**Key principle:** If you can group elements by proximity and alignment, you don't need a border.

---

## 2. Interaction Energy

### 2.1 The Energy Gradient

Not all interactions need the same visual weight. Energy should match importance.

```
ENERGY SPECTRUM

PASSIVE                REACTIVE              ACTIVE                 URGENT
├─ Default state       ├─ Hover              ├─ Selected             ├─ Alert/Warning
├─ Display text        ├─ Focus ring         ├─ Active tab           ├─ Pending approval
├─ Static numbers      ├─ Cursor change      ├─ Bulk toolbar         ├─ Overdue item
├─ Background          ├─ Subtle lift        ├─ Panel open           ├─ Critical alert
```

### 2.2 Hover Behavior

**Rule: Hover should reveal intent, not transform the element.**

| Element Type | Hover Behavior | Duration | Easing |
|-------------|----------------|----------|--------|
| **Data rows** | Background tint (#F8FAFC), cursor pointer | 100ms | ease-out |
| **Action buttons** | Background darken 5%, subtle lift (translateY -1px) | 120ms | ease-out |
| **Cards** | Shadow deepen (sm → md), NO border color change | 150ms | ease |
| **Text links** | Color darken + underline appear | 100ms | ease |
| **Icon buttons** | Background fill appear, icon color intensify | 100ms | ease-out |
| **Tab items** | Background tint + text color shift | 100ms | ease |

**Forbidden hover behaviors:**
- Scale transforms on cards (feels like a toy)
- Glow effects (feels like crypto)
- Border color changes (too aggressive)
- Background color inversions (too dramatic)

### 2.3 Selected / Active States

**Selected row (table, list, inbox):**
```
- Background: #F0FDF4 (primary-muted, 4% opacity)
- Left border: 2px solid primary (emerald)
- Text: inherit (no color change)
- Shadow: none
- Transition: 100ms
```

**Active tab:**
```
- Text: primary color
- Bottom indicator: 2px solid primary
- Background: subtle tint
- No bold weight change (keeps layout stable)
```

**Bulk-selected rows:**
```
- Checkbox: checked state
- Row background: #F0FDF4
- Batch count appears in floating toolbar
- Non-selected rows: opacity 0.6 (focus attention)
```

### 2.4 Contextual Actions

**Pattern: Actions appear on hover, not permanently.**

```
DEFAULT ROW STATE:
┌────────────────────────────────────────────────────────┐
│ Aziz Karimov    9-A    87%    ● E'tibor    [   ]     │
└────────────────────────────────────────────────────────┘

HOVER ROW STATE:
┌────────────────────────────────────────────────────────┐
│ Aziz Karimov    9-A    87%    ● E'tibor    [✓]  [Ko'rish] [Xabar] │
└────────────────────────────────────────────────────────┘
```

**Rules:**
- Contextual actions appear on hover (desktop) or always visible (mobile)
- Maximum 3 inline actions per row
- Primary action is leftmost, destructive is rightmost
- Actions use icon-only buttons with tooltip labels
- On touch devices: long-press or swipe to reveal

### 2.5 Sticky Controls

**What should stick:**
- Situation Bar (top, always)
- Table header row (on scroll, within table container)
- Filter bar (when scrolling through long lists)
- Floating bulk toolbar (when items selected)
- Page title + primary action (on scroll, optional)

**What should NOT stick:**
- Sidebar (let the workspace breathe)
- Footer
- Secondary navigation
- Breadcrumbs

**Sticky behavior rules:**
- Sticky element gets subtle shadow on detach: `0 2px 8px rgba(0,0,0,0.04)`
- Transition from static to sticky: 0ms (instant, no animation)
- Background on sticky: solid white (never transparent)
- Z-index: clear hierarchy (bar > content > background)

### 2.6 Progressive Disclosure

**Pattern: Show summary, reveal detail on demand.**

**Level 1 — Summary (always visible):**
- Number + trend arrow
- Status badge
- One-line description

**Level 2 — Detail (hover or click):**
- Mini chart or breakdown
- Related metrics
- Quick action buttons

**Level 3 — Full Detail (panel or page):**
- Complete data
- Historical trends
- Related records
- Edit capabilities

**Example: Financial Pulse**
```
[L1] ₤245,000,000    ▲ 8%    /    ₤280,000,000 maqsad
      
[L2 hover] ┌─────────────────────────────────┐
           │ Yan  Feb  Mar  Apr  May  Iyn    │
           │ ███  ███  ██   ███  ███  ████   │
           │ Oylik: ₤245M    Qoldiq: ₤89M    │
           └─────────────────────────────────┘

[L3 click] → Full financial report page
```

### 2.7 Inline Actions

**Pattern: Act without leaving the current view.**

| Action | Inline Pattern |
|--------|---------------|
| Quick approve | Inline button → brief success state → row fades or updates |
| Quick reject | Inline button → reason dropdown → confirm → update |
| Assign | Inline dropdown → select → save → update |
| Status change | Inline toggle or segmented control |
| Add note | Inline expand → textarea → save → collapse |
| Mark | Inline checkbox or star toggle |

**Rules:**
- Inline actions complete in <2 seconds
- On success: element updates in place (no page reload)
- On failure: inline error message, row stays in edit state
- Loading state: button text changes to spinner (no blocking overlay)

### 2.8 Quick Interactions

**Keyboard-first shortcuts:**
```
Cmd+K        → Command palette
Cmd+J        → Toggle Intelligence Feed
Cmd+/        → Toggle Situation Bar compact mode
J / K        → Navigate inbox items (vim-style)
Space        → Select / deselect item
Enter        → Open selected item in panel
E            → Quick approve (in inbox)
R            → Quick reject (in inbox)
Esc          → Close panel / deselect all
?            → Show keyboard shortcuts
```

**Mouse interactions:**
- Right-click → context menu with actions
- Double-click → open detail
- Click + Shift → add to selection
- Click + Cmd → toggle selection
- Drag rows → reorder pinned items

---

## 3. Workspace Mechanics

### 3.1 Floating Bulk Action Bar

```
Position: Fixed, bottom-center, 16px from edge
Width: Auto (fits content), max 600px
Animation: translateY(20px→0) + opacity, 200ms ease-out
Dismiss: Click X, deselect all, or press Esc

┌──────────────────────────────────────────────────┐
│  7 ta element tanlandi                    [×]    │
│  [Tasdiqlash]  [Rad etish]  [Topshirish]  [⋯]   │
└──────────────────────────────────────────────────┘
```

**Behavior:**
- Appears when 2+ items selected
- Actions contextually filtered by selection type
- Primary action is leftmost (most common)
- Overflow actions in "More" (⋯) dropdown
- On mobile: full-width, fixed to bottom

### 3.2 Sticky Filters

```
┌──────────────────────────────────────────────────────────────┐
│ Filtrlar                                                     │
│ [Barchasi ▼] [Sana ▼] [Filial ▼] [Holat ▼]     [Qidirish 🔍]│
├──────────────────────────────────────────────────────────────┤
│ [Sticky shadow appears here on scroll]                       │
│                                                              │
│ [Data rows...]                                               │
└──────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Filter bar sticks below Situation Bar when scrolling
- Active filters shown as removable pills
- Filter count badge on filter icon
- Clear all: one-click reset

### 3.3 Persistent Search

**Pattern: Search is always available, contextually scoped.**

```
Global:      Cmd+K → Command Palette (searches everything)
Page-level:  Search input in filter bar (searches current view)
Inline:      Type to filter dropdowns
```

**Search behavior:**
- Type: instant filtering (debounced 150ms)
- Results: highlight matching text
- No results: inline empty state with suggestion
- Recent searches: shown below input

### 3.4 Contextual Detail Panel

```
┌──────────────────────────┬───────────────────────┐
│                          │ ┌───────────────────┐ │
│  Main Canvas             │ │ Detail Panel      │ │
│                          │ │                   │ │
│  [List of branches]      │ │ Branch: Chilonzor │ │
│                          │ │                   │ │
│  ▶ Chilonzor    ●       │ │ Tabs:             │ │
│    Yunusobod    ●       │ │ [Overview]        │ │
│    Sergeli      ●●      │ │ [Finance]         │ │
│                          │ │ [Staff]           │ │
│                          │ │ [Academic]        │ │
│                          │ │                   │ │
│                          │ │ [Close]           │ │
│                          │ └───────────────────┘ │
└──────────────────────────┴───────────────────────┘
```

**Behavior:**
- Slides in from right: 300ms, cubic-bezier(0.16, 1, 0.3, 1)
- Main canvas: slight opacity reduction (0.7) or scaling (0.99)
- Panel width: 420px desktop, 100% mobile
- Panel header: sticky, with close + action buttons
- Panel content: scrollable independently
- Multiple panels: stack with breadcrumb trail
- Close: X button, Escape, swipe right (mobile), click backdrop

### 3.5 Split-View Workflow

**Pattern: List on left, detail on right — persistent.**

```
┌───────────────────────┬──────────────────────────┐
│ Inbox                 │ Preview / Action          │
├───────────────────────┼──────────────────────────┤
│ ● [✓] Leave req       │ Aziz Karimov             │
│   Maria K.    2h      │ Filial: Chilonzor        │
│   [Approve] [Reject]  │ Sana: 15-20 May          │
├───────────────────────┤ Sabab: Shifokor ko'rig'i │
│ ○ Leave req           │                          │
│   John D.     4h      │ [Tasdiqlash] [Rad etish] │
├───────────────────────┤ [Malumot so'rash]        │
│ ○ Expense             │                          │
│   Sarah L.    1d      │                          │
└───────────────────────┴──────────────────────────┘
```

**Use for:** Approval Inbox, Alert Center, Activity Timeline

**Rules:**
- Left pane: 40% width, scrollable list
- Right pane: 60% width, detail + actions
- Selection persists when scrolling
- Mobile: List → Detail → Back navigation

### 3.6 Comparison Mode

**Pattern: Bottom drawer or full-screen overlay for multi-item comparison.**

```
┌───────────────────────────────────────────────────────┐
│ Taqqoslash                                [×] [Full]  │
├────────────┬────────────┬────────────┬───────────────┤
│            │ Chilonzor  │ Yunusobod  │ Sergeli       │
├────────────┼────────────┼────────────┼───────────────┤
│ Davomat    │ 94.2%  ●   │ 91.3%  ●   │ 88.7%  ●●     │
├────────────┼────────────┼────────────┼───────────────┤
│ To'lov     │ 96%    ●   │ 89%    ●   │ 82%    ●●     │
├────────────┼────────────┼────────────┼───────────────┤
│ Baho       │ 4.3    ●   │ 4.1    ●   │ 3.9    ●●     │
└────────────┴────────────┴────────────┴───────────────┘
```

**Behavior:**
- Triggered from Branch Health Map or menu
- Desktop: bottom drawer (50% height), expandable to full
- Mobile: full-screen modal
- Branch selector: add/remove dropdown
- Cell colors: auto-generated based on deviation from mean
- Export: PDF/Excel buttons

### 3.7 Multi-Select Behaviors

**Desktop:**
- Click checkbox: toggle selection
- Shift + click: range select
- Cmd + click: toggle individual
- Cmd + A: select all visible
- Esc: deselect all

**Mobile:**
- Long press: enter selection mode
- Tap checkbox: toggle
- Selection count appears in header
- Floating action bar at bottom

**Visual feedback:**
- Selected rows: primary-muted background + left emerald border
- Non-selected rows: opacity 0.65 (focus mode)
- Header checkbox: indeterminate state when partial selection

### 3.8 Pinned Zones

**Pattern: Director can pin specific views to their workspace.**

```
┌──────────────────────────────────────────────────────────┐
│ SITUATION BAR                                            │
├──────────────────────────────────────────────────────────┤
│ PINNED ZONES                                             │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│ │ Finance     │ │ Chilonzor   │ │ Staff: Open Pos     │  │
│ │ This Month  │ │ Overview    │ │ 3 positions         │  │
│ │ ₤245M / 87% │ │ ● Sog'lom   │ │ [View all →]        │  │
│ └─────────────┘ └─────────────┘ └─────────────────────┘  │
├──────────────────────────────────────────────────────────┤
│ STRATEGIC OVERVIEW (default, non-pinned)                 │
└──────────────────────────────────────────────────────────┘
```

**Behavior:**
- Maximum 4 pinned zones
- Drag to reorder
- Each zone is a compact card (not full widget)
- Pin action available on any detail view
- Unpin from zone header
- Persisted in user preferences

### 3.9 Operational Dock / Toolbar

**Pattern: A persistent dock for the Director's most common actions.**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│           [Main Content Area]                           │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [📢]  [⚡]  [✓]  [📊]  [🔍]        [↑]        │   │
│  │  E'lon Alert  Appr  Hisob  Qidir    Yuqoriga    │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Position: bottom-center, floating
- Icons + labels (labels on hover to save space)
- Actions: Create Announcement, Send Alert, Open Approvals, Generate Report, Universal Search
- "Scroll to top" appears after scrolling down
- Collapses to icon-only on scroll

---

## 4. Visual Hierarchy Rules

### 4.1 Attention Flow

The Director's eye should flow through information in order of institutional importance.

```
ATTENTION HIERARCHY

1. SITUATION (top bar)
   ↓
2. URGENCY (alerts, approvals needing action)
   ↓
3. HEALTH (branch status, key metrics)
   ↓
4. TRENDS (what's changing, where)
   ↓
5. DETAIL (drill-down data)
```

**Visual weight distribution:**
- Situation: high density, always visible, color-coded
- Urgency: colored badges, counts, animated indicators
- Health: medium density, spatial layout (map/grid)
- Trends: charts, sparklines, comparison cells
- Detail: standard density, tabular, scrollable

### 4.2 What Deserves Large Space

**Large space (generous padding, prominent position):**
- Current period financial pulse (revenue vs target)
- Institution-wide attendance trend
- Critical alert messages
- Approval queue when items are pending
- Branch health map (the spatial overview)

**Why:** These are the Director's primary decision inputs. They need to be scannable from a distance.

### 4.3 What Should Be Compressed

**Compressed space (tight padding, efficient layout):**
- Activity log entries
- Staff directory lists
- Transaction tables
- Notification items
- Historical data tables

**Why:** These are reference data, not decision inputs. The Director scans them, doesn't study them.

### 4.4 How Urgency Should Appear

**Urgency is not red text. Urgency is attention displacement.**

| Level | Visual Treatment | Example |
|-------|-----------------|---------|
| **Critical** (now) | Red dot + pulse animation + border-left red + elevated in list | "Filialda tizim uzilib qoldi" |
| **Warning** (24h) | Amber dot + slight background tint + moved to top | "To'lov muddati ertaga" |
| **Attention** (week) | Slate dot + standard position | "Davomat oylik maqsaddan past" |
| **Info** (no action) | No dot + muted text | "Yangi xodim qo'shildi" |

**Rules:**
- Critical items displace other content (move to top)
- Never use red background (too aggressive)
- Use left-border + dot pattern (scannable)
- Pulse animation only for critical, and it must be subtle (2s cycle, opacity 0.4→1)

### 4.5 How System Intelligence Should Appear

**AI insights should feel like a trusted advisor, not a robot.**

```
BEFORE (robotic):
┌──────────────────────────┐
│ ⚠️ ALERT                 │
│ Attendance dropped 5%    │
└──────────────────────────┘

AFTER (advisory):
┌──────────────────────────┐
│ ● Davomat pasayishi      │
│ 9-A sinfida oylik davomat│
│ 87% gacha tushdi.        │
│                          │
│ [Sinf rahbari bilan      │
│  suhbat]                 │
└──────────────────────────┘
```

**Rules:**
- No robot icons, no "AI" badges
- Plain language, institutional tone
- Suggested action is always present
- Insight card has subtle left border (emerald for suggestion, amber for warning)
- Confidence level shown discreetly (small text: "89% aniqlik")

---

## 5. Enterprise UX Patterns

### 5.1 Approval Workflows

**Pattern: Inbox → Preview → Action → Confirmation → State Update**

```
INBOX VIEW (Split)
┌─────────────────────┬────────────────────────────┐
│ ○ Maria K.    2h    │ Aziz Karimov               │
│   Leave req         │ Filial: Chilonzor          │
│   [●●● amber]       │ Sana: 15-20 May            │
├─────────────────────┤ Sabab: Shifokor ko'rig'i   │
│ ○ John D.     4h    │                            │
│   Leave req         │ [Tasdiqlash]  [Rad etish]  │
├─────────────────────┤ [Malumot so'rash]          │
│ ○ Sarah L.    1d    │                            │
│   Expense  ₤500     │                            │
└─────────────────────┴────────────────────────────┘
```

**States:**
- Pending: amber left border + clock icon
- Approved: green left border + check icon
- Rejected: slate left border + cross icon
- Needs Info: blue left border + question icon

**Bulk actions:**
- Select multiple → floating toolbar appears
- Bulk approve with optional comment
- Bulk reject with required comment

### 5.2 Operational Monitoring

**Pattern: Live status board with drill-down**

```
BRANCH HEALTH MAP
┌─────────────────────────────────────────────────────────┐
│ Chilonzor    ● Sog'lom     1,248 o'quvchi   94.2%      │
│ Yunusobod    ● Sog'lom     1,102 o'quvchi   95.1%      │
│ Sergeli      ●● E'tibor     892 o'quvchi    88.7%  ▼   │
│ Yakkasaroy   ● Sog'lom       756 o'quvchi   93.4%      │
└─────────────────────────────────────────────────────────┘
```

**Behavior:**
- Each row is a live surface (updates without refresh)
- Click row → Right Panel with branch detail
- Click metric → Comparison mode with that metric highlighted
- Hover row → mini sparkline appears
- Sortable by any column

### 5.3 Branch Comparison

**Pattern: Matrix view with conditional formatting**

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│          │Chilonzor │Yunusobod │ Sergeli  │O'rtacha  │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Davomat  │ 94.2%    │ 95.1%    │ 88.7%    │ 92.7%   │
│          │    ●     │    ●     │    ●●    │         │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ To'lov   │ 96%      │ 89%      │ 82%      │ 89%     │
│          │    ●     │    ●     │    ●●    │         │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│ Baho     │ 4.3      │ 4.1      │ 3.9      │ 4.1     │
│          │    ●     │    ●     │    ●     │         │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

**Color rules:**
- Within 5% of mean: no color
- 5–15% below mean: amber dot
- >15% below mean: red dot
- Above mean: green dot (only when significantly better)
- Rightmost column: institution average (always visible)

### 5.4 Institutional Analytics

**Pattern: Answer-first, detail-second**

```
FINANCIAL PULSE
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ₤245,000,000                             ₤280,000,000 │
│   ████████████████████████████████████░░░░░░░░░░░░░░   │
│                                    87.4% bajarildi     │
│                                                         │
│   Qarzdorlik: ₤42M    Oylik o'sish: +8%    ● Sog'lom  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Rules:**
- The answer (87.4%) is the biggest element
- Context (target, absolute numbers) is secondary
- Trend is tertiary
- Detail is accessed via click, not shown by default

### 5.5 Financial Oversight

**Pattern: Hierarchical drill-down with breadcrumb**

```
Institution → Chilonzor → Academics → 9-A → Mathematics

┌─────────────────────────────────────────────────────────┐
│ 9-A sinf, Matematika fani — baholar tahlili             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   O'rtacha: 4.2        Median: 4.0       Mode: 4       │
│   ████░░░░░░  12% past            ████████░░  68% yaxsh│
│                                                         │
│   [O'quvchilar ro'yxati →]  [Dars rejalari →]          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.6 Alert Management

**Pattern: Inbox-style with severity and lifecycle**

```
┌─────────────────────────────────────────────────────────┐
│ Ogohlantirishlar                              [5 ta]    │
├─────────────────────────────────────────────────────────┤
│ ●●●  Davomat pasayishi           Sergeli      2 soat   │
│      9-A sinfida davomat 87% gacha tushdi              │
│      [Ko'rish]  [Tasdiqlash]                           │
├─────────────────────────────────────────────────────────┤
│ ●●   To'lov kechikishi           Yunusobod    1 kun    │
│      23 ta o'quvchining to'lovi muddati o'tdi          │
│      [Ko'rish]  [Eslatma yuborish]                     │
├─────────────────────────────────────────────────────────┤
│ ●    Yangi xodim                 Chilonzor    3 kun    │
│      Dilshod Rahimov o'qituvchi sifatida qo'shildi    │
│      [Profil]                                          │
└─────────────────────────────────────────────────────────┘
```

**States:**
- Unread: bold text, left border
- Read: normal text
- Acknowledged: muted, collapsed
- Resolved: hidden by default (toggle to show)

### 5.7 Audit / Review Flows

**Pattern: Timeline + detail + action trail**

```
┌─────────────────────────────────────────────────────────┐
│ Xodim o'zgarishi — Dilshod Rahimov                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   Bugun, 14:32         ● Tasdiqlandi                   │
│   Dilshod Rahimov      Director: A. Karimov            │
│   o'qituvchi lavozimiga │ Izoh: "Tajribali, sinf      │
│   tasdiqlandi.         │       rahbari sifatida        │
│                        │       tavsiya etildi"         │
│                        │ [Hujjatni ko'rish →]          │
│                                                         │
│   Kecha, 09:15         ○ So'rov yuborildi              │
│   VP F. To'xtayev      Filial boshlig'i tomonidan     │
│   tasdiq uchun         │ tavsiya qilindi               │
│   yubordi.             │                                 │
│                                                         │
│   3 kun oldin, 11:00   ○ Arizа kelib tushdi            │
│   HR bo'limi           HR tomonidan qabul qilindi      │
│                        │                                 │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Workspace Feel

### 6.1 Calm

**How:**
- No animation except subtle fades (150ms)
- No bouncing, elastic, or spring physics
- No progress bars unless operation >2s
- No loading spinners — use skeletons or optimistic updates
- No notification toasts that auto-dismiss (require acknowledgment)

**Why:** The Director makes important decisions. The interface must not create anxiety.

### 6.2 Powerful

**How:**
- Every screen shows what can be done (actions are visible, not hidden in menus)
- Keyboard shortcuts for everything
- Bulk actions for repetitive tasks
- Command palette for navigation
- Right panel for detail without losing context

**Why:** The Director has authority. The interface must make that authority executable.

### 6.3 Institutional

**How:**
- Dense data surfaces (tables, lists, numbers)
- Minimal decorative elements
- Status indicators over decorative icons
- Formal language (no emojis, no casual copy)
- Consistent formatting (numbers, dates, currencies)
- Audit trails visible where relevant

**Why:** The Director operates an institution. The interface must respect that gravity.

### 6.4 Active

**How:**
- Live indicators (dots, counts, timestamps)
- Data updates without page refresh
- Pending work is foregrounded
- Suggested actions appear with insights
- "What needs my attention?" is always answered

**Why:** The Director doesn't browse. They respond. The interface must show what needs response.

### 6.5 Strategic

**How:**
- Overview before detail
- Trends over snapshots
- Comparisons over absolutes
- Aggregations over individual records
- Decisions over data exploration

**Why:** The Director thinks in patterns, not transactions. The interface must surface patterns.

### 6.6 Precise

**How:**
- Exact numbers (not rounded unless necessary)
- Clear timestamps (relative for recent, absolute for older)
- Consistent units (currency, percentage, count)
- Accurate status (not "Loading..." but "Yuklanmoqda...")
- Predictable layout (same element, same position)

**Why:** The Director makes decisions with consequences. The interface must be trustworthy.

---

## 7. What We Do NOT Do

| Anti-pattern | Why | What We Do Instead |
|-------------|-----|-------------------|
| Card grids with equal weight | No prioritization, feels like a template | Hierarchical zones with variable density |
| Large decorative illustrations | Wastes space, feels like a consumer app | Data surfaces, compact layouts |
| Animated entrance effects | Distracting, slows perception | Static load, subtle fade for updates |
| Glassmorphism / blur backgrounds | Hard to read, unprofessional | Solid surfaces with tonal shifts |
| Rounded corners > 12px | Feels playful, not institutional | 8–10px max for containers, 6px for buttons |
| Shadow-heavy cards | Feels like a landing page | 1px borders or ultra-soft shadows (0 1px 2px) |
| Emoji in UI | Unprofessional in enterprise context | Status dots, icons, text labels |
| "Everything is a dashboard" | Passive browsing, no workflow | Task-oriented screens with clear actions |
| Empty states with illustrations | Wastes space when no data | Compact "Hali ma'lumot yo'q" with add action |
| Floating chat bubbles | Consumer pattern | Contextual help in panel, command palette |

---

## 8. Summary: The Director Workspace Checklist

When implementing any Director workspace screen, verify:

- [ ] Does this screen answer "What needs my attention?"
- [ ] Can I take action without leaving this screen?
- [ ] Is the most important information the largest?
- [ ] Are urgent items visually distinct from normal items?
- [ ] Can I complete common tasks in <3 clicks?
- [ ] Is there a keyboard shortcut for this action?
- [ ] Does the layout feel dense but not cluttered?
- [ ] Are decorative elements minimized?
- [ ] Do interactions feel immediate, not theatrical?
- [ ] Does the interface feel alive (updating, responsive)?
- [ ] Is there a clear path from overview to detail?
- [ ] Can I compare information side-by-side?
- [ ] Are approval workflows efficient (bulk actions, inline decisions)?
- [ ] Does the screen feel like an operating environment, not a presentation?

---

*Document version: 1.0*  
*Status: Visual Language Specification — Ready for Implementation*
