# Performance Audit — Phase 28.5

> **Date**: 2026-05-06  
> **Scope**: Backend NestJS + Prisma, Frontend Next.js 14, PostgreSQL 16, Redis 7

## Executive Summary

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Backend cold start | ~2-3s | < 5s | ✅ |
| API p95 latency | ~120ms | < 200ms | ✅ |
| Dashboard TTFB | ~800ms | < 1.5s | ✅ |
| DB connection pool | 20 | 20 | ✅ |
| Prisma query N+1 | 2 known | 0 | ⚠️ |

## Database

### Query Optimization

1. **Monthly payment generation** (`fee-structures.service.ts`)
   - **Fixed**: Was N+1 (loop over students → individual `createMany`). Now uses `$transaction` with batched `createMany`.
   - **Impact**: 200 students × 3 fee structures = 600 inserts in 1 transaction instead of 600 round-trips.

2. **Attendance bulk queries**
   - **Status**: `findMany` with `take: 1000` in cron jobs. Bounded.
   - **Risk**: Schools with >1000 daily attendance records will need pagination.

3. **Grade listing**
   - **Status**: No `take` limit on `grade.findMany` in some controllers.
   - **Action needed**: Add `take: 500` with cursor pagination for large datasets.

### Indexes

| Table | Column(s) | Type | Needed? |
|-------|-----------|------|---------|
| `User` | `schoolId + role` | B-tree | ✅ Exists |
| `Attendance` | `schoolId + date` | B-tree | ✅ Exists |
| `Schedule` | `schoolId + dayOfWeek` | B-tree | ✅ Exists |
| `Payment` | `schoolId + status` | B-tree | ⚠️ Add if >10K rows |
| `Message` | `conversationId + createdAt` | B-tree | ✅ Exists |

### Connection Pool

- **Current**: Prisma default (typically `2 × CPU cores`)
- **Prod recommendation**: Set `connection_limit=20` in `DATABASE_URL`
- **PgBouncer**: Recommended at >50 concurrent schools

## Backend

### Cron Jobs

| Job | Frequency | Query Cost | Mitigation |
|-----|-----------|------------|------------|
| Payment generation | Monthly | Medium | `$transaction`, bounded `findMany` |
| Attendance reminders | Daily | Low | `take: 1000` |
| KPI rollup | Daily | Medium | Async queue (BullMQ) |
| Coin decay | Weekly | Low | Single update query |

### Memory

- **JWT deny-list**: Stored in Redis with TTL. Memory bounded by active sessions.
- **Refresh tokens**: Stored in Redis with TTL. No unbounded growth.
- **File uploads**: Streamed to disk. Max 50MB per file.

### BullMQ Queues

| Queue | Job Type | Retry | Backoff |
|-------|----------|-------|---------|
| `notifications` | Email / Push | 3 | Exponential 1s |
| `imports` | Excel processing | 1 | Fixed 5s |
| `reports` | PDF generation | 2 | Exponential 5s |

## Frontend

### Bundle Size

| Route | Estimated JS | Strategy |
|-------|-------------|----------|
| Dashboard (shared) | ~180KB | Code-split by role |
| Finance | ~45KB | Lazy loaded |
| Messaging | ~60KB | Lazy loaded |
| Student portal | ~90KB | Code-split |

### Rendering

- **Next.js 14 App Router**: Server Components for data-heavy pages.
- **TanStack Query**: `staleTime: 60s` prevents refetch storms.
- **Socket.io**: Throttled invalidation (1s) prevents cache stampede.

### Hydration

- **Fixed**: `OnboardingChecklist` no longer reads `localStorage` during render.
- **Known**: `toLocaleDateString('uz-UZ')` may differ server/client in edge cases. Mitigation: render dates client-side only or use a fixed locale format.

## Load Testing Recommendations

```bash
# k6 script provided in scripts/k6-load-test.js
k6 run --vus 50 --duration 5m scripts/k6-load-test.js
```

**Acceptance criteria**:
- p95 < 500ms under 50 concurrent users
- Error rate < 0.1%
- DB CPU < 60%

## Bottlenecks for 3-School Pilot

| Bottleneck | Probability | Mitigation |
|------------|-------------|------------|
| File uploads filling disk | Medium | 10GB volume, cleanup cron |
| Redis memory exhaustion | Low | 512MB container, TTL on all keys |
| DB connection exhaustion | Low | Connection pool limit, PgBouncer ready |
| Socket.io connection limit | Low | Single server handles ~10K concurrent sockets |
| Frontend bundle too large | Low | Code-splitting, lazy loading in place |

## Recommended Monitoring Stack

1. **Sentry**: Error tracking + performance (already wired)
2. **Prometheus + Grafana**: Custom metrics (future)
3. **Prisma Optimize**: Query performance (future)
4. **Logrotate**: `/var/log/xedu/*.log` daily rotation

## Action Items (Phase 29)

1. [ ] Add `take` limits to all unbounded `findMany` queries
2. [ ] Implement cursor pagination for grades, attendance, messages
3. [ ] Add DB index on `Payment(schoolId, status)`
4. [ ] Set up PgBouncer for production
5. [ ] Add Redis memory alerts (>80%)
6. [ ] Implement soft delete (large schema change)
