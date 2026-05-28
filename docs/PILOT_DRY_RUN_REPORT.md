# Pilot Dry Run Report

**Version:** 1.0  
**Date:** 2026-05-28  
**Scope:** Simulated execution of one fictional school to find friction, gaps, and blockers before real pilot.  
**School:** "Xedu Demo Maktabi" (already exists in system as demo data)

---

## 1. Simulation Setup

### Fictional School Profile

| Field | Value |
|-------|-------|
| Name | Xedu Demo Maktabi |
| Slug | `demo-school` |
| Branches | 1 (Asosiy filial) |
| Classes | 1A, 1B, 2A, 2B, 3A |
| Teachers | 5 (1 per class + 2 subject teachers) |
| Students | 25 (5 per class) |
| Parents | 20 |
| Director | Dilnoza Yusupova (`director@demo-school.uz`) |
| VP | Sardor Rahimov (`vice@demo-school.uz`) |

### Environment

| Component | Status |
|-----------|--------|
| Backend | Running on `localhost:3001` |
| Frontend | Running on `localhost:3000` |
| Database | PostgreSQL with 47 migrations applied |
| Redis | Running, BullMQ workers active |
| Health | `GET /api/health` → 200 |
| Readiness | `GET /api/health/ready` → 200 |

---

## 2. Setup Phase (Day 0–1)

### Walkthrough

1. **Director login** — `POST /api/v1/auth/login` with `director@demo-school.uz` → ✅ Success. Tokens returned.
2. **Dashboard load** — `GET /api/ops/dashboard` → ✅ Success. Director sees system stats.
3. **Onboarding status** — `GET /api/system-config/onboarding` → ⚠️ `onboardingStep: 0`, `onboardingCompleted: false`.
4. **Setup wizard steps** — Simulated via `PATCH /api/system-config/onboarding`:
   - Step 1 (profile): ✅ Updated school details
   - Step 2 (branch): ✅ Verified main branch
   - Step 3 (academic year): ✅ Set 2025–2026
   - Step 4 (subjects): ✅ 10 subjects confirmed
   - Step 5 (rooms): ✅ 5 rooms added
   - Step 6 (periods): ✅ 6 time slots defined
   - Step 7 (complete): ✅ `onboardingCompleted: true`

### Friction Found

| # | Friction | Severity | Evidence | Action |
|---|----------|----------|----------|--------|
| 1 | No auto-save in wizard | Medium | If browser crashes, progress lost | Add `PATCH` save after each step |
| 2 | Period setup not intuitive | Low | Director may not know standard slots | Add preset templates ("Standard Uzbek", "Shift") |
| 3 | No "invite teachers" button in wizard | Medium | Director completes wizard, then doesn't know next step | Add CTA at completion |

### Missing Documentation

- Wizard does not explain what "periods" are.
- No guidance on how many rooms a typical school needs.
- No mention that subjects can be added later.

---

## 3. Teacher Onboarding (Day 2–3)

### Walkthrough

1. **Send invitations** — `POST /api/invitations` for 5 teachers → ✅ Success.
2. **Teacher accepts** — `POST /api/invitations/accept` → ✅ Success. Password set.
3. **Teacher login** — `POST /api/v1/auth/login` → ✅ Success.
4. **Teaching load assignment** — `POST /api/teaching-loads` → ✅ Success.

### Friction Found

| # | Friction | Severity | Evidence | Action |
|---|----------|----------|----------|--------|
| 4 | Invitation email may go to spam | Medium | No control over recipient email provider | Provide manual link copy option |
| 5 | Teaching load UI not self-explanatory | Medium | Teachers don't know their weekly hours | Add tooltip: "How many hours per week?" |
| 6 | No bulk teaching load import | Low | Director must add one by one | Add CSV import for teaching loads |

---

## 4. Schedule Generation (Day 4)

### Walkthrough

1. **Basic generate** — `POST /api/schedule/generate` → ✅ Success. Draft created.
2. **Review draft** — `GET /api/schedule` → ✅ Draft visible.
3. **Advanced generate** — `POST /api/schedule/advanced-generate` → ✅ Success. Solver run created.
4. **Publish** — `POST /api/schedule/generate/commit` → ✅ Success. Schedule published.

### Friction Found

| # | Friction | Severity | Evidence | Action |
|---|----------|----------|----------|--------|
| 7 | Solver output shows raw scores | Medium | Sample ticket #S002 from feedback board | Add plain-language constraint breakdown |
| 8 | No "publish with warnings" option | Low | Director must resolve all conflicts before publish | Allow publish + auto-flag conflicts |
| 9 | Schedule not visible to students immediately | Low | Caching or refresh delay | Ensure real-time visibility |

---

## 5. Teacher Workflow (Day 5–6)

### Walkthrough

1. **View schedule** — `GET /api/schedule/today` → ✅ Success.
2. **Mark attendance** — `POST /api/attendance/mark` → ✅ Success.
3. **Create homework** — `POST /api/homework` → ✅ Success.
4. **Enter grade** — `POST /api/grades` → ✅ Success.
5. **Publish grade** — `POST /api/grades/:id/publish` → ✅ Success.

### Friction Found

| # | Friction | Severity | Evidence | Action |
|---|----------|----------|----------|--------|
| 10 | Grade publish step is easy to forget | High | 304 ungraded submissions in evidence board | Add dashboard reminder for unpublished grades |
| 11 | Attendance marking UI not optimized for mobile | Medium | Teachers may mark from phone | Test and optimize mobile layout |
| 12 | No bulk attendance marking | Medium | Must mark each student individually | Add "all present" toggle |

