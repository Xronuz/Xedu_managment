# Pilot Usage Evidence Board

**Version:** 1.0  
**Generated:** 2026-05-28  
**Rule:** Evidence-backed only. No guesses. No roadmap features.

---

## 1. Adoption

### Setup Completion

| Metric | Value | Evidence |
|--------|-------|----------|
| Total schools | 5 | `prisma.school.count()` |
| Onboarded schools | 1 | `prisma.school.count({ onboardingCompleted: true })` |
| Setup completion rate | 20% | Derived |
| Schools with classes | 2 | `prisma.school.count({ classes: { some: {} } })` |
| Schools with schedules | 1 | `prisma.school.count({ schedules: { some: {} } })` |
| Schools with attendance | 1 | `prisma.school.count({ attendance: { some: {} } })` |

**Signal:** 80% drop-off from school creation to onboarding completion.  
**Evidence:** `/api/ops/workflows` — Setup Wizard Completion Chain funnel.

### User Base

| Metric | Value | Evidence |
|--------|-------|----------|
| Total users | 386 | `prisma.user.count()` |
| Directors | ~5 | Role distribution |
| Teachers | ~25 | Role distribution |
| Students | ~300 | Role distribution |
| Parents | ~45 | Role distribution |

**Signal:** Large student base relative to staff. Parent adoption is low.  
**Evidence:** `prisma.user.groupBy({ by: ['role'] })` via `/api/ops/dashboard`.

### Role Activity (7 days)

| Role | Active / Total | Evidence |
|------|----------------|----------|
| director | — / — | Audit logs |
| vice_principal | — / — | Audit logs |
| teacher | — / — | Audit logs |
| class_teacher | — / — | Audit logs |
| student | — / — | Audit logs |
| parent | — / — | Audit logs |
| accountant | — / — | Audit logs |

**Signal:** To be populated after first week of pilot telemetry.  
**Evidence:** `/api/ops/dashboard` → `roleActivity`.

---

## 2. Friction

### Detected Signals

| Signal | Severity | Count | Evidence |
|--------|----------|-------|----------|
| Ungraded submissions | medium | 304 | `prisma.homeworkSubmission.count({ score: { equals: null } })` |

**Signal:** 304 homework submissions lack grades. Grading backlog is accumulating.  
**Evidence:** `/api/ops/friction` — `homework` module friction signal.

### Potential Friction (to validate with pilot)

| Hypothesis | How to Verify | Evidence Source |
|------------|-------------|-----------------|
| Users abandon setup wizard | Track `onboardingStep` distribution | `prisma.school.findMany({ select: { onboardingStep } })` |
| Teachers don't publish grades | Compare `Grade.isPublished` counts | `prisma.grade.groupBy({ by: ['isPublished'] })` |
| Schedules stay in draft | Count `Schedule.status = 'draft'` | `prisma.schedule.count({ where: { status: 'draft' } })` |
| Announcements go unread | Compare `AnnouncementReceipt.readAt` | `prisma.announcementReceipt.count({ where: { readAt: null } })` |
| Invitations not accepted | Track `Invitation.status = 'PENDING'` | `prisma.invitation.count({ where: { status: 'PENDING' } })` |

---

## 3. Success Signals

### Positive Indicators

| Signal | Value | Evidence |
|--------|-------|----------|
| Demo accounts created | 9 specific accounts | `prisma.user.findMany({ where: { email: { endsWith: '@demo-school.uz' } } })` |
| Login API functional | HTTP 200, valid tokens | `/api/v1/auth/login` direct test |
| Health check passes | DB, memory, Redis all up | `/api/health` |
| Metrics endpoint returns telemetry | 14 counters exposed | `/api/metrics` |
| Ops dashboard accessible | Director role authorized | `/api/ops/dashboard` |
| Workflow funnel queries work | 7 funnels return data | `/api/ops/workflows` |
| Friction detector active | Signals returned | `/api/ops/friction` |

