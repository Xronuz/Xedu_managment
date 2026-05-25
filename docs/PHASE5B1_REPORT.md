# Phase 5B.1 Report: Advanced Hybrid Solver Foundation

**Date:** 2026-05-25  
**Commit:** `feat: add advanced hybrid solver foundation`  
**Scope:** Module 1 — Advanced Solver MVP (Stage A greedy + Stage B backtracking)

---

## 1. Summary

Implemented `AdvancedSolverService` alongside the existing `ScheduleGeneratorService` (greedy MVP). The new service provides:

- **Stage A:** Greedy placement with in-memory conflict detection (no DB queries during solve)
- **Stage B:** Bounded backtracking repair for demands the greedy stage failed to place
- **Basic scoring:** Placement rate, teacher overload penalty, subject clustering penalty
- **Audit trail:** `SolverRun` model persisted to PostgreSQL for benchmarking and diagnostics
- **Performance safeguards:** Configurable timeout (default 10s, hard cap 30s), graceful partial results
- **RBAC:** Director/VP school-wide, Branch Admin own-branch, Teacher/Student/Parent forbidden

The existing generator remains fully operational as a fallback.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AdvancedSolverService                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Input: { branchId, strategy, timeoutMs, maxDepth, weekType, ... }         │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │  Load Data   │────►│ Stage A:     │────►│ Stage B:     │               │
│  │  (1 DB load) │     │ Greedy       │     │ Backtracking │               │
│  └──────────────┘     │ Placement    │     │ Repair       │               │
│                       └──────────────┘     └──────────────┘               │
│                              │                      │                       │
│                              ▼                      ▼                       │
│                       ┌──────────────┐     ┌──────────────┐               │
│                       │  In-Memory   │     │  Move blocker│               │
│                       │  Conflict    │     │  → re-place  │               │
│                       │  Index       │     │  → place     │               │
│                       └──────────────┘     └──────────────┘               │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │   Scoring    │────►│ Persist Run  │────►│  SolverResult│               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **In-memory conflict index** | Eliminates N+1 query storm of existing generator. All conflicts checked in O(1) via `Map<string, boolean>`. |
| **Single DB load** | Subjects, periods, rooms, existing schedules loaded once before solving. No DB access during placement. |
| **Reused greedy logic** | Same demand-building, sorting, and candidate iteration as existing generator. Ensures behavioral compatibility. |
| **Bounded backtracking** | `maxDepth` parameter (default 2) prevents exponential blow-up. Only moves 1 blocker per failed demand. |
| **Graceful timeout** | Checks `Date.now() > timeoutAt` between demands. Returns partial results with `timeoutHit: true`. |
| **Non-blocking persistence** | `SolverRun.create` wrapped in try/catch. Solver result returned even if audit write fails. |

---

## 3. Files Added / Modified

### New Files

| File | Description |
|---|---|
| `src/modules/schedule/advanced-solver.service.ts` | Core solver engine (greedy + backtracking + scoring) |
| `src/modules/schedule/dto/advanced-generate-schedule.dto.ts` | Input DTO with strategy, timeout, maxDepth |
| `src/modules/schedule/advanced-solver.service.spec.ts` | 31 comprehensive tests |

### Modified Files

| File | Change |
|---|---|
| `src/modules/schedule/schedule.controller.ts` | Added `POST /schedule/advanced-generate`, `GET /schedule/solver-runs` |
| `src/modules/schedule/schedule.module.ts` | Registered `AdvancedSolverService` |
| `prisma/schema.prisma` | Added `SolverRun` model + `SolverRunStatus` enum |
| `packages/types/src/enums.ts` | Exported `SolverRunStatus` enum |

---

## 4. API Endpoints

| Method | Path | Roles | Description |
|---|---|---|---|
| `POST` | `/schedule/advanced-generate` | Director, VP, BA | Run advanced solver |
| `GET` | `/schedule/solver-runs` | Director, VP, BA | List solver run history |

### POST /schedule/advanced-generate

```json
// Request
{
  "branchId": "branch-1",
  "strategy": "hybrid",
  "timeoutMs": 10000,
  "maxDepth": 2,
  "weekType": "all",
  "overwriteExisting": false
}

// Response
{
  "strategyUsed": "hybrid",
  "runtimeMs": 45,
  "totalDemands": 120,
  "placed": 118,
  "failed": 2,
  "score": 96,
  "proposedSlots": [...],
  "failures": [...],
  "diagnostics": {
    "greedyPlaced": 116,
    "greedyFailed": 4,
    "backtrackRecovered": 2,
    "backtrackAttempts": 4,
    "timeoutHit": false
  }
}
```

---

## 5. Runtime Benchmarks

All benchmarks run via Jest on the mocked test environment (CPU-bound, no DB latency).

### Dataset Sizes

| Dataset | Classes | Subjects | Periods/Day | Days | Total Demands | Slots Available |
|---|---|---|---|---|---|---|
| Small | 3 | ~21 | 6 | 5 | 42 | 90 |
| Medium | 10 | ~70 | 7 | 6 | 149 | 420 |
| Large | 30 | ~210 | 8 | 6 | 456 | 1,440 |

### Performance Results

| Dataset | Greedy Time | Hybrid Time | Greedy Placed | Hybrid Placed | Improvement |
|---|---|---|---|---|---|
| Small | 0ms | 0ms | 42/42 (100%) | 42/42 (100%) | — |
| Medium | 1ms | 1ms | 149/149 (100%) | 149/149 (100%) | — |
| Large | 3ms | 3ms | 456/456 (100%) | 456/456 (100%) | — |

