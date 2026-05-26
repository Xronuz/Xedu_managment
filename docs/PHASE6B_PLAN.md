# Phase 6B — Enterprise Layer Planning

**Date:** 2026-05-21  
**Scope:** Enterprise Export Package, In-App Help / Knowledge UX, Operational UX Polish  
**Out of Scope:** Real-time websocket alerts, solver changes, analytics redesign, payroll redesign, new scheduling workflows  
**Foundation:** Phase 6A (Ops Command Center + Guided Setup Wizard + Navigation Cleanup + Empty States)  

---

## 1. Product Audit

### 1.1 What Exists Today

#### Export & Import Infrastructure
| Feature | Status | Location |
|---------|--------|----------|
| Schedule Excel export | ✅ Backend + API | `schedule-export.service.ts` |
| Reports Excel export (students, payments, attendance) | ✅ Backend + API | `reports.controller.ts` |
| Reports PDF export (attendance, grades, report cards, finance) | ✅ Backend + API | `reports.controller.ts` |
| Import templates (students, users, schedule, grades, attendance) | ✅ Backend + API | `import.controller.ts` |
| Import preview/commit workflow | ✅ Backend + API | `import.controller.ts` |
| Import rollback | ✅ Backend + API | `import.controller.ts` |
| Frontend export trigger (schedule only) | ✅ Partial | `scheduleApi.exportExcel` |
| Frontend import dialog | ✅ Partial | `import-dialog.tsx`, `teaching-loads` import |

#### Help & Guidance Infrastructure
| Feature | Status | Location |
|---------|--------|----------|
| Setup wizard (7-step) | ✅ Complete | `/dashboard/setup` |
| Onboarding checklist widget | ✅ Complete | `onboarding-checklist.tsx` |
| Empty state component | ✅ Complete | `standard-empty-state.tsx` |
| Tooltips (UI primitive) | ✅ Complete | `tooltip.tsx` |
| Toast notifications | ✅ Complete | `toast.tsx`, `use-toast.ts` |
| Command palette search | ✅ Complete | `command-palette.tsx` |
| In-app help center | ❌ Missing | — |
| Contextual tooltips/hints | ❌ Missing | — |
| Product tour / walkthrough | ❌ Missing | — |
| Keyboard shortcuts help | ❌ Missing | — |
| FAQ / knowledge base | ❌ Missing | — |

#### Bulk Actions & Operations
| Feature | Status | Location |
|---------|--------|----------|
| Bulk attendance | ✅ Workspace-level | `attendance-workspace.tsx` |
| Bulk payments | ✅ Workspace-level | `payments-workspace.tsx` |
| Bulk grades | ✅ Workspace-level | `grades/page.tsx` |
| Bulk classes operations | ✅ Workspace-level | `classes-workspace.tsx` |
| Bulk leave request actions | ✅ Workspace-level | `leave-requests-workspace.tsx` |
| Bulk alert dismissal | ✅ Workspace-level | `alerts/page.tsx` |
| Bulk student actions | ✅ Workspace-level | `students-workspace.tsx` |
| Bulk subject operations | ✅ Workspace-level | `subjects-workspace.tsx` |
| Bulk exam operations | ✅ Workspace-level | `exams-workspace.tsx` |
| Bulk staff actions | ✅ Workspace-level | `staff-workspace.tsx` |
| Bulk approval actions | ✅ Workspace-level | `approvals/page.tsx` |
| Bulk discipline actions | ✅ Workspace-level | `discipline-workspace.tsx` |
| Unified bulk action bar component | ❌ Missing | Each page rolls its own |
| Bulk export from list views | ❌ Missing | — |
| Bulk archive/restore | ❌ Missing | — |

#### Loading & Error Patterns
| Feature | Status | Coverage |
|---------|--------|----------|
| `loading.tsx` skeletons | ✅ 15 routes | Most dashboard pages |
| Empty states (standardized) | ✅ 5 routes | schedule, substitutions, analytics, workload, teaching-loads |
| Empty states (inline/plain) | ⚠️ Many routes | classes, subjects, users, etc. still use inline text |
| Error boundaries (`error.tsx`) | ❌ Missing | No global dashboard error boundary |
| Toast error handling | ✅ Global | API client + manual toasts |
| Retry mechanisms | ⚠️ Partial | Only API client circuit breaker |

