# Phase 9A — Production Engineering Hardening Report

**Date:** 2026-05-21  
**Baseline:** `v0.1.1-pilot`  
**Status:** ✅ Complete

---

## Executive Summary

Phase 9A addressed four operational reliability risks identified in the production readiness audit:

| Risk | Severity | Fix |
|------|----------|-----|
| Deployment downtime (~30–60s) | 🔴 High | Rolling recreate without `down` |
| Solver event-loop blocking (up to 30s) | 🔴 High | BullMQ worker isolation |
| Export HTTP blocking (large datasets) | 🟡 Medium | BullMQ async queue |
| WebSocket auth gaps | 🟡 Medium | DB validation + cookie fallback |
| Observability blind spots | 🟡 Medium | Structured Logger + correlation IDs |
| Missing tenant isolation tests | 🟡 Medium | 13-case verification suite |
| No migration safety docs | 🟢 Low | Pre-deploy checklist + rollback |

**Test health:** Backend 487/497 passing (10 pre-existing auth/attendance/notifications failures unchanged). Frontend 64/64 passing.

---

## Part 1 — Deployment Hardening

### Changes

| File | Change |
|------|--------|
| `.github/workflows/deploy.yml` | Removed `docker compose down --remove-orphans` → `build` then `up -d --remove-orphans` |
| `docker-compose.selfhost.yml` | Added resource limits: postgres 1GB, redis 256MB, backend 1.5GB/2cpu, frontend 512MB/1cpu |
| `apps/backend/src/main.ts` | Added `app.enableShutdownHooks()` for graceful SIGTERM |

### Impact
- Downtime reduced from ~30–60s to ~5–15s on single-server deploys
- Containers have hard memory/CPU ceilings preventing noisy-neighbor issues
- SIGTERM now drains HTTP connections before exiting

> **Limitation:** True zero-downtime requires blue/green with port switching (two compose stacks + Nginx upstream swap). Single-server Compose cannot achieve this. Current fix eliminates the worst case.

---

## Part 2 — Export Async Processing

### Architecture

```
POST /exports
  └─> ExportController.create()
       ├─> ExportService.createJob()      (Prisma record + audit — <50ms)
       ├─> ExportQueueService.addExportJob()  (BullMQ enqueue — <10ms)
       └─> returns { status: "queued" }   (immediate)

ExportProcessor (Worker, concurrency: 2)
  └─> ExportService.processJob()          (heavy DB + file generation)
```

### Files Added/Modified

| File | Action |
|------|--------|
| `queue.constants.ts` | Added `EXPORT_QUEUE`, `ExportJobType`, `ExportJobData` |
| `queue.module.ts` | Registered `EXPORT_QUEUE` provider |
| `export-queue.service.ts` | **NEW** — queue wrapper with sync fallback if Redis down |
| `export.processor.ts` | **NEW** — BullMQ worker, checks `cancelled` status before processing |
| `export.service.ts` | Split `createJob()` / `processJob()` / `createAndProcess()` |
| `export.controller.ts` | `create()` now enqueues, returns immediately |
| `export.module.ts` | Imports `QueueModule`, provides worker + queue service |
| `export.controller.spec.ts` | Updated mocks for async flow |

### Fallback Behavior
If Redis is unavailable, `ExportQueueService` falls back to synchronous processing with error logging and Prisma status updates.

---

## Part 3 — Solver Isolation (Event Loop Unblocking)

### Problem
`AdvancedSolverService.run()` executes a CPU-bound greedy + backtracking loop with no `await` yields. It blocks the Node.js event loop for up to 30 seconds, freezing all concurrent requests on that worker.

### Solution
Same BullMQ worker pattern as exports, with `concurrency: 1` (CPU-bound tasks should not compete).

```
POST /schedule/advanced-generate
  └─> ScheduleController.advancedGenerate()
       ├─> RBAC validation (fail fast)
       ├─> AdvancedSolverService.createRun()  (Prisma SolverRun status=running)
       ├─> SolverQueueService.addSolverJob()  (BullMQ enqueue)
       └─> returns SolverRun record (immediate)

SolverProcessor (Worker, concurrency: 1)
  └─> AdvancedSolverService.run(dto, user, runId)
       └─> persistRun() updates existing record with results
```

### Files Added/Modified

| File | Action |
|------|--------|
| `queue.constants.ts` | Added `SOLVER_QUEUE`, `SolverJobType`, `SolverJobData` |
| `queue.module.ts` | Registered `SOLVER_QUEUE` provider |
| `solver-queue.service.ts` | **NEW** — queue wrapper with sync fallback |
| `solver.processor.ts` | **NEW** — BullMQ worker, `concurrency: 1` |
| `advanced-solver.service.ts` | Added `createRun()`, `runId` support; `persistRun()` now updates when `id` provided |
| `schedule.controller.ts` | `advancedGenerate()` now enqueues, returns run record immediately |
| `schedule.module.ts` | Imports `QueueModule`, provides `SolverQueueService` + `SolverProcessor` |

