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

1. **Soft delete**: Not implemented. Deleted records are permanently removed. Mitigation: confirmation dialogs on all destructive actions.
2. **AI features**: Stubs only. No real LLM integration yet.
3. **Mobile app**: Web-only. PWA installable but not native.
4. **Multi-school analytics**: Super-admin sees school list but no cross-school dashboards yet.
5. **SMS gateway**: Not integrated. Notifications are in-app + email only.
