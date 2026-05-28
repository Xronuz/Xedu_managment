# First 72h Command Center

**Version:** 1.0  
**Scope:** Live operations for the critical first 72 hours of pilot launch.  
**Rule:** Watch everything. React fast. Document everything.

---

## 1. Command Center Setup

### Physical Setup

| Item | Requirement |
|------|-------------|
| **Location** | Engineer workstation + Support Lead mobile |
| **Screens** | 1: Backend logs, 2: Telegram, 3: Ops dashboard |
| **Connectivity** | Stable internet, backup mobile hotspot |
| **Access** | SSH to server, Docker logs, Prisma Studio |

### Digital Setup

| Tool | Window | Refresh |
|------|--------|---------|
| Terminal — backend logs | `docker compose logs -f backend` | Real-time |
| Terminal — metrics | `watch -n 60 'curl -s localhost:3001/api/metrics'` | Every 60s |
| Browser — ops dashboard | `http://localhost:3001/api/ops/dashboard` | Every 2h |
| Browser — health | `http://localhost:3001/api/health` | Every 15 min |
| Telegram — `#pilot-support` | Always open | Real-time |
| Telegram — `#pilot-alerts` | Always open | Real-time |
| Spreadsheet — monitoring log | Google Sheets / local | Every 2h |

---

## 2. Watch Rhythm (Every 2 Hours)

### T+0 to T+72h Checklist

Run this checklist every 2 hours for the first 72 hours.

```
□ System Health
  □ GET /api/health → 200
  □ GET /api/health/ready → 200
  □ No ERROR lines in backend logs
  □ CPU < 70%, Memory < 80%

□ Metrics
  □ requests_total increasing
  □ errors_total stable (not growing)
  □ pilot_telemetry counters updating
  □ queueFailures = 0

□ Ops Dashboard
  □ DAU > 0
  □ loginCount increasing
  □ No new high friction signals

□ Support
  □ Telegram #pilot-support reviewed
  □ All messages acknowledged
  □ No unresponded P0/P1

□ Queue
  □ Export worker running
  □ Solver worker running
  □ No failed jobs in queue
```

### Schedule

| Time Block | Coverage | Primary | Secondary |
|-----------|----------|---------|-----------|
| 09:00–18:00 Day 1 | Full | Engineer + Support Lead | Pilot Lead on call |
| 18:00–09:00 Day 1 | On-call only | Engineer On-Call | Secondary Engineer |
| 09:00–18:00 Day 2 | Full | Engineer + Support Lead | Pilot Lead |
| 18:00–09:00 Day 2 | On-call only | Engineer On-Call | Secondary |
| 09:00–18:00 Day 3 | Full | Support Lead | Engineer (as needed) |
| 18:00–09:00 Day 3 | On-call only | Engineer On-Call | Secondary |

---

## 3. Hour 0–24 (Launch Day)

### 09:00 — Launch

| Task | Owner | Done |
|------|-------|------|
| Final health check | Engineer | ☐ |
| Notify director: "System is live" | Pilot Lead | ☐ |
| Post in Telegram: "Xedu pilot boshlandi" | Support Lead | ☐ |
| Start monitoring log | Engineer | ☐ |

### 09:30 — Director Check

| Task | Owner | Done |
|------|-------|------|
| Director logged in? | Support Lead | ☐ |
| Setup wizard started? | Support Lead | ☐ |
| Any support messages? | Support Lead | ☐ |

### 12:00 — Midday Pulse

| Task | Owner | Done |
|------|-------|------|
| Director onboarding status | Engineer | ☐ |
| Teacher invitations sent? | Support Lead | ☐ |
| Any P0/P1? | Engineer | ☐ |
| System metrics healthy? | Engineer | ☐ |

### 18:00 — End of Day 1

| Task | Owner | Done |
|------|-------|------|
| Day 1 summary written | Engineer | ☐ |
| P0/P1 count | Engineer | ☐ |
| Director onboarding complete? | Pilot Lead | ☐ |
| Teachers logged in? | Support Lead | ☐ |
| Post day-1 summary to team | Pilot Lead | ☐ |

