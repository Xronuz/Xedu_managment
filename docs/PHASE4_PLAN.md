# Phase 4 Plan — Advanced Timetable Editor

**Status:** Draft — pending review  
**Target:** Drag-and-drop editor, move endpoint, export, conflict UX, parallel preview, audit timeline

---

## 1. Overview

Phase 4 transforms the timetable from a CRUD grid into an interactive scheduling canvas. The core theme is **visual orchestration**: drag lessons between days/slots, see real-time conflict overlays, compare teacher/class/room availability side-by-side, and export polished documents.

---

## 2. Feature Breakdown

### 2.1 Drag-and-Drop Timetable Editor

**Goal:** Move lessons visually within the weekly grid.

**UX:**
- Each lesson cell in `WeeklyGrid` becomes a draggable card (using `@dnd-kit/core` or native HTML5 DnD).
- Drop targets are the empty day×slot cells.
- On drop, a optimistic update shows the move immediately; a backend call validates; on conflict, the card snaps back with a toast.

**Frontend Changes:**
- `apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/weekly-grid.tsx` *(new file — extract from schedule-workspace)*
  - Wrap grid in `DndContext` + `useDraggable` / `useDroppable`
  - Drag overlay renders a ghost card
- `apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/schedule-workspace.tsx`
  - Replace inline `WeeklyGrid` with extracted component
  - Handle `onDragEnd` → call `moveLesson()` mutation

**Backend Changes:**
- `apps/backend/src/modules/schedule/schedule.controller.ts`
  - `POST /schedule/:id/move` — new endpoint
- `apps/backend/src/modules/schedule/schedule.service.ts`
  - `move(id, { dayOfWeek, timeSlot, roomId? }, user)` — new method
    - Loads existing slot
    - `assertCanModify(slot)` (blocks published/archived)
    - Resolves new `startTime`/`endTime` from `PeriodsService` for the target slot
    - Runs `conflictDetector.assertNoClash()` with new params
    - Updates slot atomically
    - Invalidates cache + audit log

**Open Question:** Should published slots be "movable" by unpublishing them automatically, or should the UI require explicit unpublish first?  
**Recommendation:** Require explicit unpublish first. Dragging a published slot should show a tooltip: "Chop etilgan darsni ko'chirish uchun avval nashrdan oling."

---

### 2.2 Move Lesson Endpoint

**Signature:**
```ts
POST /schedule/:id/move
Body: {
  dayOfWeek: DayOfWeek;
  timeSlot: number;
  roomId?: string;
  roomNumber?: string;
}
```

**Validation Flow:**
1. Fetch slot + tenant check
2. `assertCanModify(slot)`
3. Resolve period config for `timeSlot` → `startTime`/`endTime`
4. `conflictDetector.assertNoClash({ ...newParams, excludeId: id })`
5. Update Prisma record
6. Emit `schedule:moved` websocket event
7. Audit log: `action: 'move', oldData: { dayOfWeek, timeSlot, roomId }, newData: { ... }`

**Edge Cases:**
- Moving to same day/slot → no-op (return 204)
- Moving across branches → forbidden (branch scope enforced by `buildTenantWhere`)
- Moving published slot → blocked (must unpublish first)

---

### 3. Export Excel / PDF

**Goal:** One-click export of the current timetable view.

**Excel Export:**
- Reuse existing `import.service.ts` template generation logic (inverse operation)
- `GET /schedule/export/excel?classId=&weekType=&status=`
- Backend generates `.xlsx` using `xlsx` library (already in dependency tree via import module)
- Columns: Sinf, Fan, O'qituvchi, Kun, Slot, Boshlanish, Tugash, Xona, Hafta turi, Status

**PDF Export:**
- `GET /schedule/export/pdf?classId=&weekType=`
- Backend renders HTML template → Puppeteer/Playwright PDF generation
- Alternative: Frontend generates PDF via `jspdf` + `html2canvas` (simpler, no backend changes)

**Recommendation:** Start with frontend PDF generation (`jspdf` + `html2canvas`) because:
- Zero backend complexity
- Respects current frontend filters (weekType, class, draft toggle)
- Can reuse the existing `WeeklyGrid` DOM for the canvas capture

**Frontend Changes:**
- Add "Export" dropdown to `WorkspaceToolbar`
  - "Excel yuklab olish" → triggers hidden iframe download from backend endpoint
  - "PDF yuklab olish" → captures grid DOM via `html2canvas`, prints via `jspdf`

