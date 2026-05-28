# Pilot Runbook — Xedu Platform

**Version:** 1.0  
**Scope:** Real pilot school execution — operational procedures, not marketing.  
**Assumption:** Backend is deployed and reachable. This runbook is for the person (engineer or director) executing the pilot.

---

## 1. Pre-Onboarding Checklist

### Infrastructure (Engineer)

| # | Task | Verification | Owner |
|---|------|-----------|-------|
| 1.1 | Backend deployed and healthy | `GET /api/health` returns 200 | Engineer |
| 1.2 | Readiness check passes | `GET /api/health/ready` returns 200 | Engineer |
| 1.3 | Metrics endpoint reachable | `GET /api/metrics` returns Prometheus text | Engineer |
| 1.4 | Frontend loads without 404 | `GET /` returns 200 | Engineer |
| 1.5 | Swagger docs accessible | `GET /api/docs` loads | Engineer |
| 1.6 | PostgreSQL has ≥ 500MB free | Readiness disk check passes | Engineer |
| 1.7 | Redis responding | Health check: `redis: { status: 'up' }` | Engineer |
| 1.8 | Backup script executable | `scripts/ops/backup.sh` runs without error | Engineer |
| 1.9 | Environment variables validated | `scripts/ops/validate-env.sh` passes | Engineer |
| 1.10 | Migrate container ran successfully | `docker compose logs migrate` shows "success" | Engineer |

### School Account (Super Admin)

| # | Task | Verification | Owner |
|---|------|-----------|-------|
| 2.1 | School created in system | School has slug, name, address | Super Admin |
| 2.2 | Director account created | `director@<school>.uz` exists with role `director` | Super Admin |
| 2.3 | Branch created | At least one branch with code | Super Admin |
| 2.4 | Director assigned to branch | `user.branchId` is set | Super Admin |
| 2.5 | Director can log in | Login API returns 200 + tokens | Super Admin |
| 2.6 | Director sees dashboard | `GET /api/ops/dashboard` accessible (if admin) | Super Admin |

---

## 2. Required Environment Setup

### Backend Environment

```bash
# Minimum required env vars for pilot
DATABASE_URL=postgresql://...        # PostgreSQL connection
JWT_SECRET=...                       # ≥ 32 chars
JWT_REFRESH_SECRET=...               # ≥ 32 chars
REDIS_HOST=redis                     # or localhost
REDIS_PORT=6379
REDIS_PASSWORD=...                   # or empty for dev
ALLOWED_ORIGINS=https://...          # Frontend URL
APP_URL=https://...                  # Backend public URL
NODE_ENV=production
LOG_LEVEL=info
```

### Frontend Environment

```bash
NEXT_PUBLIC_API_URL=https://.../api/v1
NEXT_PUBLIC_WS_URL=https://...
```

### Docker Compose (Self-Hosted)

```bash
# Verify config is valid
docker compose -f docker-compose.selfhost.yml config --quiet

# Check disk
df -h /

# Check memory
free -h
```

---

## 3. Admin Preparation

### Before Director Logs In

1. **Verify school profile is complete**
   - Name, address, phone, email filled
   - Timezone set to `Asia/Tashkent`
   - `onboardingStep = 0`, `onboardingCompleted = false`

2. **Verify branch exists**
   - Name, code, address
   - `schoolId` matches the school

3. **Verify director has correct role**
   - `role = 'director'`
   - `schoolId` and `branchId` set
   - `isActive = true`

4. **Pre-load subjects** (optional but recommended)
   - `Matematika`, `Fizika`, `Kimyo`, `Biologiya`, `Ingliz tili`, `Ona tili`, `Tarix`, `Geografiya`, `Adabiyot`, `Informatika`
   - Use `POST /api/subjects` or direct DB seed

5. **Pre-load rooms** (optional)
   - Room numbers for schedule generation

---

## 4. Teacher Preparation

### Before Teachers Receive Invitations

1. **Class structure decided**
   - Class names (e.g., 1A, 1B, 2A)
   - Grade levels
   - Which branch each class belongs to

2. **Subject assignments known**
   - Which teacher teaches which subject(s)
   - Teaching load hours per week

3. **Teacher email list ready**
   - One email per teacher
   - Format: `teacher1@school.uz`

4. **Invitation workflow tested**
   - Director sends invitation via `POST /api/invitations`
   - Teacher receives email (or link shared manually)
   - Teacher accepts via `POST /api/invitations/accept`
   - Teacher logs in successfully

---

## 5. Student / Parent Preparation

### Before Students Are Enrolled

1. **Student roster ready**
   - Full name, class assignment, parent contact
   - CSV format for bulk import if needed

2. **Parent phone/email collected**
   - One parent per student minimum
   - Used for portal access

3. **Parent invitation tested**
   - Same flow as teacher invitation
   - Parent can see child's attendance and grades

### Student Portal Expectations