### Observations

1. **All benchmarks complete well under targets** (small < 500ms, medium < 2s, large < 10s). Mock environment is CPU-bound; real DB latency will add ~50-200ms for the initial load.

2. **Backtracking improvement is limited on unconstrained datasets.** The test datasets have sufficient slots (available slots >> demands), so greedy already places everything. Backtracking only shows value on constrained scenarios.

3. **Constrained scenario test** (3 classes, 2 periods, 1 day, same teacher for 2 subjects × 3 hours each):
   - Greedy placed: 2/6 (33%)
   - Hybrid placed: 2/6 (33%)
   - Backtracking couldn't help because blockers have nowhere else to go (only 2 slots total).

4. **Constrained but solvable scenario** (3 classes, 2 periods, 2 days, same teacher for 2 subjects × 3 hours):
   - Greedy placed: varies by sort order
   - Hybrid with `maxDepth: 2`: recovers additional placements by moving earlier-placed demands.

---

## 6. Test Coverage

| Category | Tests | Status |
|---|---|---|
| Greedy strategy (compatibility) | 6 | ✅ Pass |
| Hybrid strategy | 3 | ✅ Pass |
| Timeout handling | 2 | ✅ Pass |
| Determinism | 1 | ✅ Pass |
| Scoring | 3 | ✅ Pass |
| SolverRun persistence | 3 | ✅ Pass |
| RBAC enforcement | 6 | ✅ Pass |
| weekType filtering | 1 | ✅ Pass |
| listRuns pagination | 2 | ✅ Pass |
| Benchmarks (small/medium/large) | 4 | ✅ Pass |
| **Total** | **31** | **✅ All pass** |

### Existing Tests Still Pass

| Suite | Tests | Status |
|---|---|---|
| `schedule-generator.service.spec.ts` | 11 | ✅ Pass |
| `schedule.service.spec.ts` | 103 | ✅ Pass |
| `schedule.service.benchmark.spec.ts` | 31 | ✅ Pass |
| `advanced-solver.service.spec.ts` | 31 | ✅ Pass |
| **Schedule total** | **176** | **✅ All pass** |

---

## 7. Known Limitations

### 7.1 Backtracking Scope

- **Depth limit:** Default `maxDepth: 2` means only 1 blocker is moved per failed demand. Deeper chains (A blocks B blocks C) are not resolved.
- **Room backtracking:** Not implemented. If a room is the blocker, the solver does not attempt to move the room-blocking demand.
- **No room preference:** All rooms are tried equally. No subject → room type mapping yet.

### 7.2 Scoring Simplicity

- Teacher overload penalty: >4 lessons/day = -5 per excess lesson
- Subject clustering penalty: >1 same-subject lesson/day = -3 per excess
- No teacher gap preference, no day-spreading optimization, no paired lesson support

### 7.3 WeekType Handling

- Existing schedules are unconditionally loaded into the conflict index based on the Prisma weekType filter.
- The solver does not yet handle cross-week-type balancing (e.g., ensuring a subject appears in both numerator and denominator weeks).

### 7.4 Commit Flow

- The advanced solver returns `proposedSlots` but does NOT auto-commit them.
- Users must call `POST /schedule/generate/commit` (shared with the greedy generator) to save results.
- No dedicated "commit subset" or "rollback" API for solver runs yet.

---

## 8. Future Local-Search Readiness

The codebase is structured to support Stage C (Local Search Optimization) with minimal changes:

### Required Additions

1. **Scoring delta function:** `computeDeltaScore(move)` — calculate score change for a single swap/move.
2. **Move operators:**
   - `swapTwoDemands(d1, d2)` — exchange slots of two placed demands
   - `moveDemand(demand, newCandidate)` — move a demand to an empty slot
3. **Hill-climbing loop:** Iterate over all placed demands, try all moves, accept if `delta > 0`.
4. **Temperature-based acceptance (Simulated Annealing):** For escaping local optima.

### Integration Points

| Component | Current | Future Extension |
|---|---|---|
| `ConflictIndex` | `place`/`unplace`/`isBusy` | Already supports all needed operations |
| `tryPlaceDemand` | Greedy only | Can be reused for move validation |
| `calculateScore` | Static | Will become `computeDeltaScore` for efficiency |
| `SolverResult` | `score` field | Will include `optimizedScore` and `iterations` |

### Performance Estimate

Local search on the large dataset (456 demands) with 50 iterations:
- Each iteration: ~456 demands × ~10 candidate moves = ~4,560 evaluations
- Each evaluation: O(1) score delta
- Estimated time: < 100ms additional

---

## 9. Migration Notes

```sql
-- Generated migration (prisma migrate dev --name add_solver_run)
-- Creates: solver_runs table with SolverRunStatus enum
```

No breaking changes. The `SolverRun` table is write-only from the solver; no existing code reads from it.

---

## 10. Verification Checklist

- [x] Backend type-check passes (`tsc --noEmit`)
- [x] All new tests pass (31/31)
- [x] All existing schedule tests pass (145/145)
- [x] Frontend build passes
- [x] Prisma schema validates
- [x] Prisma client generates successfully
- [x] Shared types package builds successfully
- [x] RBAC defense-in-depth (controller + service + DB where)
- [x] Existing `ScheduleGeneratorService` untouched
- [x] No changes to `commitProposed` flow

---

*Next step: Phase 5B.2 — Teacher Substitution Workflow (auto-propose from approved leave).*
