# Pilot Launch Gate

**Version:** 1.0  
**Date:** 2026-05-28  
**Rule:** 🟢 Green = go. 🟡 Yellow = go with caution. 🔴 Red = no launch.

---

## 1. Deployment Health

| # | Check | Verification | Status | Evidence |
|---|-------|-------------|--------|----------|
| 1.1 | Backend responding | `GET /api/health` → 200 | 🟢 | Direct curl test |
| 1.2 | Readiness check passes | `GET /api/health/ready` → 200 | 🟢 | Disk, DB, env, queue all pass |
| 1.3 | Frontend loads | `GET /` → 200 | 🟢 | Browser / curl test |
| 1.4 | API docs accessible | `GET /api/docs` → 200 | 🟢 | Swagger UI loads |
| 1.5 | Metrics endpoint up | `GET /api/metrics` → 200 | 🟢 | Prometheus text returned |
| 1.6 | No 500 errors in last 24h | `eduplatform_errors_total` = 0 | 🟢 | Metrics endpoint |
| 1.7 | CPU usage < 70% | `top` or Docker stats | 🟢 | Normal load |
| 1.8 | Memory usage < 80% | `free -h` or Docker stats | 🟢 | Normal load |

**Deployment Gate:** 🟢 **PASS**

---

## 2. Metrics Health

| # | Check | Verification | Status | Evidence |
|---|-------|-------------|--------|----------|
| 2.1 | Telemetry counters active | `/api/metrics` includes `pilot_telemetry` | 🟢 | 14 counters present |
| 2.2 | Request counter incrementing | `eduplatform_requests_total` > 0 | 🟢 | TransformInterceptor active |
| 2.3 | Error counter accurate | `eduplatform_errors_total` matches reality | 🟢 | GlobalExceptionFilter wired |
| 2.4 | Export job counters present | `eduplatform_export_jobs_total` visible | 🟢 | MetricsController returns counts |
| 2.5 | Solver run counters present | `eduplatform_solver_runs_total` visible | 🟢 | MetricsController returns counts |

**Metrics Gate:** 🟢 **PASS**

---

## 3. Health Endpoints

| # | Check | Verification | Status | Evidence |
|---|-------|-------------|--------|----------|
| 3.1 | Liveness (`/api/health`) | DB up, memory OK, Redis up | 🟢 | All indicators green |
| 3.2 | Readiness (`/api/health/ready`) | DB, disk ≥ 500MB, env valid, queue OK | 🟢 | All indicators green |
| 3.3 | Ops dashboard (`/api/ops/dashboard`) | Returns data for director role | 🟢 | Tested with director token |
| 3.4 | Workflow funnels (`/api/ops/workflows`) | Returns 7 funnels | 🟢 | Tested with director token |
| 3.5 | Friction signals (`/api/ops/friction`) | Returns signals array | 🟢 | Tested with director token |

**Health Gate:** 🟢 **PASS**

---

## 4. Backup & Rollback

| # | Check | Verification | Status | Evidence |
|---|-------|-------------|--------|----------|
| 4.1 | Backup script executable | `scripts/ops/backup.sh` runs | 🟢 | Manual test passed |
| 4.2 | Latest backup exists | `ls /opt/backups/db_*.sql.gz` | 🟢 | File present |
| 4.3 | Backup integrity | `gunzip -t` passes | 🟢 | Archive valid |
| 4.4 | Rollback procedure documented | `PILOT_RUNBOOK.md` Section 7 | 🟢 | 4 scenarios covered |
| 4.5 | Import rollback tested | `POST /api/import/rollback` works | 🟢 | Tested with sample import |
| 4.6 | Restore procedure validated | Engineer walked through restore | 🟢 | Dry-run completed |

**Backup Gate:** 🟢 **PASS**

---

## 5. Accounts & RBAC

| # | Check | Verification | Status | Evidence |
|---|-------|-------------|--------|----------|
| 5.1 | Director account created | `prisma.user.findUnique({ email: 'director@xedu-pilot-001.uz' })` | 🟢 | Exists with role `director` |
| 5.2 | Director can log in | `POST /api/v1/auth/login` → 200 | 🟢 | Direct test |
| 5.3 | Director sees ops dashboard | `GET /api/ops/dashboard` → 200 | 🟢 | RBAC allows director |
| 5.4 | VP account created | `prisma.user.findUnique({ email: 'vice@xedu-pilot-001.uz' })` | 🟢 | Exists with role `vice_principal` |
| 5.5 | Teacher accounts ready | 18 invitations prepared | 🟢 | CSV ready, can bulk invite |
| 5.6 | RBAC enforced on admin endpoints | `GET /api/ops/dashboard` with student token → 403 | 🟢 | RolesGuard active |
| 5.7 | Branch scoping works | Users only see own branch data | 🟢 | Service layer filters by `branchId` |

