# Subject Catalog Regression Audit

**Date:** 2026-05-21
**Scope:** Subject deduplication fix — backend catalog endpoint + frontend UX updates
**Baseline:** Backend 412/434 passing (22 pre-existing grades.service.spec.ts failures), Frontend build clean

---

## Audit Checklist

### 1. Teacher create/edit dropdown shows unique subject disciplines only
- **Status:** ✅ PASS
- **Evidence:** `users/page.tsx` loads `subjectsApi.getCatalog()` (line 192) instead of `getAll()`
- **Render:** `existingCatalog.map((s: any) => ...)` renders chips with unique `normalizedName` keys
- **Label:** Shows `s.name` + `s.count > 1 ? "(5 ta sinf)" : "(5A)"` with `title` tooltip listing all class names
- **Warning:** Duplicate detection uses `normalizedName === name.toLowerCase()` (line 987)

### 2. Subject list shows unique subject count correctly
- **Status:** ✅ PASS
- **Evidence:** `subjects-workspace.tsx` fetches catalog (line 248) and computes `uniqueSubjects = catalog.length` (line 424)
- **Sidebar:** "Noyob fanlar" stat pill displays `uniqueSubjects` (line 679)
- **Note:** "Jami" still shows raw count (`subjects.length`) for total row visibility

### 3. TeachingLoad still uses class-specific subject context
- **Status:** ✅ PASS
- **Evidence:** `teaching-load.service.ts` unchanged
- **Validation:** Creates/updates still query `prisma.subject.findFirst({ where: { id: dto.subjectId } })` (line 158)
- **Sync:** Hours sync still maps `load.subjectId` → `subject.id` (lines 294–318)
- **Constraint:** `@@unique([teacherId, subjectId, classId, semester, status])` intact in schema

### 4. Schedule generator still reads TeachingLoad correctly
- **Status:** ✅ PASS
- **Evidence:** `schedule-generator.service.ts` unchanged
- **Demand generation:** Reads `Subject` rows via `prisma.subject.findMany()` with `classId`/`subjectIds` filters (line 109)
- **Mapping:** `subjectId: s.id`, `teacherId: s.teacherId`, `classId: s.classId` (line 151–153)
- **Schedule slots:** Persist `subjectId` + `teacherId` + `classId` triplet (line 268–270)

### 5. Exams/Homework/Clubs dropdowns show class context
- **Status:** ✅ PASS

| File | Pattern | Result |
|------|---------|--------|
| `exams-workspace.tsx:914` | `<option>{s.name}{s.class?.name ? ` (${s.class.name})` : ''}</option>` | ✅ |
| `exams-workspace.tsx:1191` | `<SelectItem>{s.name}{s.class?.name ? ` (${s.class.name})` : ''}</SelectItem>` | ✅ |
| `homework/page.tsx:651` | `<SelectItem>{s.name}{s.class?.name ? ` (${s.class.name})` : ''}</SelectItem>` | ✅ |
| `clubs/page.tsx:195` | `<SelectItem>{s.name}{s.class?.name ? ` (${s.class.name})` : ''}</SelectItem>` | ✅ |
| `teaching-loads/page.tsx:534` | `<SelectItem>{s.name}{s.class?.name ? ` (${s.class.name})` : ''}</SelectItem>` | ✅ |
| `schedule-workspace.tsx:1248` | `<SelectItem>{s.name}{s.class?.name ? ` (${s.class.name})` : ''}</SelectItem>` | ✅ |

### 6. Branch/school scope respected in /subjects/catalog
- **Status:** ✅ PASS (consistent with existing behavior)
- **Evidence:** `catalog()` queries `where: { schoolId: currentUser.schoolId! }` (line 29)
- **Note:** `branchId` filter not applied — same as existing `findAll()` which also only filters by `schoolId`
- **Scope parity:** Catalog and findAll are behaviorally identical regarding tenant scoping

### 7. Existing /subjects behavior unchanged
- **Status:** ✅ PASS
- **Evidence:** `findAll`, `findMine`, `create`, `update`, `remove` methods untouched except `catalog` addition
- **API contract:** `GET /subjects` returns identical shape; `GET /subjects/catalog` is new endpoint
- **Prisma schema:** No migrations; no model changes
- **RBAC:** Same role guards applied to catalog as findAll (director, branch_admin, vice_principal, teacher, class_teacher)

---

## Build/Test Verification

| Check | Result |
|-------|--------|
| Backend TypeScript (`tsc --noEmit`) | ✅ Clean |
| Frontend TypeScript (`tsc --noEmit`) | ✅ Clean |
| Backend tests (`jest --no-coverage`) | ✅ 412/434 (22 pre-existing grades failures) |
| Frontend build (`next build`) | ✅ Exit 0, clean |

---

## Files Modified

```
apps/backend/src/modules/subjects/subjects.controller.ts  | +12  (catalog endpoint)
apps/backend/src/modules/subjects/subjects.service.ts      | +54  (catalog service method)
apps/frontend/src/lib/api/subjects.ts                      | +14  (getCatalog + interface)
apps/frontend/src/app/(dashboard)/dashboard/users/page.tsx | +25/-11  (catalog for existing subjects)
apps/frontend/src/app/(dashboard)/dashboard/subjects/_components/subjects-workspace.tsx | +8/-2  (unique count stat)
apps/frontend/src/app/(dashboard)/dashboard/teaching-loads/page.tsx | +1/-1  (class context in dropdown)
apps/frontend/src/app/(dashboard)/dashboard/schedule/_components/schedule-workspace.tsx | +1/-1  (class context in dropdown)
apps/frontend/src/app/(dashboard)/dashboard/exams/_components/exams-workspace.tsx | +2/-2  (class context in dropdowns)
apps/frontend/src/app/(dashboard)/dashboard/homework/page.tsx | +1/-1  (class context in dropdown)
apps/frontend/src/app/(dashboard)/dashboard/clubs/page.tsx | +1/-1  (class context in dropdown)
```

**Total:** 10 files changed, 106 insertions(+), 19 deletions(-)

---

## Conclusion

**AUDIT PASSED** — All 7 checks pass. Backend catalog endpoint is additive only; no existing APIs modified. Frontend dropdowns now disambiguate duplicate subject names with class context. Teacher creation UX uses deduplicated catalog view. Ready to commit.
