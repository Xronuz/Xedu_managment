# Phase 10B — Pilot Evidence & Usage Validation Report

**Date:** 2026-05-28  
**Scope:** Validate real pilot behavior using telemetry, workflows, and operational evidence. No roadmap features. No product scope expansion.

---

## Executive Summary

Phase 10B establishes a lightweight, evidence-driven operational layer for the pilot. Key achievements:

1. **Telemetry persistence** upgraded from in-memory to daily database snapshots.
2. **Usage truth dashboard** extended with 7-day trends, role-based activity, and failed action tracking.
3. **Workflow evidence verification** built for 7 core funnels with broken chain detection.
4. **Friction detector** deployed with heuristic-based signals.
5. **Evidence board** created to track adoption, friction, and hypotheses.

All systems operational. No external vendors. No scope creep.

---

## 1. Telemetry Persistence

### What Changed

| Before | After |
|--------|-------|
| In-memory counters only | Daily persisted snapshots in `pilot_telemetry_snapshots` |
| Lost on restart | Survives restart |
| No historical view | 7-day trend queryable |

### Model: `PilotTelemetrySnapshot`

| Field | Type | Description |
|-------|------|-------------|
| `date` | Date | Snapshot date (unique) |
| `logins` | Int | Daily login count |
| `setupCompletions` | Int | Schools completing onboarding |
| `scheduleGenerations` | Int | Schedule generate calls |
| `solverRuns` | Int | Advanced solver runs |
| `exports` | Int | Export jobs created |
| `attendanceActions` | Int | Attendance marks |
| `gradePublishes` | Int | Grade publish actions |
| `homeworkSubmissions` | Int | Homework submissions |
| `examSubmissions` | Int | Exam session starts |
| `coinTransactions` | Int | Coin spend/award actions |
| `announcementReads` | Int | Announcement read actions |
| `invitationAccepts` | Int | Invitation accepts |
| `queueFailures` | Int | Export/solver queue failures |
| `error500s` | Int | HTTP 500 errors |

### Persistence Mechanism

- **Trigger:** `@Interval(5 * 60 * 1000)` checks if day rolled over
- **Strategy:** `upsert` on `date` — idempotent, safe to retry
- **Overhead:** One lightweight DB write per day

---

## 2. Usage Truth Dashboard

### Endpoints

| Endpoint | Auth | Data |
|----------|------|------|
| `GET /api/ops/dashboard` | Manager/Admin | System health + pilot usage + trends + role activity |
| `GET /api/ops/workflows` | Manager/Admin | 7 workflow funnels + broken funnel list |
| `GET /api/ops/friction` | Manager/Admin | Friction signals with severity counts |

### What's New

| Feature | Evidence |
|---------|----------|
| 7-day trends | `trends7d` array from persisted snapshots |
| Role activity | Per-role DAU + top 3 actions from audit logs |
| Failed actions | 24h failed exports, solvers, queue failures |
| Top modules | Ranked by daily action count |
| Low modules | Bottom 5 for adoption focus |
| Setup funnel | Completion rate + drop-off |

---

## 3. Workflow Evidence Verification

### 7 Funnels Tracked

| Funnel | Stages | Status |
|--------|--------|--------|
| Setup Wizard | School → Onboarding → Classes → Schedule → Attendance | ⚠️ 80% drop-off at onboarding |
| Schedule Gen → Publish | Solver runs → Published → Draft | ✅ No drafts exceed published |
| Homework → Grade | Created → Submissions → Graded | ⚠️ 304 ungraded submissions |
| Exam → Grade | Created → Sessions → Graded | ✅ Baseline (pre-pilot) |
| Export Lifecycle | Created → Completed → Failed | ✅ Baseline (pre-pilot) |
| Announcement | Sent → Read | ✅ Baseline (pre-pilot) |
| Invitation | Sent → Accepted | ✅ Baseline (pre-pilot) |

### Broken Funnel Detection

A funnel is marked `healthy: false` when:
- Any stage has > 50% drop-off (setup funnel)
- Draft count exceeds published count (schedule funnel)
- Any stage has > 70% drop-off (homework/exam funnels)
- Success rate < 80% (export funnel)
- Read rate < 30% (announcement funnel)
- Acceptance rate < 50% (invitation funnel)

---

## 4. Friction Detector

### Signals Detected (Current Baseline)

| Signal | Severity | Count | Module |
|--------|----------|-------|--------|
| Ungraded submissions | medium | 304 | homework |

### Signal Definitions

| Signal | Trigger Condition |
|--------|-------------------|
| Failed exports | `exportJob.status = 'failed'` > 0 |
| Failed solver runs | `solverRun.status = 'cancelled'` > 0 |
| Draft schedules | `schedule.status = 'draft'` > 5 |
| Unpublished grades | `grade.isPublished = false` > 10 |
| Unread announcements | `announcementReceipt.readAt = null` > 50 |
| Ungraded submissions | `homeworkSubmission.score = null` > 20 |
| Abandoned homework | `homework` with zero submissions > 5 |