---

### 1.2 Gap Analysis

#### 🔴 Critical Gaps — Block Enterprise Adoption

1. **No unified export center.** Schools need to export ALL their data (not just schedules and reports). Missing exports: branches, rooms, periods, teaching loads, subjects, classes, payroll, leave requests, discipline records, notifications.
2. **No CSV export.** Excel-only exports exclude schools using Google Sheets or other non-Microsoft workflows.
3. **No export history or background jobs.** Large schools exporting 10,000+ records need async export with download links.
4. **No in-app help.** New users have no contextual guidance beyond the setup wizard. Teachers and students have zero onboarding.
5. **No error boundaries.** A single React error crashes the entire dashboard. No graceful degradation.

#### 🟠 High-Impact Gaps — Friction Reducers

6. **Inconsistent bulk action UI.** 12 different workspaces implement bulk actions differently. No shared component means bugs and maintenance overhead.
7. **Missing print-friendly views.** Report cards, timetables, and attendance sheets need print-optimized layouts.
8. **No keyboard shortcut documentation.** Cmd+K works but users don't know about it. No shortcut cheat sheet.
9. **Inline empty states still prevalent.** Many pages show `"Ma'lumot yo'q"` instead of `StandardEmptyState` with CTAs.
10. **No data portability audit trail.** When data is exported, there's no log of who exported what and when.

#### 🟡 Polish Gaps — Enterprise Feel

11. **Loading skeleton inconsistency.** Some `loading.tsx` files exist, others don't. Skeleton shapes vary.
12. **No export format configuration.** Users can't choose columns, date ranges, or filters before export.
13. **Missing contextual hints on complex forms.** Teaching loads, payroll, and fee structures have complex fields with no explanation.
14. **No "copy to clipboard" for common data.** Phone numbers, IDs, email addresses can't be copied in one click.
15. **No dark-mode print optimization.** Charts and tables don't adapt for print media.

---

## 2. Enterprise Export Package Design

### 2.1 Philosophy

**Data portability is a right, not a feature.** Every entity a school creates must be exportable. Exports should be:
- **Comprehensive:** All fields, including relations
- **Configurable:** Column selection, date ranges, filters
- **Multi-format:** Excel (.xlsx), CSV (.csv), and JSON (.json)
- **Auditable:** Who exported what, when
- **Background-capable:** Large exports don't block the UI

### 2.2 Export Hub Architecture

```
/dashboard/export-center          ← New unified export page
  ├── Export History              ← Async job queue + download links
  ├── Quick Exports               ← One-click common exports
  ├── Custom Export               ← Builder: entity → filters → columns → format
  └── Scheduled Exports           ← Recurring exports (weekly/monthly)
```

### 2.3 Export Entity Matrix

| Entity | Excel | CSV | JSON | Print | Backend Service |
|--------|-------|-----|------|-------|-----------------|
| Schedule | ✅ | 🆕 | 🆕 | 🆕 | `ScheduleExportService` (extend) |
| Students | ✅ | 🆕 | 🆕 | 🆕 | `reports.analyticsService` (extend) |
| Payments | ✅ | 🆕 | 🆕 | 🆕 | `reports.analyticsService` (extend) |
| Attendance | ✅ | 🆕 | 🆕 | 🆕 | `reports.analyticsService` (extend) |
| Grades | ✅ (PDF) | 🆕 | 🆕 | ✅ | `reportsService` (extend) |
| Finance | ✅ (PDF) | 🆕 | 🆕 | ✅ | `reportsService` (extend) |
| Report Cards | ✅ (PDF) | — | — | ✅ | `reportsService` (extend) |
| Branches | — | 🆕 | 🆕 | 🆕 | 🆕 New `BranchExportService` |
| Rooms | — | 🆕 | 🆕 | 🆕 | 🆕 New `RoomExportService` |
| Periods | — | 🆕 | 🆕 | 🆕 | 🆕 New `PeriodExportService` |
| Classes | — | 🆕 | 🆕 | 🆕 | 🆕 New `ClassExportService` |
| Subjects | — | 🆕 | 🆕 | 🆕 | 🆕 New `SubjectExportService` |
| Teaching Loads | — | 🆕 | 🆕 | 🆕 | 🆕 New `TeachingLoadExportService` |
| Users/Staff | — | 🆕 | 🆕 | 🆕 | 🆕 New `UserExportService` |
| Payroll | — | 🆕 | 🆕 | 🆕 | 🆕 New `PayrollExportService` |
| Leave Requests | — | 🆕 | 🆕 | 🆕 | 🆕 New `LeaveRequestExportService` |
| Discipline | — | 🆕 | 🆕 | 🆕 | 🆕 New `DisciplineExportService` |