**Accounts Gate:** 🟢 **PASS**

---

## 6. Training Readiness

| # | Check | Verification | Status | Evidence |
|---|-------|-------------|--------|----------|
| 6.1 | Director training material ready | `PILOT_TRAINING_MATRIX.md` | 🟢 | 10 workflows documented |
| 6.2 | Teacher training material ready | `PILOT_TRAINING_MATRIX.md` | 🟢 | 7 workflows documented |
| 6.3 | Parent quick-reference ready | `PILOT_TRAINING_MATRIX.md` | 🟢 | 6 workflows documented |
| 6.4 | Training session scheduled | Day 5 live session booked | 🟡 | Calendar invite sent, not confirmed |
| 6.5 | Demo accounts available | `director@demo-school.uz` works | 🟢 | Tested locally |
| 6.6 | Support team briefed | `PILOT_SUPPORT_OPERATIONS.md` reviewed | 🟢 | All know channels and SLA |

**Training Gate:** 🟢 **PASS** (1 yellow: training session confirmation pending)

---

## 7. Data Validation

| # | Check | Verification | Status | Evidence |
|---|-------|-------------|--------|----------|
| 7.1 | School profile complete | Name, address, timezone, email | 🟢 | DB record verified |
| 7.2 | Branch configured | Name, code, address, phone | 🟢 | DB record verified |
| 7.3 | Subjects pre-loaded | ≥ 10 standard subjects | 🟢 | `prisma.subject.count()` |
| 7.4 | Rooms configured | ≥ 5 rooms | 🟢 | `prisma.room.count()` |
| 7.5 | Periods defined | Time slots for all days | 🟢 | `prisma.period.count()` |
| 7.6 | Student CSV validated | `parse` endpoint tested | 🟢 | Sample rows passed |
| 7.7 | No orphan records | All `schoolId` / `branchId` references valid | 🟢 | Foreign key integrity |

**Data Gate:** 🟢 **PASS**

---

## 8. Dry Run Validation

| # | Check | Verification | Status | Evidence |
|---|-------|-------------|--------|----------|
| 8.1 | Dry run completed | `PILOT_DRY_RUN_REPORT.md` | 🟢 | 10-day simulation done |
| 8.2 | No P0 blockers found | Dry run verdict | 🟢 | "READY FOR PILOT" |
| 8.3 | High-priority friction logged | 2 high-priority items | 🟡 | Documented, not yet fixed |
| 8.4 | Medium friction acknowledged | 9 medium items | 🟡 | Documented, training addresses most |
| 8.5 | Rollback tested | Bad import → rollback → verify | 🟢 | Procedure works |

**Dry Run Gate:** 🟢 **PASS** (2 yellow: high-priority friction not yet fixed — mitigated via training)

---

## 9. Known Issues at Launch

| # | Issue | Severity | Impact on Launch | Mitigation |
|---|-------|----------|------------------|------------|
| 9.1 | 304 ungraded submissions (demo data) | Low | None — demo data, not pilot school | Will not affect pilot |
| 9.2 | No grade publish reminder | Medium | Teachers may forget | Training emphasis + VP check |
| 9.3 | No wizard auto-save | Medium | Director may lose progress | Day 1 call + engineer standby |
| 9.4 | 10 pre-existing test failures | Low | None — test-only, not production | Known, accepted |

---

## 10. Final Gate Decision

| Gate | Status | Blockers |
|------|--------|----------|
| Deployment Health | 🟢 | None |
| Metrics Health | 🟢 | None |
| Health Endpoints | 🟢 | None |
| Backup & Rollback | 🟢 | None |
| Accounts & RBAC | 🟢 | None |
| Training Readiness | 🟢 | 1 yellow (confirmation pending) |
| Data Validation | 🟢 | None |
| Dry Run Validation | 🟢 | 2 yellow (friction documented, not fixed) |

### 🟢 LAUNCH APPROVED

**Conditions:**
1. Training session confirmation received before go-live.
2. Engineer on standby for Day 1 director onboarding.
3. Support Lead monitors Telegram `#pilot-support` 08:00–18:00.

**Launch Date:** 2026-06-02 (Tuesday)  
**Launch Time:** 09:00 Tashkent time  
**Approved By:** Pilot Lead + Engineer Lead

---

> **Last Updated:** 2026-05-28  
> **Next Review:** Day 0 (launch morning)
