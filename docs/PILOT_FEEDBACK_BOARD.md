# Pilot Feedback Sprint 1 — Intake Board

**Sprint:** 2026-05-21 → 2026-06-04 (2 weeks)  
**Scope:** Collect, triage, and resolve real pilot findings. No roadmap features.  
**Rule:** Only P0 blockers and P1 severe usability problems get fixed in this sprint. Everything else → backlog.

---

## Severity Legend

| Severity | Definition | SLA |
|----------|-----------|-----|
| **P0 — Blocker** | Pilot cannot continue. Data loss, security breach, total outage, or critical workflow impossible. | Fix within 24h |
| **P1 — Severe** | Major usability problem. Workflow is possible but painful/frustrating. Affects daily operations. | Fix within 3–5 days |
| **P2 — Moderate** | Noticeable issue with workaround available. Annoying but not blocking. | Backlog, target v0.1.3 |
| **P3 — Minor** | Cosmetic, edge case, or nice-to-have. | Backlog, future release |

---

## Status Legend

| Status | Meaning |
|--------|---------|
| **new** | Just reported, not yet reviewed |
| **investigating** | Under initial triage/reproduction |
| **confirmed** | Reproduced, severity assigned, ready for fix |
| **in_progress** | Actively being fixed |
| **resolved** | Fix deployed and verified |
| **backlog** | Accepted but deferred to future sprint |
| **deferred** | Won't fix / out of scope / needs design |

---

## Frequency Scale

| Value | Meaning |
|-------|---------|
| 1 user | Single isolated report |
| 3 users | Small cluster, likely real |
| 7 users | Confirmed widespread |
| 15+ users | Systemic issue affecting most users |

---

## Evidence Types

| Type | When to use |
|------|-------------|
| **interview** | Direct conversation with user |
| **telegram_message** | Screenshot or forwarded message from Telegram |
| **screen_recording** | Loom, screen capture, or session replay |
| **live_observation** | Watched user struggle in real time |
| **support_ticket** | Formal support request |
| **logs_metrics** | Backend logs, telemetry, or metrics correlation |
| **session_review** | Review of user session data or audit logs |

---

## Intake Template

```markdown
### #[ID] — [Title]
- **Category:** bug | UX friction | missing workflow | performance | training | configuration | feature_request
- **Severity:** P0 | P1 | P2 | P3
- **Status:** new | investigating | confirmed | in_progress | resolved | backlog | deferred
- **Affected Role:** DIRECTOR | VICE_PRINCIPAL | BRANCH_ADMIN | TEACHER | CLASS_TEACHER | ACCOUNTANT | LIBRARIAN | STUDENT | PARENT | SUPER_ADMIN
- **Frequency:** 1 user | 3 users | 7 users | 15+ users
- **Reported By:** [Name / Role / Date]
- **Source:** telegram | live_session | screen_recording | call | observation | metrics | support
- **Reproduction:** [Step-by-step]
- **Expected:** [What should happen]
- **Actual:** [What actually happens]
- **Evidence:** [Type + description / link]
- **Impact:** [Business impact — e.g., "3 teachers cannot mark attendance"]
- **Root Cause:** [Known or hypothesized root cause]
- **Proposed Resolution:** [Suggested fix]
- **Effort:** trivial | small | medium | large | unknown
- **Release Target:** v0.1.2-pilot-hotfix | v0.1.3 | backlog | deferred
- **Owner:** [Name]
- **Created Date:** YYYY-MM-DD
- **Last Updated:** YYYY-MM-DD
- **Resolution Commit:** [SHA]
```

---

## Sample Tickets

### #S001 — Director cannot publish grades after bulk import (SAMPLE)
- **Category:** bug
- **Severity:** P1
- **Status:** confirmed
- **Affected Role:** TEACHER, CLASS_TEACHER, DIRECTOR
- **Frequency:** 3 users
- **Reported By:** Dilnoza Yusupova / Director / 2026-05-22
- **Source:** live_session
- **Reproduction:**
  1. Go to Grades → Bulk Import
  2. Upload valid CSV with 50 student grades
  3. Import succeeds
  4. Click "Publish All" → spinner spins indefinitely, no error shown