### 2.4 Reusable Export Engine (Backend)

Create `apps/backend/src/common/export/export-engine.ts`:

```typescript
interface ExportJob {
  id: string;
  userId: string;
  schoolId: string;
  entity: string;
  format: 'xlsx' | 'csv' | 'json';
  filters: Record<string, any>;
  columns: string[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  fileUrl?: string;
  createdAt: Date;
  completedAt?: Date;
}

class ExportEngine {
  async queueExport(dto: ExportRequestDto): Promise<{ jobId: string }>;
  async getJobStatus(jobId: string): Promise<ExportJob>;
  async getUserExports(userId: string): Promise<ExportJob[]>;
  async download(jobId: string): Promise<Buffer>;
}
```

**Implementation strategy:**
- Phase 6B.1: Build the engine + 5 most-requested exports (schedule, students, attendance, grades, teaching-loads)
- Phase 6B.2: Add remaining entities + scheduled exports
- Storage: Local disk for MVP, S3-compatible for production scale

### 2.5 Frontend Export Center

New page: `/dashboard/export-center`
- Role-guarded: `director`, `vice_principal`, `branch_admin`, `accountant`
- Tabbed layout: Quick Exports | Custom Export | Export History
- Quick Exports: cards for each entity with one-click export (last used format remembered)
- Custom Export: step builder (entity → filter → column selector → format → download)
- Export History: table of past exports with status, date, download link, delete

**API Client:** `apps/frontend/src/lib/api/export-center.ts`

---

## 3. In-App Help / Knowledge UX Design

### 3.1 Philosophy

**Help should be invisible until needed, then instantly available.** No popups. No forced tours. Contextual, searchable, and respectful of the user's flow.

### 3.2 Help System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Help Layer (global, z-50)                                  │
│  ├── Floating help button (bottom-right, all pages)         │
│  ├── Contextual hint badges (complex forms)                 │
│  ├── Keyboard shortcut modal (Cmd+Shift+?)                  │
│  └── Page-specific help panel (slide-over)                  │
├─────────────────────────────────────────────────────────────┤
│  Content Sources                                            │
│  ├── Static help JSON (Uzbek + Russian)                     │
│  ├── Dynamic tooltips from field metadata                   │
│  └── Setup wizard integration (step hints)                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Components to Build

#### A. `HelpButton` — Global floating action
- Position: bottom-right, fixed
- Icon: `HelpCircle`
- Opens: help panel slide-over
- Context-aware: knows current page and shows relevant articles first

#### B. `ContextualHint` — Inline field explanations
- Trigger: hover on `?` icon next to complex labels
- Content: 1-2 sentence explanation + link to full help article
- Applied to: teaching load coefficient, payroll formulas, fee structure tiers, grade calculation rules

#### C. `KeyboardShortcutsModal` — Cmd+Shift+?
- Global shortcut listener
- Sections: Navigation, Command Palette, Schedule, Forms
- Dynamically shows shortcuts relevant to current page

#### D. `PageHelpPanel` — Slide-over documentation
- Width: 400px
- Sections: Quick Start, FAQ, Related Articles, Contact Support
- Content loaded from static JSON (no backend needed for MVP)