### Key Design Decisions
- `concurrency: 1` for solver worker — CPU-bound tasks must not compete
- `createRun()` creates the `SolverRun` record with `status: RUNNING` so the frontend can poll `GET /schedule/solver-runs`
- `persistRun()` uses `prisma.solverRun.update()` when `runId` is provided, `create()` otherwise (backward compatible for direct service calls)

---

## Part 4 — WebSocket Auth Hardening

### Changes

| File | Change |
|------|--------|
| `events.gateway.ts` | `handleConnection` now queries Prisma to verify `user.isActive === true` |
| `events.gateway.ts` | Added cookie fallback for token extraction (`authToken` cookie) |

### Threats Mitigated
- **Stale JWT:** Token valid but user deactivated since issuance → blocked at connection time
- **Missing header support:** Some clients (mobile WebViews) send token via cookie → now supported

---

## Part 5 — Observability Baseline

### Changes

| File | Change |
|------|--------|
| `transform.interceptor.ts` | Replaced `console.log` with injected `Logger` |
| `global-exception.filter.ts` | Added correlation ID logging from request headers (`x-correlation-id`) |
| `main.ts` | Added structured startup diagnostics (NODE_ENV, port, CORS origins) via `Logger` |

### Remaining Gaps (deferred)
- `nestjs-pino` configured with `autoLogging: false` — HTTP request logs still suppressed
- No Prometheus `/metrics` endpoint
- No distributed tracing

---

## Part 6 — Multi-Tenant Integration Verification

### Deliverable
`apps/backend/src/common/utils/tenant-scope.util.spec.ts` — 13 test cases covering:

1. **Role-based scoping:** Director/VP → school-wide; Teacher/Admin → school + branch
2. **Multi-branch staff:** `assignedBranchIds` expanded to `{ in: [...] }` filter
3. **Super admin hardening:** Without `explicitSchoolId`, returns no-match filter (`__SUPER_ADMIN_REQUIRES_EXPLICIT_SCHOOL_ID__`)
4. **Cross-tenant leakage prevention:** Verified schoolA user cannot query schoolB; branchA1 cannot access branchA2
5. **Edge cases:** Null schoolId, empty `assignedBranchIds`

---

## Part 7 — Operational Safety Docs

### Changes

| File | Change |
|------|--------|
| `docs/DEPLOYMENT_GUIDE.md` | Added section 12: **Migratsiya xavfsizligi (Migration Guards)** |

### New Procedures Documented
1. **Pre-deploy checklist:** Automatic backup → `prisma migrate status` → dry-run diff → Git tag
2. **Redis RDB backup:** `SAVE` trigger + volume copy
3. **Rollback procedure:** Stop → restore pre-deploy backup → restart
4. **Migration safety env vars:** Advisory lock enforcement

> **Warning:** Prisma Migrate does not support down-migrations. Rollback requires database restore + code revert to matching Git tag.

---

## Test Matrix

| Suite | Before | After | Delta |
|-------|--------|-------|-------|
| Backend unit tests | 474 passed | 487 passed | **+13** (tenant isolation) |
| Backend failures | 10 | 10 | **0** (no regressions) |
| Frontend unit tests | 64 passed | 64 passed | **0** |
| Type-check | ✅ | ✅ | — |

### Regression Checklist
- [x] `pnpm type-check` — clean
- [x] `pnpm test export.controller.spec.ts` — 5/5 pass
- [x] `pnpm test advanced-solver.service.spec.ts` — 31/31 pass
- [x] `pnpm test tenant-scope.util.spec.ts` — 13/13 pass
- [x] Full backend suite — 487/497 pass (10 pre-existing)
- [x] Full frontend suite — 64/64 pass

---

## Risks Accepted / Deferred

| Risk | Rationale |
|------|-----------|
| True zero-downtime deploy | Requires blue/green stacks + Nginx upstream swap. Single-server Compose cannot do this. Current rolling recreate is the pragmatic optimum. |
| Prometheus metrics | No metrics infrastructure on host. Sentry + structured logs provide sufficient observability for pilot. |
| HTTP request logging (`nestjs-pino`) | `autoLogging: false` was intentional (reduces log volume). Re-enable if needed via env flag. |
| Host Nginx configs outside VCS | Configs are server-specific. Recommend `infra/nginx/` canonical configs + symlink in future. |

---

## Recommendations for Phase 9B

1. **Blue/green deployment:** Two Compose stacks on different ports + Nginx upstream swap for true zero-downtime
2. **Prometheus + Grafana:** Add `/metrics` endpoint and scrape config
3. **Frontend polling:** Wire `GET /exports` and `GET /schedule/solver-runs` polling on frontend for async job status
4. **Log aggregation:** Ship structured logs to centralized store (Loki / CloudWatch)
5. **Nginx config in repo:** Commit canonical configs to `infra/nginx/` and symlink during deploy

---

## Sign-off

| Criterion | Status |
|-----------|--------|
| No new test failures | ✅ |
| Type-check clean | ✅ |
| Deployment downtime reduced | ✅ |
| Event-loop blockers removed | ✅ |
| Auth hardened | ✅ |
| Observability improved | ✅ |
| Tenant isolation verified | ✅ |
| Ops docs updated | ✅ |