- **Expected:** Grades should publish and students/parents should see them
- **Actual:** Publish hangs; grades remain in draft state
- **Evidence:** live_observation — watched 2 teachers reproduce; screen_recording — Loom link attached
- **Impact:** 3 teachers blocked from finalizing term grades; 150 students cannot see results
- **Root Cause:** Bulk import creates grades without `isPublished=false` flag; publish query filters on this flag and finds no rows
- **Proposed Resolution:** Ensure bulk import sets `isPublished=false`; verify publish query includes imported grades
- **Effort:** small
- **Release Target:** v0.1.2-pilot-hotfix
- **Owner:** @kimi
- **Created Date:** 2026-05-22
- **Last Updated:** 2026-05-22
- **Resolution Commit:** —

---

### #S002 — Schedule solver results confusing for vice principal (SAMPLE)
- **Category:** UX friction
- **Severity:** P2
- **Status:** new
- **Affected Role:** VICE_PRINCIPAL, DIRECTOR
- **Frequency:** 1 user
- **Reported By:** Sardor Rahimov / Vice Principal / 2026-05-23
- **Source:** interview
- **Reproduction:**
  1. Go to Schedule → Generate (Advanced)
  2. Run solver with hybrid strategy
  3. Results page shows raw constraint scores but no explanation
- **Expected:** Human-readable explanation of why schedule got its score (e.g., "3 teacher conflicts, 1 room overlap")
- **Actual:** Raw numeric scores displayed; vice principal doesn't understand what to fix
- **Evidence:** interview — 20-min call; telegram_message — follow-up questions
- **Impact:** Vice principal avoids using advanced solver; sticks to manual schedule
- **Root Cause:** Solver output not translated to actionable human language
- **Proposed Resolution:** Add constraint breakdown tooltip/card with plain-language explanations
- **Effort:** medium
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-23
- **Last Updated:** 2026-05-23
- **Resolution Commit:** —

---

### #S003 — Attendance report CSV export timeout for large schools (SAMPLE)
- **Category:** performance
- **Severity:** P2
- **Status:** investigating
- **Affected Role:** DIRECTOR, BRANCH_ADMIN
- **Frequency:** 7 users
- **Reported By:** Nodira Hasanova / Accountant / 2026-05-24
- **Source:** support_ticket
- **Reproduction:**
  1. Go to Attendance → Reports
  2. Select date range = full academic year
  3. Click Export → CSV
  4. Request times out after 30s
- **Expected:** Export should complete or queue as async job
- **Actual:** Gateway timeout; no file generated
- **Evidence:** logs_metrics — 504 gateway timeout in nginx logs; support_ticket — 7 similar tickets from schools with 500+ students
- **Impact:** Large schools cannot generate attendance reports; workaround is monthly chunked exports
- **Root Cause:** Attendance export is synchronous and loads all records into memory; no pagination/streaming
- **Proposed Resolution:** Convert large attendance exports to async export queue; stream CSV instead of buffering
- **Effort:** medium
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-24
- **Last Updated:** 2026-05-24
- **Resolution Commit:** —

---

## Active Findings (Pre-Populated from Phase 10 Audit)

---

### #001 — Auth Refresh Token Edge Cases (7 test failures)
- **Category:** bug
- **Severity:** P2
- **Status:** backlog
- **Affected Role:** ALL
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** metrics
- **Reproduction:** Run `auth.service.spec.ts` — 7 refresh-token-related tests fail under edge conditions.
- **Expected:** Refresh token rotation should be atomic and handle concurrent requests gracefully.
- **Actual:** Race conditions in refresh token rotation cause intermittent auth failures in test suite.
- **Evidence:** logs_metrics — `auth.service.spec.ts` lines 335+; `Cannot read properties of undefined (reading 'findUnique')`
- **Impact:** Low — test failures only; no confirmed production impact
- **Root Cause:** Missing transaction wrapper; Prisma mock mismatch in school soft-delete check
- **Proposed Resolution:** Add transaction wrapper around refresh token rotation; fix Prisma mock
- **Effort:** small
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** —

---