#### E. `SetupWizardHints` — Step-by-step guidance enhancement
- Each step gets a collapsible "Nima uchun bu muhim?" panel
- Explains business value of each step
- Links to detailed help articles

### 3.4 Help Content Map (MVP)

| Page | Quick Start | FAQ Entries | Contextual Hints |
|------|-------------|-------------|------------------|
| `/dashboard/setup` | 1 article | 5 FAQs | 7 step hints |
| `/dashboard/schedule` | 1 article | 8 FAQs | 6 field hints |
| `/dashboard/teaching-loads` | 1 article | 6 FAQs | 8 field hints |
| `/dashboard/payroll` | 1 article | 5 FAQs | 6 field hints |
| `/dashboard/finance` | 1 article | 4 FAQs | 4 field hints |
| `/dashboard/grades` | 1 article | 5 FAQs | 4 field hints |
| `/dashboard/ops` | 1 article | 4 FAQs | 3 card hints |
| Command Palette | — | 3 FAQs | — |

**Content format:** Static JSON files in `apps/frontend/src/content/help/uz.json` and `ru.json`.

---

## 4. Operational UX Polish Backlog

### 4.1 Unified Bulk Action Bar

**Problem:** 12 workspaces implement bulk actions independently. Inconsistent UI, duplicated logic.

**Solution:** Create `BulkActionBar` component:

```tsx
interface BulkActionBarProps<T> {
  selected: T[];
  actions: Array<{
    label: string;
    icon: LucideIcon;
    variant?: 'default' | 'destructive' | 'outline';
    onClick: (items: T[]) => void | Promise<void>;
    roles?: UserRole[];
  }>;
  onClearSelection: () => void;
}
```

**Rollout:** Refactor the 12 workspaces to use `BulkActionBar` instead of inline bulk UI.

### 4.2 Error Boundary & Graceful Degradation

**Problem:** No `error.tsx` at the dashboard root. A single component crash takes down the entire page.

**Solution:**
1. Add `apps/frontend/src/app/(dashboard)/error.tsx` — global error boundary with:
   - Friendly error message in Uzbek
   - "Refresh page" button
   - "Go to Dashboard" fallback link
   - Error ID for support tickets
2. Add `apps/frontend/src/app/(dashboard)/dashboard/error.tsx` — section-level boundary
3. Wrap heavy workspace components in `ErrorBoundary` (react-error-boundary)

### 4.3 Inline Empty State Standardization

**Problem:** Many pages still show `"Ma'lumot yo'q"` instead of `StandardEmptyState`.

**Affected pages (audit finding):**
- `/dashboard/classes` — inline text in workspace
- `/dashboard/subjects` — inline text in workspace
- `/dashboard/users` — inline text in workspace
- `/dashboard/students` — inline text in workspace
- `/dashboard/staff` — inline text in workspace
- `/dashboard/exams` — inline text in workspace
- `/dashboard/homework` — inline text in workspace
- `/dashboard/discipline` — inline text in workspace
- `/dashboard/leave-requests` — inline text in workspace
- `/dashboard/payments` — inline text in workspace
- `/dashboard/library` — inline text in workspace

**Solution:** Replace all inline empty states with `StandardEmptyState` + context-aware CTAs.

### 4.4 Copy-to-Clipboard Actions

**Problem:** Users manually select and copy IDs, phone numbers, emails. Frustrating on mobile.

**Solution:** Add `CopyButton` component (small icon button, 1-click copy, toast confirmation):
- School phone numbers in settings
- User emails in user lists
- Student IDs in student lists
- Class names in schedule views
- Room names in room lists

### 4.5 Print Optimization

**Problem:** No print-specific CSS. Printing dashboards wastes paper and shows UI chrome.

**Solution:**
1. Add `@media print` styles to `globals.css`:
   - Hide sidebar, header, action buttons
   - Show full tables without truncation
   - Expand collapsed cards
   - Ensure charts are visible (SVG prints well)