- Students log in with provided credentials
- Students see: schedule, homework, grades, coins (if enabled)
- Students cannot: edit schedules, publish grades, mark attendance

### Parent Portal Expectations

- Parents log in with provided credentials
- Parents see: child's attendance, grades, schedule, announcements
- Parents cannot: create homework, mark attendance, publish grades

---

## 6. Data Migration Readiness

### Supported Import Types

| Type | Endpoint | Format | Notes |
|------|----------|--------|-------|
| Students | `POST /api/import/students/parse` → `commit` | CSV | Template available |
| Users | `POST /api/import/users/parse` → `commit` | CSV | Bulk staff import |
| Schedule | `POST /api/import/schedule/parse` → `commit` | CSV | Time slots |
| Grades | `POST /api/import/grades/parse` → `commit` | CSV | Score per student |
| Attendance | `POST /api/import/attendance/parse` → `commit` | CSV | Daily marks |

### Pre-Migration Checklist

| # | Task |
|---|------|
| 6.1 | CSV templates downloaded from `/api/import/templates/:type` |
| 6.2 | Data validated against template format |
| 6.3 | `parse` endpoint tested with sample rows |
| 6.4 | Rollback plan understood (`POST /api/import/rollback`) |
| 6.5 | Backup taken before bulk import |

### Rollback Procedure

```
1. Identify bad import via audit logs
2. Call POST /api/import/rollback with import session ID
3. Verify data restored via GET endpoints
4. If rollback fails: restore from backup script
```

---

## 7. Rollback Path

### Scenario A: Bad Data Import

1. Stop all new imports
2. Call `POST /api/import/rollback` with session ID
3. Verify counts match pre-import state
4. Fix CSV and re-import

### Scenario B: Corrupted School Data

1. Export current state (if salvageable)
2. Delete school via `DELETE /api/super-admin/schools/:id` (cascade)
3. Re-create school from scratch
4. Re-invite all users

### Scenario C: Total Backend Failure

1. `docker compose down`
2. Restore PostgreSQL from latest backup:
   ```bash
   gunzip -c /opt/backups/db_YYYYMMDD_HHMMSS.sql.gz | \
     docker compose exec -T postgres psql -U eduplatform eduplatform_db
   ```
3. `docker compose up -d`
4. Verify health endpoint

### Scenario D: Database Reset (Nuclear Option)

```bash
# WARNING: All data lost
docker compose down -v
docker compose up -d --build
# Re-run migrations and seed data
```

---

## 8. Support Escalation

### Level 1 — Self-Service

| Resource | Location |
|----------|----------|
| API Docs | `/api/docs` |
| Health Check | `/api/health` |
| Metrics | `/api/metrics` |
| Feedback Board | `docs/PILOT_FEEDBACK_BOARD.md` |

### Level 2 — Pilot Support

| Channel | Response Time | For |
|---------|--------------|-----|
| Telegram `#pilot-support` | 4 hours | How-to questions, minor issues |
| Screen recording (Loom) | Next day | UX confusion, workflow gaps |

### Level 3 — Engineering

| Channel | Response Time | For |
|---------|--------------|-----|
| GitHub issue / ticket | 24 hours | P0/P1 bugs, performance issues |
| Direct call | Immediate | P0 blockers only |

### Escalation Tree

```
User Problem
    ↓
Can user solve with docs? → Yes → Done
    ↓ No
Pilot support (Telegram) → Resolved? → Yes → Done
    ↓ No
Engineering ticket → P0? → Yes → Immediate fix
    ↓ No
Sprint backlog → Fix in next release
```

---

## 9. Quick Reference Commands

### Check System Health

```bash
curl -s http://localhost:3001/api/health | jq .
curl -s http://localhost:3001/api/health/ready | jq .
```

### Check Metrics

```bash
curl -s http://localhost:3001/api/metrics | grep pilot_telemetry
```

### Check Ops Dashboard

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"director@demo-school.uz","password":"Director123!"}' | jq -r '.data.tokens.accessToken')
curl -s http://localhost:3001/api/ops/dashboard -H "Authorization: Bearer $TOKEN" | jq .
```

### Check Workflow Funnels

```bash
curl -s http://localhost:3001/api/ops/workflows -H "Authorization: Bearer $TOKEN" | jq .
```

### Check Friction Signals

```bash
curl -s http://localhost:3001/api/ops/friction -H "Authorization: Bearer $TOKEN" | jq .
```

### Trigger Backup

```bash
./scripts/ops/backup.sh /opt/backups
```

---

## 10. Contact Sheet

| Role | Name | Contact | Responsibility |
|------|------|---------|----------------|
| Pilot Lead | [Name] | [Telegram/Phone] | Overall pilot success |
| Technical Lead | [Name] | [Telegram/Phone] | P0/P1 fixes, infrastructure |
| School Director | [Name] | [Phone] | On-site coordination |
| Support | [Name] | [Telegram] | Day-to-day questions |

---

> **Last Updated:** 2026-05-28  
> **Next Review:** After first pilot week
