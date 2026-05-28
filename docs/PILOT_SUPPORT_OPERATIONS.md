# Pilot Support Operations

**Version:** 1.0  
**Scope:** How pilot users get help. Clear, operational, no ambiguity.

---

## 1. Support Channels

### Channel Matrix

| Channel | Best For | Response SLA | Owner | Hours |
|---------|----------|-------------|-------|-------|
| **Telegram `#pilot-support`** | Quick questions, screenshots, how-to | 4 hours | Support Lead | 08:00–18:00 Tashkent |
| **Telegram `#pilot-alerts`** | P0 blockers, system outages | Immediate | Engineer On-Call | 24/7 |
| **Live call (Google Meet/Zoom)** | Complex walkthrough, screen share | Same day (scheduled) | Support Lead | By appointment |
| **Screen recording (Loom)** | UX confusion, bug demo | Next day | Support Lead | Async |
| **Remote session (AnyDesk/TeamViewer)** | Hands-on fix for non-technical user | Same day (scheduled) | Engineer | By appointment |
| **Issue Board** | Tracked bugs, feature requests, P1+ | 24 hours | Engineering | Async |

### Channel Rules

1. **Always start with Telegram.** Fastest for both sides.
2. **Escalate to call only if** text/screenshots insufficient.
3. **Remote session is last resort.** Security risk, time-consuming.
4. **Issue board is for tracking.** Not for real-time help.

---

## 2. Response SLA

### By Severity

| Severity | Channel | First Response | Resolution Target | Owner |
|----------|---------|---------------|-------------------|-------|
| P0 — Blocker | `#pilot-alerts` + direct call | 15 min | 4 hours | Engineer On-Call |
| P1 — Severe | `#pilot-support` + issue board | 2 hours | 24 hours | Engineer |
| P2 — Moderate | `#pilot-support` | 4 hours | 3–5 days | Support Lead |
| P3 — Minor | `#pilot-support` | 8 hours | Backlog | Support Lead |
| Question | `#pilot-support` | 4 hours | Same day | Support Lead |

### SLA Clock

- **Business hours:** 08:00–18:00 Tashkent time, Monday–Saturday
- **P0 only:** 24/7 clock
- **Weekend:** P0/P1 only; P2/P3 deferred to Monday

---

## 3. Triage Rules

### Step 1 — Identify Severity (First 5 Minutes)

Ask:
1. "Can you still use the system?" → No = P0
2. "Is your daily work blocked?" → Yes = P1
3. "Is there a workaround?" → No = P1; Yes = P2
4. "How many people affected?" → 15+ = escalate severity

### Step 2 — Categorize

| Category | Typical Issues | Default Severity |
|----------|---------------|------------------|
| Login | Can't log in, password reset, account missing | P1 |
| Setup | Wizard stuck, missing subjects, branch error | P1 |
| Schedule | Conflicts, generator fails, can't publish | P1 |
| Attendance | Can't mark, wrong class, missing students | P2 |
| Grades | Can't enter, not publishing, wrong student | P2 |
| Homework | Not visible, can't submit, can't grade | P2 |
| Export | Timeout, wrong data, format issue | P2 |
| Parent portal | Can't log in, wrong child data | P2 |
| Performance | Slow load, timeout | P2 |
| UI/UX | Confusing layout, wrong translation | P3 |
| Feature request | "Can you add X?" | P3 |

### Step 3 — Assign

```
P0 → Engineer On-Call (immediate)
P1 → Engineer (next in queue)
P2 → Support Lead (track, queue)
P3 → Backlog (review weekly)
```

---

## 4. Escalation Tree

### Level 1 — Support Lead

**Handles:** P2, P3, questions  
**Authority:** Can answer how-to, reset passwords, explain workflows  
**Cannot:** Fix bugs, deploy code, access production DB

### Level 2 — Engineer

**Handles:** P1, complex P2  
**Authority:** Can debug, query DB, apply config changes, deploy hotfixes  
**Cannot:** Change product roadmap, add features

### Level 3 — Engineer On-Call + Pilot Lead