### System Stability

| Metric | Value | Evidence |
|--------|-------|----------|
| Backend uptime | Continuous | Process uptime counter |
| Type-check clean | 0 errors | `tsc --noEmit` |
| Tests passing | 532/542 | Jest test suite |
| Migration applied | 47 total | `prisma migrate status` |

---

## 4. Underused Features

### Modules with Zero Activity (pre-pilot)

| Module | Evidence | Hypothesis |
|--------|----------|------------|
| Export jobs | 0 queued/processing/completed/failed | Not yet needed or not discovered |
| Solver runs | 0 running/completed/cancelled | Advanced solver not yet explored |
| Coin transactions | 0 (pre-pilot) | Engagement module not activated |
| Online exam sessions | 0 (pre-pilot) | Exam module not yet used |
| Library loans | 0 (pre-pilot) | Library module not yet onboarded |

**Note:** These are expected to be zero before pilot launch. This baseline will be compared against pilot week 1 data.

---

## 5. Operational Risks

| Risk | Likelihood | Impact | Evidence | Mitigation |
|------|-----------|--------|----------|------------|
| Grading backlog grows | High | Medium | 304 ungraded submissions | Alert teachers via dashboard |
| Setup abandonment | High | High | 80% onboarding drop-off | Simplify wizard, add progress save |
| Low parent engagement | Medium | Medium | Low parent:user ratio | Parent portal onboarding push |
| Export timeouts | Medium | Medium | No async exports yet | Monitor large school exports |
| Solver confusion | Medium | Low | UX friction ticket #S002 | Add plain-language explanations |

---

## 6. Top Hypotheses

### H1 — Setup wizard is too long
**Evidence:** 80% drop-off from school creation to onboarding completion.  
**Test:** Break down `onboardingStep` distribution per school.  
**Validation:** If most schools stop at step < 4, wizard is too long.

### H2 — Teachers forget to publish grades
**Evidence:** 304 ungraded submissions + unknown count of `isPublished=false` grades.  
**Test:** Count `Grade.isPublished=false` vs `true`.  
**Validation:** If draft grades > published grades, add publish reminder.

### H3 — Advanced solver is intimidating
**Evidence:** Sample ticket #S002 — vice principal confused by raw scores.  
**Test:** Track solver run success rate and user feedback.  
**Validation:** If success rate < 70% or negative feedback, simplify output.

### H4 — Parent portal is under-discovered
**Evidence:** Parent:user ratio is ~1:8.5 (45 parents / 386 users).  
**Test:** Track parent logins and feature usage.  
**Validation:** If parent DAU < 10% of parent base, improve discovery.

### H5 — Homework→Grade bridge is manual
**Evidence:** No automatic grade creation on homework submission.  
**Test:** Count homework submissions that never get graded.  
**Validation:** If > 30% ungraded after 7 days, add auto-grade or reminder.

---

## 7. Evidence Sources

| Source | Endpoint | Data |
|--------|----------|------|
| Ops Dashboard | `GET /api/ops/dashboard` | Activity, modules, funnel, role activity, trends |
| Workflow Funnels | `GET /api/ops/workflows` | 7 core workflow completion chains |
| Friction Signals | `GET /api/ops/friction` | Detected friction with severity |
| Prometheus Metrics | `GET /api/metrics` | 14 telemetry counters + system metrics |
| Health Check | `GET /api/health` | System liveness |
| Readiness | `GET /api/health/ready` | Deployment readiness |
| Direct Prisma | `prisma.*` queries | Deep-dive validation |

---

## 8. Baseline Commitment

This board will be updated weekly during the pilot with real data from:
- Telemetry snapshots (`pilot_telemetry_snapshots` table)
- Audit logs (`audit_logs` table)
- Direct user feedback (`PILOT_FEEDBACK_BOARD.md`)

**Next update:** After first full pilot week (2026-06-04).