### #002 — Attendance Bulk Import Validation Failures (2 test failures)
- **Category:** bug
- **Severity:** P2
- **Status:** backlog
- **Affected Role:** CLASS_TEACHER, DIRECTOR
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** metrics
- **Reproduction:** Run `attendance.service.spec.ts` — 2 tests fail on bulk import CSV validation edge cases.
- **Expected:** Invalid CSV rows should be rejected with clear row-level error messages.
- **Actual:** Validation logic throws unhandled errors on malformed date formats.
- **Evidence:** logs_metrics — Attendance test suite failure logs
- **Impact:** Low — test failures only
- **Root Cause:** CSV date parsing not using strict mode
- **Proposed Resolution:** Strengthen CSV date parsing with `date-fns` strict mode; add row-level error accumulation
- **Effort:** small
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** —

---

### #003 — Notification Queue Health Mock Failure (1 test failure)
- **Category:** bug
- **Severity:** P3
- **Status:** backlog
- **Affected Role:** ALL
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** metrics
- **Reproduction:** Run notification service tests — 1 test fails on queue health indicator mock.
- **Expected:** Queue health check should gracefully degrade when BullMQ is not configured.
- **Actual:** Mock setup mismatch causes test failure.
- **Evidence:** logs_metrics — Notification test suite logs
- **Impact:** Negligible — single test mock issue
- **Root Cause:** Mock return shape doesn't match `getQueueStats()` interface
- **Proposed Resolution:** Fix mock return shape in test
- **Effort:** trivial
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** —

---

### #004 — Queue Race Condition: Cancelled Job Continues Processing
- **Category:** bug (production defect)
- **Severity:** P2
- **Status:** backlog
- **Affected Role:** DIRECTOR, VICE_PRINCIPAL, BRANCH_ADMIN
- **Frequency:** —
- **Reported By:** Internal / Phase 9B2 / 2026-05-28
- **Source:** observation
- **Reproduction:**
  1. Start a large export job or schedule solver run.
  2. Click "Cancel" while job is actively processing.
  3. Worker picks up the job from queue before cancellation propagates.
- **Expected:** Job stops immediately upon cancellation.
- **Actual:** Job continues processing to completion even after cancellation. Result may be discarded, but CPU/memory is wasted.
- **Evidence:** observation — Export processor and solver processor both check `status === cancelled` at start, but BullMQ does not interrupt an in-flight job.
- **Impact:** Medium — wasted compute; confusing UX (user thinks cancel worked)
- **Root Cause:** BullMQ workers process jobs atomically; no mid-flight interruption mechanism
- **Proposed Resolution:** Implement periodic cancellation checkpointing inside long-running jobs
- **Effort:** medium
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-28
- **Last Updated:** 2026-05-28
- **Resolution Commit:** —

---

### #005 — No True Blue/Green Deployment (~5–15s Downtime on Recreate)
- **Category:** configuration issue
- **Severity:** P2
- **Status:** backlog
- **Affected Role:** ALL (affects uptime)
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** metrics
- **Reproduction:** Push to `main` → deploy workflow runs → `docker compose up -d --remove-orphans` restarts backend container.
- **Expected:** Zero-downtime deployment.
- **Actual:** ~5–15s downtime while old container stops and new container starts.
- **Evidence:** logs_metrics — Deploy workflow step 3 — rolling recreate, not blue/green.
- **Impact:** Medium — brief outage during every deploy
- **Root Cause:** Single-container deployment with no traffic-shaping layer
- **Proposed Resolution:** Implement two-stack deployment with Nginx upstream swap
- **Effort:** large
- **Release Target:** backlog (post-pilot)
- **Owner:** —
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** —

---

### #006 — Cross-Module Integration Gaps (Homework→Grade, Exam→Grade, Engagement→Coin→Shop)
- **Category:** missing workflow
- **Severity:** P2
- **Status:** backlog
- **Affected Role:** TEACHER, STUDENT
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** observation
- **Reproduction:**
  - Submit homework → no automatic grade entry.
  - Complete exam → no automatic grade entry.
  - Earn engagement coins → shop purchase not wired end-to-end.
- **Expected:** Seamless data flow across modules.
- **Actual:** Each module works independently; bridges exist in code but lack dedicated integration tests.
- **Evidence:** observation — No integration test files for cross-module workflows.
- **Impact:** Medium — extra manual work for teachers; student experience fragmented
- **Root Cause:** Modules developed independently without event-driven hooks
- **Proposed Resolution:** Add event-driven hooks (`HomeworkSubmittedEvent` → `GradeService.create()`)
- **Effort:** medium
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** —

