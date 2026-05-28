# Pilot Monitoring Plan

**Version:** 1.0  
**Scope:** Live monitoring for first 2 weeks of pilot.  
**Rule:** Evidence-based alerts. No alert fatigue.

---

## 1. Monitoring Windows

| Window | Duration | Focus | Intensity |
|--------|----------|-------|-----------|
| **Day 1** | 09:00–18:00 | Director onboarding, first logins, setup wizard | High — engineer on standby |
| **Week 1** | Days 2–7 | Teacher activation, schedule generation, attendance routine | Medium — daily check-ins |
| **Week 2** | Days 8–14 | Grades, homework, parent portal, exports | Medium — daily check-ins |

---

## 2. What to Monitor

### Day 1 — Real-Time Watch

| Metric | Check Frequency | Green | Yellow | Red | Action on Red |
|--------|----------------|-------|--------|-----|---------------|
| Director login | Every 30 min | Success ≤ 2 attempts | 3–5 attempts | > 5 attempts or failure | Call director, verify credentials |
| Setup wizard progress | Every 30 min | Step advances | Stuck 1+ hour | Abandoned | Engineer calls director |
| Health endpoint | Every 15 min | 200 | 200 with degraded | 5xx or timeout | Check logs, restart if needed |
| 500 errors | Every 15 min | 0 | 1–2 | ≥ 3 | Investigate immediately |
| Queue failures | Every 30 min | 0 | 0 | ≥ 1 | Check worker logs |
| Support messages | Every 30 min | 0–2 questions | 3–5 questions | ≥ 6 or P0 reported | Activate on-call |

### Week 1 — Daily Pulse

| Metric | Check Time | Green | Yellow | Red | Action on Red |
|--------|-----------|-------|--------|-----|---------------|
| Teacher logins (24h) | 08:00 | ≥ 90% invited | 70–89% | < 70% | Resend invites, phone calls |
| Setup completion | 08:00 | Completed | In progress | Abandoned | Engineer intervention |
| Schedule published | 18:00 | Yes | Draft only | Not generated | Director call, manual help |
| Attendance marked | 18:00 | ≥ 80% classes | 50–79% | < 50% | Reminder to class teachers |
| P0/P1 tickets | 18:00 | 0 | 1 P1 | ≥ 1 P0 or ≥ 2 P1 | Engineering sprint |
| Queue health | 18:00 | 0 failures | 0 failures | ≥ 1 failure | Check workers |
| 500 errors (24h) | 18:00 | 0 | 1–2 | ≥ 3 | Bug fix |

### Week 2 — Daily Pulse

| Metric | Check Time | Green | Yellow | Red | Action on Red |
|--------|-----------|-------|--------|-----|---------------|
| Student logins (24h) | 08:00 | ≥ 50% | 20–49% | < 20% | Classroom demo |
| Parent logins (7d) | 08:00 | ≥ 30% | 10–29% | < 10% | SMS + paper push |
| Grades entered (24h) | 18:00 | ≥ 50% teachers | 20–49% | < 20% | Reminder |
| Grades published | 18:00 | ≥ 90% entered | 70–89% | < 70% | VP review |
| Homework created | 18:00 | ≥ 5 assignments | 1–4 | 0 | Teacher check-in |
| Export success rate | 18:00 | 100% | 1 failure | ≥ 2 failures | Investigate timeout |
| Friction signals | 18:00 | 0 high | 1–2 medium | ≥ 1 high | Address per signal |

---

## 3. Alert Thresholds

### System Alerts (Automated)

| Condition | Severity | Channel | Recipient |
|-----------|----------|---------|-----------|
| `GET /api/health` fails 3× in 5 min | P0 | Telegram `#pilot-alerts` | Engineer On-Call |
| `GET /api/health/ready` fails | P0 | Telegram `#pilot-alerts` | Engineer On-Call |
| 500 errors ≥ 3 in 1 hour | P1 | Telegram `#pilot-alerts` | Engineer |
| Queue failures ≥ 2 in 1 hour | P1 | Telegram `#pilot-alerts` | Engineer |
| Disk free < 500MB | P1 | Telegram `#pilot-alerts` | Engineer |
| CPU > 90% for 5 min | P2 | Telegram `#pilot-support` | Engineer (next day) |
| Memory > 90% for 5 min | P2 | Telegram `#pilot-support` | Engineer (next day) |

### Business Alerts (Manual Check)

| Condition | Severity | Channel | Recipient |
|-----------|----------|---------|-----------|
| Director not logged in by 12:00 Day 1 | P1 | Telegram `#pilot-alerts` | Pilot Lead |
| < 50% teachers logged in by Day 3 | P1 | Telegram `#pilot-support` | Pilot Lead |
| Setup wizard abandoned | P1 | Telegram `#pilot-alerts` | Engineer + Pilot Lead |
| Attendance < 50% by Day 5 | P1 | Telegram `#pilot-support` | Pilot Lead |
| Parent activation < 10% by Day 10 | P2 | Telegram `#pilot-support` | Pilot Lead |
| Grading backlog > 50 ungraded | P2 | Telegram `#pilot-support` | VP + Pilot Lead |

---

## 4. Monitoring Tools

| Tool | What | How Often | Owner |
|------|------|-----------|-------|
| `curl /api/health` | System liveness | Every 15 min (Day 1), hourly (Week 1+) | Automated / Engineer |
| `curl /api/metrics` | Counters, errors, queue | Every 30 min | Engineer |
| `curl /api/ops/dashboard` | Usage snapshot | 2× daily | Engineer |
| `curl /api/ops/friction` | Friction signals | Daily | Engineer |
| `prisma query` | Deep-dive validation | As needed | Engineer |
| Telegram `#pilot-support` | User issues | Continuous | Support Lead |
| Audit logs | User action trace | Daily | Engineer |

---

## 5. Daily Monitoring Log Template

```
=== Pilot Monitoring Log — 2026-MM-DD ===
Engineer on duty: [Name]
Support Lead: [Name]

--- System Health ---
Health: 200 / degraded / down
Ready: 200 / degraded / down
Uptime: [hours]
500 errors (24h): [count]
Queue failures (24h): [count]

--- Usage Pulse ---
Director login: yes / no
Teachers logged in (24h): X / Y invited (%)
Students logged in (24h): X / Y total (%)
Parents logged in (7d): X / Y invited (%)
Attendance classes marked: X / Y total (%)
Grades entered (24h): X
Homework created (24h): X

--- Friction ---
Signals: [list]
High: X | Medium: Y | Low: Z

--- Tickets ---
Opened today: X (P0: a, P1: b, P2: c, P3: d)
Resolved today: X
Open total: X

--- Actions ---
[What was done today]

--- Risks ---
[Emerging risks]
```

---

## 6. Escalation During Monitoring

| Scenario | Who | When | How |
|----------|-----|------|-----|
| System down | Engineer On-Call | Immediate | Telegram alert + phone |
| Director stuck | Pilot Lead | Within 1h | Telegram + call |
| Teacher mass issue | Support Lead | Within 2h | Telegram group message |
| P0 bug confirmed | Engineer | Immediate | Stop current work, fix |
| Data corruption | Engineer + Pilot Lead | Immediate | Rollback assessment |

---

> **Last Updated:** 2026-05-28