2. Add `PrintButton` to key pages:
   - Schedule (print-friendly timetable grid)
   - Attendance (print-friendly roll call sheet)
   - Grades (print-friendly gradebook)
   - Report cards (already PDF, but add print CSS fallback)

### 4.6 Loading Skeleton Consistency

**Problem:** `loading.tsx` exists for 15 routes but shapes vary. Some pages lack loading states entirely.

**Solution:**
1. Create `DashboardSkeleton` template components:
   - `PageSkeleton` (header + stats + content grid)
   - `TableSkeleton` (header + N rows)
   - `CardGridSkeleton` (N cards)
2. Standardize all `loading.tsx` files to use these templates
3. Add missing `loading.tsx` for: `/dashboard/ops`, `/dashboard/setup`, `/dashboard/reports/workload`, `/dashboard/analytics/timetable`, `/dashboard/teacher-substitutions`

---

## 5. RBAC Considerations

### 5.1 Export Center Permissions

| Feature | Director | VP | Branch Admin | Accountant | Teacher |
|---------|----------|----|--------------|------------|---------|
| Quick Exports (all entities) | ✅ | ✅ | Own branch only | Financial only | Own data only |
| Custom Export Builder | ✅ | ✅ | Own branch only | Financial only | ❌ |
| Export History (all school) | ✅ | ✅ | Own exports only | Own exports only | Own exports only |
| Scheduled Exports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Download others' exports | ✅ | ✅ | ❌ | ❌ | ❌ |

### 5.2 Help System Permissions

| Feature | All Roles |
|---------|-----------|
| Help button | ✅ All authenticated users |
| Contextual hints | ✅ All authenticated users |
| Keyboard shortcuts | ✅ All authenticated users |
| Page help panel | ✅ All authenticated users |
| Admin-only help articles | Visible but marked "Admin" |

### 5.3 Bulk Action Permissions

Bulk actions must respect the same permissions as single actions:
- A teacher can bulk-grade their own classes
- A branch admin can bulk-edit their own branch's data
- Only directors can bulk-delete users

---

## 6. Rollout Strategy

### Phase 6B.1 — Foundation (Week 1)
- [ ] Build `ExportEngine` backend service + job queue table
- [ ] Build `ExportCenterPage` frontend shell + API client
- [ ] Implement 5 critical exports: schedule, students, attendance, grades, teaching-loads
- [ ] Build `StandardEmptyState` replacement campaign (11 pages)
- [ ] Add global `error.tsx` boundary
- [ ] Add `CopyButton` component to high-touch fields

### Phase 6B.2 — Help UX (Week 2)
- [ ] Build help content JSON structure (UZ + RU)
- [ ] Build `HelpButton`, `ContextualHint`, `PageHelpPanel` components
- [ ] Integrate hints into setup wizard steps
- [ ] Add keyboard shortcuts modal (Cmd+Shift+?)
- [ ] Write MVP help content (8 pages × 3 sections)

### Phase 6B.3 — Polish & Bulk Actions (Week 3)
- [ ] Build `BulkActionBar` component
- [ ] Refactor 12 workspaces to use unified bulk action bar
- [ ] Add print CSS + `PrintButton` to schedule, attendance, grades
- [ ] Standardize all `loading.tsx` files
- [ ] Add remaining entity exports (rooms, periods, classes, subjects, users, payroll, leave, discipline)

### Phase 6B.4 — Stabilization (Week 4)
- [ ] Full RBAC audit of all new features
- [ ] Accessibility audit (keyboard nav, screen reader labels)
- [ ] Mobile responsiveness audit
- [ ] Performance audit (large export memory usage, bundle size)
- [ ] Frontend build + tests
- [ ] Backend type-check + tests
- [ ] Release audit document

---

## 7. Implementation Roadmap

### Files to Create