---

### #007 — Tailwind CSS Ambiguous Class Warning
- **Category:** UX friction (developer experience)
- **Severity:** P3
- **Status:** backlog
- **Affected Role:** —
- **Frequency:** —
- **Reported By:** Internal / Local Dev / 2026-05-28
- **Source:** metrics
- **Reproduction:** Run `pnpm dev` in frontend — warning appears in terminal.
- **Expected:** Clean dev server output.
- **Actual:** `warn - The class duration-[var(--xedu-duration)] is ambiguous and matches multiple utilities.`
- **Evidence:** logs_metrics — Frontend dev server logs
- **Impact:** Negligible — cosmetic warning
- **Root Cause:** Tailwind bracket syntax collision
- **Proposed Resolution:** Escape bracket syntax per Tailwind docs
- **Effort:** trivial
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-28
- **Last Updated:** 2026-05-28
- **Resolution Commit:** —

---

### #008 — Frontend Error Boundary `console.error` Leakage
- **Category:** bug (production defect)
- **Severity:** P3
- **Status:** backlog
- **Affected Role:** —
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** observation
- **Reproduction:** Any runtime error in dashboard pages logs to browser console.
- **Expected:** Errors should be sent to a centralized logging service (Sentry) or silently handled.
- **Actual:** `console.error()` calls in `error.tsx` files and `error-boundary.tsx` leak error details to browser console in production builds.
- **Evidence:** observation — 10 files with `console.error()`.
- **Impact:** Low — security hygiene issue; error details visible to users
- **Root Cause:** Error boundaries use `console.error` instead of conditional Sentry/logging
- **Proposed Resolution:** Replace `console.error` with Sentry capture or noop in production
- **Effort:** small
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** —

---

### #009 — Redis Failure = Degraded (Not Down) — Health Check Confusion
- **Category:** configuration issue
- **Severity:** P3
- **Status:** backlog
- **Affected Role:** ALL
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** observation
- **Reproduction:** Stop Redis container → call `/api/health`.
- **Expected:** Health check should clearly indicate Redis is unavailable.
- **Actual:** Health check returns `redis: { status: 'up', message: 'degraded: ...' }` — status is `up` but message says degraded.
- **Evidence:** observation — `health.controller.ts` Redis catch block
- **Impact:** Low — confusing for ops but doesn't affect users
- **Root Cause:** Health check returns `up` for optional degraded dependencies
- **Proposed Resolution:** Return `status: 'down'` for Redis failure but keep overall health `status: 'ok'`
- **Effort:** trivial
- **Release Target:** backlog (v0.1.3)
- **Owner:** —
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** —

---

### #010 — Deploy Workflow Missing Step 4 (Cosmetic)
- **Category:** bug
- **Severity:** P3
- **Status:** resolved
- **Affected Role:** —
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** metrics
- **Reproduction:** Read `.github/workflows/deploy.yml` — comments jump from step 3 to step 5.
- **Expected:** Sequential step numbering.
- **Actual:** Step 4 missing in comments.
- **Evidence:** metrics — Deploy workflow comments
- **Impact:** None — cosmetic
- **Root Cause:** Comment numbering oversight
- **Proposed Resolution:** Renumber steps 5→6→7 to 4→5→6
- **Effort:** trivial
- **Release Target:** v0.1.2-pilot-rc1
- **Owner:** @kimi
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** Phase 10 audit

---

### #011 — Metrics Endpoint Missing Prometheus Content-Type
- **Category:** bug (production defect)
- **Severity:** P2
- **Status:** resolved
- **Affected Role:** —
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** metrics
- **Reproduction:** `curl -I http://localhost:3001/api/metrics` — returns `Content-Type: application/json`.
- **Expected:** `Content-Type: text/plain; version=0.0.4; charset=utf-8`
- **Actual:** NestJS defaults to JSON content-type for string responses.
- **Evidence:** metrics — Prometheus scrapers may reject the endpoint
- **Impact:** Low — monitoring might miss metrics
- **Root Cause:** Missing `@Header()` decorator
- **Proposed Resolution:** Add `@Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')`
- **Effort:** trivial
- **Release Target:** v0.1.2-pilot-rc1
- **Owner:** @kimi
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** Phase 10 audit