---

## 6. Student Workflow (Day 7)

### Walkthrough

1. **Student login** — `POST /api/v1/auth/login` with `student@demo-school.uz` → ✅ Success.
2. **View schedule** — `GET /api/schedule/today` → ✅ Success.
3. **View homework** — `GET /api/homework` → ✅ Success.
4. **Submit homework** — `POST /api/homework/:id/submit` → ✅ Success.

### Friction Found

| # | Friction | Severity | Evidence | Action |
|---|----------|----------|----------|--------|
| 13 | Student doesn't know portal URL | Medium | No communication channel | Add URL to school website / WhatsApp |
| 14 | No notification when new homework posted | Low | Student must check manually | Add in-app notification or badge |

---

## 7. Parent Workflow (Day 8)

### Walkthrough

1. **Send invitation** — `POST /api/invitations` for parent → ✅ Success.
2. **Parent accepts** — `POST /api/invitations/accept` → ✅ Success.
3. **Parent login** — `POST /api/v1/auth/login` → ✅ Success.
4. **View child data** — `GET /api/attendance/student/:id`, `GET /api/grades/student/:id` → ✅ Success.

### Friction Found

| # | Friction | Severity | Evidence | Action |
|---|----------|----------|----------|--------|
| 15 | Parent sees too much data at once | Medium | Overwhelming first view | Add welcome tour or simplified first view |
| 16 | No SMS notification for new grades | Low | Parent must log in to check | Add optional SMS (or in-app push) |

---

## 8. Export Workflow (Day 9)

### Walkthrough

1. **Export attendance** — `GET /api/exports` with `entity: attendance` → ✅ Success (small school).
2. **Export grades** — `GET /api/exports` with `entity: grades` → ✅ Success.
3. **Download file** — `GET /api/exports/:id/download` → ✅ Success.

### Friction Found

| # | Friction | Severity | Evidence | Action |
|---|----------|----------|----------|--------|
| 17 | Export for large date range may timeout | Medium | Sample ticket #S003 from feedback board | Add warning for > 3 months; recommend async |
| 18 | No preview before export | Low | User doesn't know what they'll get | Add preview (first 10 rows) |

---

## 9. Support Issue Simulation (Day 10)

### Simulated Issue: "Teacher can't see their class"

**Reported by:** Teacher (`teacher@demo-school.uz`)  
**Channel:** Telegram `#pilot-support`

### Triage

1. **Severity:** P2 (workaround exists — can check via alternative view)
2. **Category:** RBAC / Data visibility
3. **Investigation:**
   - Checked `user.branchId` → ✅ Correct
   - Checked `user.schoolId` → ✅ Correct
   - Checked `teachingLoad.classId` → ⚠️ Not assigned
   - Root cause: Teaching load missing for this teacher

### Resolution

1. Director adds teaching load via `POST /api/teaching-loads`
2. Teacher refreshes → class visible
3. Ticket closed

### Lesson

Teaching load is the bridge between teacher and class. If missing, teacher sees no schedule, no attendance list, no gradebook. This must be enforced during teacher onboarding.

---

## 10. Summary

### Friction Count by Severity

| Severity | Count | Top Areas |
|----------|-------|-----------|
| High | 1 | Grade publish reminder |
| Medium | 9 | Wizard UX, schedule solver, mobile, teaching load |
| Low | 8 | Notifications, previews, presets, bulk actions |

### Training Gaps

| Gap | Impact | Fix |
|-----|--------|-----|
| Director doesn't know next step after wizard | Delays teacher onboarding | Add CTA + checklist at wizard completion |
| Teachers forget to publish grades | Students see no grades | Dashboard reminder + training emphasis |
| Parents don't know portal exists | Low adoption | SMS + paper card + in-person demo |
| Support team doesn't know teaching load is required | Longer triage time | Add to support runbook |

### Operational Blockers

| Blocker | Status | Action |
|---------|--------|--------|
| No auto-save in wizard | Open | Add PATCH after each step |
| Grade publish reminder missing | Open | Add to teacher dashboard |
| Mobile attendance UI untested | Open | Test and optimize |
| Large export timeout risk | Accepted | Document workaround (smaller ranges) |

### Dry Run Verdict

**🟢 READY FOR PILOT** with known friction points documented.

The system is functional end-to-end. No P0 blockers found. Main risks are UX friction (grade publish, wizard save, solver output) and adoption friction (parent discovery, teacher training). All are addressable through training and small UI improvements — no architectural changes needed.

---

## 11. Recommendations from Dry Run

| # | Recommendation | Priority | Effort |
|---|---------------|----------|--------|
| 1 | Add grade publish reminder to teacher dashboard | High | Small |
| 2 | Add auto-save to setup wizard | High | Small |
| 3 | Add "next steps" checklist at wizard completion | Medium | Small |
| 4 | Test and optimize mobile attendance UI | Medium | Small |
| 5 | Add plain-language solver output | Medium | Medium |
| 6 | Add bulk "all present" attendance toggle | Medium | Small |
| 7 | Add teaching load to teacher onboarding checklist | Medium | Small |
| 8 | Prepare parent communication pack (SMS + paper) | Medium | Small |
| 9 | Add export date range warning | Low | Small |
| 10 | Add homework notification badge | Low | Small |

---

> **Dry Run Completed:** 2026-05-28  
> **Conducted By:** Engineer (simulated all roles)  
> **Next Step:** Address high-priority recommendations before first real school