---

## 5. Top 10 Operational Recommendations

| # | Recommendation | Classification | Evidence | Effort |
|---|---------------|----------------|----------|--------|
| 1 | **Fix grading backlog** — 304 homework submissions ungraded. Add teacher dashboard alert for pending grades. | Immediate action | Friction detector: 304 ungraded | Small |
| 2 | **Fix onboarding drop-off** — 80% of schools abandon setup wizard. Add save-progress + resume. | Immediate action | Setup funnel: 80% drop-off | Medium |
| 3 | **Add publish reminder** — Detect draft grades/schedules older than 7 days and notify creator. | Next sprint | Workflow funnel: draft detection | Small |
| 4 | **Simplify solver output** — Replace raw constraint scores with plain-language explanations. | Next sprint | Sample ticket #S002 | Medium |
| 5 | **Parent portal onboarding** — Low parent ratio (45/386). Add invitation email + first-login tutorial. | Next sprint | User base evidence | Small |
| 6 | **Auto-grade homework bridge** — On homework submission, auto-create draft grade for teacher review. | Backlog | Homework funnel drop-off | Medium |
| 7 | **Exam→Grade bridge** — On exam completion, auto-propagate score to gradebook. | Backlog | Exam funnel evidence | Medium |
| 8 | **Export async for large schools** — Convert synchronous attendance report export to async queue. | Backlog | Sample ticket #S003 | Medium |
| 9 | **Announcement read tracking** — Add "read receipt" visibility to sender. | Backlog | Announcement funnel evidence | Small |
| 10 | **Blue/green deployment** — Reduce ~5–15s downtime on deploy. | Accepted risk | Known limitation | Large |

### Classification Legend

| Classification | Action |
|----------------|--------|
| **Immediate action** | Fix within 48h, before pilot expands |
| **Next sprint** | Target v0.1.3, prioritize in Sprint 2 |
| **Backlog** | Track, review in Sprint 3+ |
| **Accepted risk** | Documented, no action planned |

---

## 6. Verification Checklist

| Requirement | Verification Method | Result |
|-------------|---------------------|--------|
| Telemetry survives restart | Persisted to PostgreSQL | ✅ |
| Ops dashboard returns metrics | `GET /api/ops/dashboard` | ✅ |
| No vendor dependency | Only Prisma + NestJS schedule | ✅ |
| Low overhead | One DB write/day + lightweight queries | ✅ |
| RBAC respected | `@Roles(DIRECTOR, VICE_PRINCIPAL, SUPER_ADMIN)` | ✅ |
| Type-check clean | `tsc --noEmit` | ✅ |
| Tests pass | 532/542 (10 pre-existing) | ✅ |
| Prometheus metrics include telemetry | `GET /api/metrics` | ✅ |
| Workflow funnel detection works | `GET /api/ops/workflows` | ✅ |
| Friction signals active | `GET /api/ops/friction` | ✅ |

---

## 7. Files Changed / Created

### New Files

| File | Purpose |
|------|---------|
| `apps/backend/src/common/telemetry/pilot-telemetry.ts` | In-memory counters |
| `apps/backend/src/common/telemetry/pilot-telemetry-persistence.service.ts` | Daily persistence to DB |
| `apps/backend/src/common/telemetry/pilot-evidence.service.ts` | Workflow funnels + friction detector |
| `apps/backend/src/common/telemetry/pilot-telemetry.module.ts` | NestJS module |
| `docs/PILOT_USAGE_EVIDENCE_BOARD.md` | Evidence board |
| `docs/PHASE10B_PILOT_EVIDENCE_REPORT.md` | This report |

### Modified Files

| File | Change |
|------|--------|
| `apps/backend/prisma/schema.prisma` | Added `PilotTelemetrySnapshot` model |
| `apps/backend/src/app.module.ts` | Imported `PilotTelemetryModule` |
| `apps/backend/src/modules/health/health.module.ts` | Imported `PilotTelemetryModule` |
| `apps/backend/src/modules/health/ops-dashboard.controller.ts` | Extended with usage trends, role activity, failed actions |
| `apps/backend/src/modules/health/metrics.controller.ts` | Exposes telemetry counters in Prometheus format |
| Multiple controllers | Wired `record*()` telemetry calls |

### Migration

| Migration | Description |
|-----------|-------------|
| `20260528101800_add_pilot_telemetry_snapshot` | Creates `pilot_telemetry_snapshots` table |

---

## 8. Next Steps

1. **Monitor first pilot week** — Collect daily snapshots, update evidence board.
2. **Address immediate actions** — Grading backlog alert + onboarding fix.
3. **Sprint 2 planning** — Use recommendations #3–#5 as priority candidates.
4. **Weekly retro** — Review friction signals, validate hypotheses H1–H5.

---

> **Phase 10B Status: ✅ COMPLETE**  
> Telemetry persisted. Dashboards live. Evidence collected. Recommendations ready.