---

## 4. Hour 24–48 (Day 2)

### Focus: Teacher Activation

| Time | Check | Owner |
|------|-------|-------|
| 08:00 | Teacher login count (24h) | Engineer |
| 10:00 | Setup wizard completion check | Support Lead |
| 12:00 | First attendance mark check | Support Lead |
| 14:00 | Support message review | Support Lead |
| 16:00 | Schedule generation status | Engineer |
| 18:00 | Day 2 summary | Engineer |

### Key Questions

- Did all invited teachers log in?
- Did director complete onboarding?
- Is attendance being marked?
- Any blocked workflows?

---

## 5. Hour 48–72 (Day 3)

### Focus: Routine Validation

| Time | Check | Owner |
|------|-------|-------|
| 08:00 | DAU, WAU, login trend | Engineer |
| 10:00 | Schedule publish status | Support Lead |
| 12:00 | Grade entry check | Support Lead |
| 14:00 | Friction signals review | Engineer |
| 16:00 | Export test (if requested) | Engineer |
| 18:00 | Day 3 summary + 72h report | Engineer + Pilot Lead |

### 72h Report Template

```
=== 72h Pilot Report ===
Date: YYYY-MM-DD
School: Xedu Pilot Maktabi

--- System ---
Uptime: X hours
500 errors: X
Queue failures: X

--- Activation ---
Director: onboarded / not
Teachers logged in: X / Y (%)
Students logged in: X / Y (%)
Parents logged in: X / Y (%)

--- Usage ---
Attendance classes marked (3d): X / Y (%)
Grades entered: X
Homework created: X
Schedule published: yes / no

--- Support ---
Tickets opened: X (P0: a, P1: b, P2: c)
Tickets resolved: X
Avg response time: X hours

--- Friction ---
High signals: [list]
Medium signals: [list]

--- Risks ---
New risks: [list]
Escalated risks: [list]

--- Verdict ---
🟢 On track / 🟡 Needs attention / 🔴 At risk

--- Next 48h Actions ---
1. ...
2. ...
```

---

## 6. Escalation Rules (72h)

| Condition | Action | Timeframe |
|-----------|--------|-----------|
| P0 reported | Engineer On-Call drops everything | Immediate |
| Director not onboarded by 18:00 Day 1 | Pilot Lead calls director | 18:00 Day 1 |
| < 50% teachers logged in by 18:00 Day 2 | Pilot Lead + Support Lead phone calls | 18:00 Day 2 |
| Attendance < 30% by Day 3 | VP intervention at school | Day 3 morning |
| ≥ 3 P1 tickets open | Engineering sprint triggered | Day 2 |
| System down > 15 min | Notify all stakeholders | 15 min |
| System down > 1 hour | Consider rollback | 1 hour |

---

## 7. Communication Cadence

| Audience | Channel | Frequency | Content |
|----------|---------|-----------|---------|
| Engineer + Support Lead | Telegram internal | Real-time | Alerts, quick updates |
| Pilot Lead | Telegram + summary | 2× daily | Status, decisions needed |
| School Director | Telegram / phone | Daily | Progress, issues, next steps |
| All team | Written summary | Daily 18:00 | Monitoring log |
| Executive | Written report | 72h | Go/no-go assessment |

---

## 8. Shutdown Criteria

If ANY of these happen, consider pausing the pilot:

| Condition | Who Decides |
|-----------|-------------|
| P0 bug affects all users for > 2 hours | Engineer + Pilot Lead |
| Data corruption confirmed | Engineer + Pilot Lead |
| < 30% teacher activation by Day 3 | Pilot Lead |
| Director abandons onboarding | Pilot Lead |
| ≥ 5 P1 tickets with no resolution path | Pilot Lead |
| System down > 2 hours with no ETA | Pilot Lead |

**Pause procedure:**
1. Notify school director immediately
2. Post in `#pilot-alerts`: "Pilot paused due to [reason]"
3. Engineer focuses on fix
4. Pilot Lead schedules post-mortem
5. Resume only after fix verified + director agrees

---

> **Last Updated:** 2026-05-28
