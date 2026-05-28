# Pilot School Launch Checklist

> **Goal**: Can 3 real private schools start using Xedu next week without operational collapse?

## Pre-Launch (Day -3)

### Infrastructure
- [ ] PostgreSQL 16 container running, backups configured (`pg_dump` daily cron)
- [ ] Redis container running, `maxmemory-policy allkeys-lru` set
- [ ] Docker Compose prod file validated: `docker compose -f docker-compose.prod.yml config`
- [ ] Environment variables set: `JWT_SECRET` (256-bit), `REFRESH_SECRET`, `REDIS_URL`, `DATABASE_URL`
- [ ] Sentry DSN configured (optional but recommended)
- [ ] SSL certificate valid (Let's Encrypt or custom)
- [ ] Domain DNS A-record points to server IP

### Security
- [ ] `pnpm qa:permissions` passes (all routes have auth decorators)
- [ ] `pnpm qa:routes` passes (all pages have permission entries)
- [ ] `super_admin` blanket bypass removed (RolesGuard hardened)
- [ ] Unknown frontend routes default to deny (`canAccessRoute()`)
- [ ] Rate limiting active (`@nestjs/throttler` — 100 req/min default, 60 req/min display)
- [ ] CORS origin whitelist configured (not `*`)
- [ ] File upload size limits set (avatar 5MB, document 50MB)

### Data
- [ ] `pnpm db:seed:demo` creates demo school successfully
- [ ] `pnpm qa:demo` passes (all 19 checks)
- [ ] Real school onboarding flow tested end-to-end (create school → invite director → first login)
- [ ] Import/rollback tested with sample Excel file

### Monitoring
- [ ] Health check endpoint returns 200: `GET /health`
- [ ] BullMQ queue health included in Terminus check
- [ ] Sentry errors visible in dashboard (trigger test error)
- [ ] Correlation ID present in all response headers (`x-correlation-id`)

## Launch Day (Day 0)

### Per-School Setup
1. Create school via super-admin panel or API
2. Director receives invitation email
3. Director sets password on first login
4. Director completes onboarding wizard (branches, subjects, classes)
5. Director invites teachers via email
6. Teachers set passwords and see their schedules

### Smoke Tests (run for each school)
- [ ] Login as Director → dashboard loads, no 500 errors
- [ ] Login as Teacher → schedule visible, can take attendance
- [ ] Login as Student → schedule + homework visible
- [ ] Login as Parent → children list visible, can view grades/attendance
- [ ] Login as Accountant → finance dashboard loads, can create fee structure
- [ ] Import 10 students via Excel → success, rollback works
- [ ] Send announcement → appears on recipient dashboards
- [ ] Realtime: open two browsers, send message → appears without refresh

### Phase 7A — Academic Core Flows
- [ ] **Homework → Grade bridge**: Teacher creates homework → student submits → teacher grades → grade appears in gradebook with `source: 'homework'`
- [ ] **Exam → Grade bridge**: Teacher creates exam → student takes online exam → auto-graded → grade appears in gradebook with `source: 'exam'`
- [ ] **Draft/Publish grades**: Teacher creates grade as draft → only teacher sees it → publish → student/parent sees it
- [ ] **Student published-only visibility**: Student cannot see unpublished exams, unpublished grades, or draft homework
- [ ] **Parent published-only visibility**: Parent cannot see unpublished exams or unpublished grades
- [ ] **Grade ownership**: Teacher A cannot edit/delete/publish grades created by Teacher B
- [ ] **Soft-delete grades**: Deleting a grade sets `deletedAt` — it disappears from all views but remains in DB
- [ ] **Exam bulk results**: Teacher uploads bulk exam results → old grades soft-deleted → new grades created atomically in `$transaction`
- [ ] **Online exam session**: Student starts exam → answers saved → submits within time window → auto-graded → grade bridge upserts
- [ ] **Payroll scheduled hours**: Generate monthly payroll → scheduled hours auto-calculated from published timetable
- [ ] **Payroll completed hours**: Mark teacher attendance → recalculate completed hours → payroll updated with actual vs scheduled variance

## Post-Launch (Week 1)

### Daily
- [ ] Check Sentry for new errors
- [ ] Check `/health` uptime
- [ ] Monitor disk space (logs, uploads)

### Weekly
- [ ] Database backup restored to staging (verify integrity)
- [ ] Review audit logs for suspicious activity
- [ ] Check slow query log (Prisma queries > 500ms)

## Escalation Contacts

| Issue | Contact | Response |
|-------|---------|----------|
| Server down | DevOps / Hosting provider | < 15 min |
| Data loss | DBA / Backup admin | < 1 hour |
| Security incident | Security lead | < 30 min |
| User locked out | Support / Director | < 4 hours |

## Known Limitations (Pilot Phase)

1. **AI features**: Rule-based analytics only. No LLM integration yet. AI extension planned.
2. **Mobile**: Responsive web interface. PWA planned.
3. **Multi-school analytics**: Super-admin sees school list but no cross-school dashboards yet.
4. **SMS gateway**: Not integrated. Notifications are in-app + email only.
5. **Export sync processing**: Large exports run in the request thread — may timeout for very large datasets.
6. **Timetable greedy generator N+1**: Basic generator hits DB for every candidate slot — use advanced solver for medium+ schools.
7. **Student/Parent shared routes**: `/dashboard/attendance` and `/dashboard/exams` show teacher-oriented UI when accessed directly by students/parents. Students/parents should use `/dashboard/student` and `/dashboard/parent` portals.