```
apps/backend/src/common/export/
  export-engine.ts
  export-job.entity.ts
  export.controller.ts
  export.module.ts

apps/backend/prisma/migrations/
  [timestamp]_add_export_jobs_table.sql

apps/frontend/src/app/(dashboard)/dashboard/export-center/
  page.tsx
  _components/
    quick-exports-tab.tsx
    custom-export-tab.tsx
    export-history-tab.tsx

apps/frontend/src/components/help/
  help-button.tsx
  contextual-hint.tsx
  page-help-panel.tsx
  keyboard-shortcuts-modal.tsx

apps/frontend/src/components/ui/
  copy-button.tsx
  print-button.tsx
  bulk-action-bar.tsx

apps/frontend/src/content/help/
  uz.json
  ru.json

apps/frontend/src/lib/api/export-center.ts
```

### Files to Modify

```
apps/backend/src/app.module.ts              ← register ExportModule
apps/backend/prisma/schema.prisma            ← add ExportJob model

apps/frontend/src/config/navigation.ts       ← add Export Center nav item
apps/frontend/src/config/permissions.ts      ← add /dashboard/export-center route
apps/frontend/src/middleware.ts              ← no changes expected
apps/frontend/src/components/command-palette.tsx ← add Export Center item

apps/frontend/src/app/(dashboard)/error.tsx  ← new global error boundary
apps/frontend/src/app/(dashboard)/dashboard/error.tsx ← section error boundary

# 11 pages for empty state standardization
apps/frontend/src/app/(dashboard)/dashboard/classes/_components/classes-workspace.tsx
apps/frontend/src/app/(dashboard)/dashboard/subjects/_components/subjects-workspace.tsx
apps/frontend/src/app/(dashboard)/dashboard/users/page.tsx
apps/frontend/src/app/(dashboard)/dashboard/students/_components/students-workspace.tsx
apps/frontend/src/app/(dashboard)/dashboard/staff/_components/staff-workspace.tsx
apps/frontend/src/app/(dashboard)/dashboard/exams/_components/exams-workspace.tsx
apps/frontend/src/app/(dashboard)/dashboard/homework/page.tsx
apps/frontend/src/app/(dashboard)/dashboard/discipline/_components/discipline-workspace.tsx
apps/frontend/src/app/(dashboard)/dashboard/leave-requests/_components/leave-requests-workspace.tsx
apps/frontend/src/app/(dashboard)/dashboard/payments/_components/payments-workspace.tsx
apps/frontend/src/app/(dashboard)/dashboard/library/page.tsx
```

---

## 8. Success Metrics

| Metric | Baseline | Target |
|--------|----------|--------|
| Exportable entities | 3 (schedule, students, attendance) | 15+ |
| Export formats | 1 (Excel) | 3 (Excel, CSV, JSON) |
| Pages with `StandardEmptyState` | 5 | 16 (all primary routes) |
| Pages with `error.tsx` | 0 | 2 (global + section) |
| Pages with `loading.tsx` | 15 | 20 (100% coverage) |
| In-app help articles | 0 | 24+ |
| Workspaces with unified bulk actions | 0 | 12 |
| Frontend build errors | 0 | 0 |
| Frontend test failures | 0 | 0 |

---

## 9. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Export jobs consume too much memory | Medium | High | Stream DB results, don't load all into memory |
| Help content translation lag | High | Medium | Start with Uzbek only, Russian in 6B.4 |
| Bulk action refactor breaks existing features | Medium | High | Change one workspace at a time, test after each |
| Large export files cause browser crashes | Low | High | Background jobs + download links, never return raw buffers to frontend |
| Error boundaries swallow useful errors | Low | Medium | Log to console + Sentry, show error ID to user |

---

## 10. Conclusion

Phase 6B transforms Phase 6A's productized core into an **enterprise-grade platform** through three pillars:

1. **Export Package** — Complete data portability with audit trail
2. **Help UX** — Self-service support that reduces onboarding friction
3. **Operational Polish** — Consistent, resilient, professional UI across every page

The implementation is designed to be incremental: each sub-phase delivers standalone value. No feature depends on another being complete first. This minimizes risk and allows continuous deployment.

**Next step:** Begin Phase 6B.1 (Export Engine + 5 critical exports + empty state campaign) upon approval.