**Backend Changes (Excel only):**
- `apps/backend/src/modules/schedule/schedule-export.service.ts` *(new)*
- `apps/backend/src/modules/schedule/schedule.controller.ts`
  - `GET /schedule/export/excel`

---

### 4. Better Conflict Explanation UI

**Problem:** Current conflict toasts show raw text like `"O'qituvchi 7-A sinfida Matematika darsida band (08:00–08:45)"`. Users can't act on this without cross-referencing the grid.

**Solution: Structured Conflict Cards**

When a create/update/move/generate operation returns conflicts, show a modal instead of a toast:

```
┌─────────────────────────────────────────────┐
│  Ziddiyatlar aniqlandi (3 ta)               │
├─────────────────────────────────────────────┤
│  🔴 O'qituvchi ziddiyati                    │
│     Botir Aliyev — Dushanba, slot 3         │
│     Sabab: 7-A sinfida Matematika (08:00)   │
│     [Ushbu darsni ko'rsat]                  │
│                                             │
│  🟡 Xona ziddiyati                          │
│     Xona 201 — Dushanba, slot 3             │
│     Sabab: 8-B sinfida Fizika (08:00)       │
│     [Ushbu darsni ko'rsat]                  │
├─────────────────────────────────────────────┤
│  [Bekor qilish]  [Baribir saqlash] ⚠️       │
└─────────────────────────────────────────────┘
```

**Frontend Changes:**
- `apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/conflict-modal.tsx` *(new)*
- Update all schedule mutations (`create`, `update`, `move`, `generate`, `import`) to catch `ConflictException` (409) and render the modal instead of a destructive toast.
- "Ushbu darsni ko'rsat" button scrolls to / highlights the conflicting slot in the grid.

**Backend Changes:**
- Ensure all conflict paths return HTTP 409 with structured JSON:
  ```json
  {
    "statusCode": 409,
    "message": "...",
    "conflicts": [
      { "type": "teacher", "slotId": "...", "message": "..." }
    ]
  }
  ```
- This is already the case for `checkConflict()`; ensure `assertNoClash()` propagates the same structure via the global exception filter.

---

### 5. Teacher / Class / Room Parallel Preview

**Goal:** When adding or moving a lesson, see a side panel showing the availability of the selected teacher, class, and room for the entire week.

**UX:**
- In the Create/Edit modal, add tabs or a collapsible section:
  - "O'qituvchi bandligi" — small weekly grid showing existing lessons for the selected teacher
  - "Sinf bandligi" — same for the selected class
  - "Xona bandligi" — same for the selected room
- Each mini-grid highlights the target day/slot in amber and existing conflicts in red.

**Frontend Changes:**
- `apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/availability-preview.tsx` *(new)*
- Reuse `WeeklyGrid` styling but with reduced dimensions.
- Data source: `scheduleApi.getTeacherCrossBranch(teacherId)`, `scheduleApi.getWeek({ classId })`, rooms endpoint.

**Backend Changes:**
- None required — existing endpoints already support this.

**Performance Note:**
- Fetch all three previews in parallel via `Promise.all`.
- Use `staleTime: 5 * 60_000` since availability doesn't change often during a single editing session.

---

### 6. Schedule Change / Audit Timeline

**Goal:** Show a per-slot or per-branch timeline of who changed what and when.

**Two Views:**

**A) Slot-Level Timeline (LessonPanel)**
- Add a new tab "Tarix" to `LessonPanel`
- Query `GET /audit-log?entity=schedule&entityId=:id`
- Show chronological list:
  ```
  21-may 10:32 — Direktor A. Karimov — Chop etildi
  20-may 14:15 — O'rinbosar B. Aliyev — Tasdiqlandi
  19-may 09:00 — Filial admin C. Toshmatov — Yaratildi
  ```

**B) Branch-Level Timeline (New Page or Sidebar)**
- New sidebar section "So'nggi o'zgarishlar" in `WorkspaceSidebar`
- Query `GET /audit-log?entity=schedule&branchId=&limit=10`
- Shows last 10 schedule mutations across the branch

**Frontend Changes:**
- `apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/lesson-panel.tsx` or extend existing `LessonPanel`
- Add "Tarix" tab
- `apps/frontend/src/lib/api/audit-log.ts` — add `getByEntity(entity, entityId, limit)`

**Backend Changes:**
- `apps/backend/src/common/audit/audit.service.ts`
  - `findByEntity(entity, entityId, limit)` — likely already exists; verify
- `apps/backend/src/common/audit/audit.controller.ts`
  - Ensure query params `entity`, `entityId`, `branchId`, `limit` are supported