**Handles:** P0  
**Authority:** Can stop current work, deploy emergency fixes, call external help  
**Cannot:** Override business decisions (e.g., extend pilot without approval)

### Escalation Paths

```
User → Telegram #pilot-support
    ↓
Support Lead triages
    ↓
    ├── P2/P3 → Support Lead resolves or backlog
    ├── P1 → Escalate to Engineer
    └── P0 → Escalate to Engineer On-Call + Pilot Lead

Engineer cannot resolve P1?
    ↓
Escalate to Pilot Lead for prioritization decision

Engineer On-Call cannot resolve P0?
    ↓
Emergency: Rollback deployment, restore backup, notify all stakeholders
```

---

## 5. Hotfix Policy

### What Qualifies for Hotfix

| Type | Example | Hotfix? |
|------|---------|---------|
| P0 bug preventing login | All users get 401 | ✅ Yes |
| P0 data corruption | Attendance marks overwritten | ✅ Yes |
| P1 schedule publish fails | Director can't publish | ✅ Yes (if no workaround) |
| P1 export timeout | Large export fails | ❌ No (use smaller range) |
| P2 attendance UI confusion | Wrong icon | ❌ No (next release) |
| P3 translation typo | "Davomat" spelled wrong | ❌ No (next release) |

### Hotfix Procedure

1. **Stop** — Engineer On-Call assesses if rollback is safer
2. **Fix** — Branch from `main`, make minimal change, test locally
3. **Review** — If possible, second engineer reviews (async OK for P0)
4. **Deploy** — `git push origin main` triggers deploy workflow
5. **Verify** — Health check passes, user confirms fix
6. **Document** — Add ticket to board with resolution commit

### No-Deploy Windows

| Window | Rule |
|--------|------|
| 00:00–06:00 Tashkent | Avoid unless P0 |
| Friday after 16:00 | No deploys unless P0 |
| Exam periods | Coordinate with school, no surprise deploys |

---

## 6. Communication Templates

### P0 Acknowledgment

```
🚨 P0 received: [brief description]
Engineer on-call notified.
ETA for first update: 15 minutes.
Ticket: #[ID]
```

### P1 Acknowledgment

```
⚠️ P1 received: [brief description]
Assigned to: [Engineer name]
ETA for fix: [24h target]
Workaround: [if any]
Ticket: #[ID]
```

### Resolution

```
✅ Resolved: [brief description]
Fix: [what changed]
Commit: [SHA]
Please verify and reply to close.
```

### Weekly Summary

```
📊 Pilot Support Week [N]
Tickets opened: X
Tickets resolved: Y
P0: Z | P1: Z | P2: Z | P3: Z
Avg response time: X hours
Top issue: [category]
Action: [what we're doing]
```

---

## 7. Support Tools

| Tool | Purpose | Access |
|------|---------|--------|
| Telegram `#pilot-support` | Primary channel | Support Lead, Engineers, Pilot Lead |
| Telegram `#pilot-alerts` | P0 only | Engineer On-Call, Pilot Lead |
| `PILOT_FEEDBACK_BOARD.md` | Ticket tracking | All team |
| `GET /api/ops/dashboard` | System health | Engineer |
| `GET /api/ops/friction` | Friction signals | Engineer |
| `GET /api/metrics` | Prometheus metrics | Engineer |
| `GET /api/health` | Liveness | Engineer |
| Audit logs (`prisma.auditLog`) | User action trace | Engineer |

---

## 8. Support Checklist (Weekly)

| # | Task | Owner | Day |
|---|------|-------|-----|
| 1 | Review all open tickets | Support Lead | Monday |
| 2 | Check `/api/ops/friction` for new signals | Engineer | Monday |
| 3 | Review response time SLA compliance | Support Lead | Monday |
| 4 | Update feedback board status | Support Lead | Daily |
| 5 | Prepare weekly summary | Support Lead | Friday |
| 6 | Review P0/P1 patterns | Pilot Lead | Friday |
| 7 | Plan next week support coverage | Pilot Lead | Friday |

---

> **Last Updated:** 2026-05-28