---

### #012 — Readiness Disk Check Is Dummy (No Actual Space Verification)
- **Category:** bug (production defect)
- **Severity:** P2
- **Status:** resolved
- **Affected Role:** —
- **Frequency:** —
- **Reported By:** Internal / Phase 10 Audit / 2026-05-21
- **Source:** metrics
- **Reproduction:** Call `/api/health/ready` — disk check always passes even if disk is 99% full.
- **Expected:** Disk check should fail if free space < 500MB.
- **Actual:** Disk check only does `fs.statSync('/')` which verifies filesystem accessibility, not free space.
- **Evidence:** metrics — `health.controller.ts` source code
- **Impact:** Low — could mask disk pressure before it causes real issues
- **Root Cause:** Implementation only checked filesystem accessibility, not available space
- **Proposed Resolution:** Use `fs.promises.statfs('/')` to check `bavail * bsize >= 500MB`
- **Effort:** small
- **Release Target:** v0.1.2-pilot-rc1
- **Owner:** @kimi
- **Created Date:** 2026-05-21
- **Last Updated:** 2026-05-21
- **Resolution Commit:** Phase 10 audit

---

## New Intake (Pilot Users)

Use the template above to add new findings below this line.

> **How to report:**
> 1. Copy the template.
> 2. Fill in all fields.
> 3. Assign severity using the legend.
> 4. If P0 or P1, tag `@kimi` for immediate triage.
> 5. If P2 or P3, mark as `backlog`.

---

### #013 — [Placeholder for first pilot finding]
- **Category:** —
- **Severity:** —
- **Status:** new
- **Affected Role:** —
- **Frequency:** —
- **Reported By:** —
- **Source:** —
- **Reproduction:** —
- **Expected:** —
- **Actual:** —
- **Evidence:** —
- **Impact:** —
- **Root Cause:** —
- **Proposed Resolution:** —
- **Effort:** —
- **Release Target:** —
- **Owner:** —
- **Created Date:** —
- **Last Updated:** —
- **Resolution Commit:** —

---

## Sprint Metrics

| Metric | Target | Current |
|--------|--------|---------|
| P0 blockers | 0 | 0 |
| P1 severe | ≤ 3 | 0 |
| P2 moderate | Triage to backlog | 6 |
| P3 minor | Triage to backlog | 4 |
| Resolved in sprint | — | 3 |
| Avg resolution time (P0/P1) | < 48h | — |
| Pilot user satisfaction | — | — |

---

## Backlog Summary

Items marked `backlog` above are rolled into the product backlog for v0.1.3 or post-pilot. They will be reviewed in the Sprint 2 planning session.

---

## Prioritization Formula

Use this weighted scoring to compare tickets during triage:

```
Priority Score =
  (Severity × 5) +
  (Frequency × 3) +
  (Business Impact × 4) −
  (Effort × 2)
```

### Input Scales

| Input | 1 | 2 | 3 | 4 | 5 |
|-------|---|---|---|---|---|
| **Severity** | P3 | — | P2 | P1 | P0 |
| **Frequency** | 1 user | 3 users | 7 users | — | 15+ users |
| **Business Impact** | Cosmetic | Minor annoyance | Workflow workaround | Daily ops blocked | Pilot cannot proceed |
| **Effort** | trivial (1h) | small (1d) | medium (3d) | large (1w) | unknown |

### Example Scores

| Ticket | Sev | Freq | Impact | Effort | Score | Decision |
|--------|-----|------|--------|--------|-------|----------|
| #S001 (grades publish hang) | 4 | 2 | 4 | 2 | 34 | **P1 → in_progress** |
| #S002 (solver UX confusing) | 3 | 1 | 2 | 3 | 17 | **P2 → backlog** |
| #S003 (export timeout) | 3 | 3 | 3 | 3 | 24 | **P2 → backlog** |
| #010 (step numbering) | 1 | 1 | 1 | 1 | 6 | **P3 → resolved** |

> **Rule of thumb:** Score ≥ 30 → sprint priority. Score 20–29 → backlog candidate. Score < 20 → deferred.