**Note:** The audit log table already records `oldData`/`newData` JSON. The timeline should diff these and render human-readable Uzbek labels:
  - `status: draft → validated` → "Qoralamadan tasdiqlandi"
  - `status: validated → published` → "Chop etildi"
  - `dayOfWeek: monday → tuesday` → "Dushanbadan seshanbaga ko'chirildi"

---

## 7. Implementation Order

| Priority | Feature | Estimate | Rationale |
|----------|---------|----------|-----------|
| P0 | **Move endpoint + backend validation** | 4h | Unblocks drag-and-drop; smallest vertical slice |
| P0 | **Conflict explanation modal** | 4h | Immediate UX win; reduces support burden |
| P1 | **Drag-and-drop editor** | 8h | Depends on move endpoint; highest user-visible impact |
| P1 | **Parallel preview (teacher/class/room)** | 6h | Reduces trial-and-error scheduling; reuses existing endpoints |
| P2 | **Export PDF (frontend)** | 4h | Quick win; no backend work |
| P2 | **Export Excel (backend)** | 4h | Symmetry with import; reuse template logic |
| P2 | **Audit timeline** | 6h | Compliance/visibility feature; audit table already populated |

**Total estimate:** ~36h (4–5 dev days)

---

## 8. Architecture Decisions

### ADR-1: Frontend PDF vs Backend PDF
**Decision:** Frontend PDF via `jspdf` + `html2canvas`.  
**Rationale:** Avoids adding Puppeteer/Playwright to backend container; respects live frontend filters; simpler deployment.

### ADR-2: DnD Library
**Decision:** `@dnd-kit/core`  
**Rationale:** Already used in many Next.js projects; supports keyboard accessibility; touch-friendly; no jQuery dependency. Alternative: native HTML5 DnD (lighter but less robust on mobile).

### ADR-3: Published Slot Movement
**Decision:** Block direct moves on published slots; require unpublish first.  
**Rationale:** Preserves audit trail integrity. Auto-unpublishing on drag would create implicit state transitions that are hard to trace. The UI will show a clear tooltip explaining the required workflow.

### ADR-4: Conflict Modal vs Toast
**Decision:** Modal for structured conflicts; toast for generic errors.  
**Rationale:** Conflicts contain actionable data (slot IDs, types). A modal allows highlighting related slots and offering "show conflicting lesson" buttons.

---

## 9. Files to Touch

### Backend
```
apps/backend/src/modules/schedule/schedule.controller.ts      (+ move endpoint, export endpoint)
apps/backend/src/modules/schedule/schedule.service.ts          (+ move(), exportExcel())
apps/backend/src/modules/schedule/schedule-export.service.ts   (+ new)
apps/backend/src/common/audit/audit.controller.ts              (+ query params)
apps/backend/src/common/audit/audit.service.ts                 (+ findByEntity)
```

### Frontend
```
apps/frontend/src/lib/api/schedule.ts                          (+ move, export)
apps/frontend/src/lib/api/audit-log.ts                         (+ getByEntity)
apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/weekly-grid.tsx           (+ new / extract)
apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/schedule-workspace.tsx    (+ DnD wiring, export buttons)
apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/conflict-modal.tsx        (+ new)
apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/availability-preview.tsx  (+ new)
apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/lesson-panel.tsx          (+ timeline tab)
```

### Packages
```
packages/types/src/enums.ts                                    (verify no changes needed)
```

### New Dependencies
```
# Frontend
pnpm add @dnd-kit/core @dnd-kit/utilities
pnpm add jspdf html2canvas
```

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DnD performance degrades with 100+ slots | Medium | Medium | Virtualize grid rows; use `useMemo` for drag overlays |
| PDF export breaks with dark mode | High | Low | Force light-mode CSS class during capture; test both themes |
| Audit log table grows large | Medium | Low | Add pagination; consider 90-day hot / cold storage split in Phase 5 |
| Branch Admin expects to drag published slots | Medium | Medium | Clear tooltip + disabled cursor state; document in user guide |

---

## 11. Success Criteria

- [ ] A Branch Admin can drag a draft lesson from Monday slot 1 to Tuesday slot 3 with zero page refresh.
- [ ] Dropping on a conflicting slot shows the Conflict Modal with correct teacher/room/class details.
- [ ] Exporting PDF produces a single-page A4 document matching the current grid view.
- [ ] Opening a lesson's panel shows an audit timeline with at least create → validate → publish steps.
- [ ] The availability preview updates in real-time as the user changes the teacher/class/room dropdowns in the create modal.

---

**Do not begin implementation until this plan is reviewed and approved.**
