# Pilot Review Framework

**Version:** 1.0  
**Scope:** Structured reviews at 7, 14, and 30 days. Evidence-based. No opinions without data.

---

## 1. Review Cadence

| Review | When | Duration | Participants |
|--------|------|----------|--------------|
| **7-Day Review** | Day 7 | 1 hour | Pilot Lead, Engineer, Director, VP |
| **14-Day Review** | Day 14 | 1.5 hours | All above + Support Lead |
| **30-Day Review** | Day 30 | 2 hours | All above + Executive |

---

## 2. 7-Day Review

### Goal: Validate activation and early stability

### Agenda

| # | Topic | Time | Evidence Needed |
|---|-------|------|-----------------|
| 1 | System stability | 10 min | Uptime, 500 errors, queue health |
| 2 | Setup completion | 10 min | Onboarding rate, wizard drop-off step |
| 3 | Teacher activation | 10 min | Login rate, active users, support tickets |
| 4 | Schedule status | 10 min | Published? Conflicts? Solver issues? |
| 5 | Attendance routine | 10 min | Daily marking rate, missing classes |
| 6 | Support load | 5 min | Ticket count, response times |
| 7 | P0/P1 status | 5 min | Open blockers, resolution time |

### Success Criteria (7 Days)

| Metric | Threshold | Evidence |
|--------|-----------|----------|
| System uptime | ≥ 99% | `/api/health` logs |
| Setup completion | ≥ 80% | `prisma.school` onboarding flag |
| Teacher activation | ≥ 70% | Audit logs |
| Schedule published | Yes | `prisma.schedule.status` |
| Attendance daily | ≥ 50% classes | `prisma.attendance` daily count |
| P0 count | 0 | Feedback board |
| P1 count | ≤ 2 | Feedback board |

### Go / No-Go Decision

| Outcome | Condition |
|---------|-----------|
| **🟢 Continue** | All green criteria met |
| **🟡 Adjust** | 1–2 yellow criteria; fix and re-evaluate in 3 days |
| **🔴 Pause** | Any red criterion or ≥ 3 yellow |

---

## 3. 14-Day Review

### Goal: Validate adoption and workflow completeness

### Agenda

| # | Topic | Time | Evidence Needed |
|---|-------|------|-----------------|
| 1 | 7-day review actions | 10 min | What was fixed, what wasn't |
| 2 | Grade adoption | 15 min | Grades entered, published, backlog |
| 3 | Homework adoption | 10 min | Created, submitted, graded |
| 4 | Parent activation | 15 min | Login rate, portal usage |
| 5 | Export usage | 10 min | Success rate, timeout frequency |
| 6 | Friction signals | 10 min | `/api/ops/friction` trends |
| 7 | User feedback | 10 min | Interview summaries, sentiment |
| 8 | Support metrics | 10 min | Volume, response time, satisfaction |

### Success Criteria (14 Days)

| Metric | Threshold | Evidence |
|--------|-----------|----------|
| Teacher activation | ≥ 90% | Audit logs |
| Grade publish rate | ≥ 80% | `prisma.grade.isPublished` |
| Homework submission | ≥ 50% | `prisma.homeworkSubmission` |
| Parent activation | ≥ 30% | Audit logs |
| Export success | ≥ 95% | `prisma.exportJob.status` |
| Friction high signals | 0 | `/api/ops/friction` |
| User satisfaction | ≥ 70% positive | Interview notes |

### Go / No-Go Decision

| Outcome | Condition |
|---------|-----------|
| **🟢 Continue to 30 days** | All green criteria met |
| **🟡 Extend pilot** | 1–2 yellow; add 1 week to pilot |
| **🔴 Stop or pivot** | Any red or ≥ 3 yellow |

---

## 4. 30-Day Review

### Goal: Assess business value and renewal potential

### Agenda

| # | Topic | Time | Evidence Needed |
|---|-------|------|-----------------|
| 1 | 14-day review actions | 10 min | Closed loops |
| 2 | Full metrics dashboard | 20 min | All KPIs, trends, comparisons |
| 3 | Workflow completion | 15 min | All 7 funnels healthy? |
| 4 | Cost vs value | 10 min | Support hours, engineering time |
| 5 | User testimonials | 10 min | Quotes, stories, complaints |
| 6 | Technical debt | 10 min | Tickets created, backlog size |
| 7 | Scale readiness | 10 min | Can we onboard school #2? |
| 8 | Renewal decision | 15 min | Go / No-go for next term |

### Success Criteria (30 Days)

| Metric | Threshold | Evidence |
|--------|-----------|----------|
| Setup completion | 100% | `prisma.school.onboardingCompleted` |
| Teacher activation | ≥ 90% | Audit logs |
| Student activation | ≥ 60% | Audit logs |
| Parent activation | ≥ 50% | Audit logs |
| Daily attendance | ≥ 80% classes | `prisma.attendance` |
| Grade publish rate | ≥ 90% | `prisma.grade` |
| P0 count (30d) | ≤ 2 | Feedback board |
| Support response | ≤ 4h avg | Ticket timestamps |
| User satisfaction | ≥ 80% positive | Interviews |
| Director satisfaction | ≥ 4/5 | Direct rating |

### Renewal Decision

| Outcome | Condition | Next Step |
|---------|-----------|-----------|
| **🟢 Renew + Expand** | ≥ 8/10 green | Plan school #2, scale infrastructure |
| **🟡 Renew with Changes** | 6–7/10 green | Fix gaps, extend pilot 2 weeks |
| **🔴 Do Not Renew** | ≤ 5/10 green | Post-mortem, pivot or discontinue |

---

## 5. Review Data Collection

### Automated (Engineer)

| Source | Frequency | What |
|--------|-----------|------|
| `/api/ops/dashboard` | Daily | DAU, WAU, module usage |
| `/api/ops/workflows` | Weekly | Funnel health |
| `/api/ops/friction` | Daily | Friction signals |
| `/api/metrics` | Daily | Counters, errors |
| `prisma` queries | Weekly | Deep-dive validation |

### Manual (Support Lead)

| Source | Frequency | What |
|--------|-----------|------|
| Telegram feedback | Continuous | Issues, questions, complaints |
| Interviews | Weekly (7d, 14d, 30d) | Structured 15-min calls |
| Screen recordings | As needed | UX confusion |
| Support ticket log | Daily | Volume, resolution time |

### Evidence Board Update

After each review, update:
- `docs/PILOT_USAGE_EVIDENCE_BOARD.md`
- `docs/PILOT_FEEDBACK_BOARD.md`
- `docs/PILOT_FEEDBACK_SPRINT_1_REPORT.md` (or next sprint report)

---

## 6. Review Meeting Template

```
=== Pilot Review — Day [N] ===
Date: YYYY-MM-DD
Attendees: [Names]

--- Metrics Snapshot ---
[Insert KPI dashboard]

--- What Worked ---
1. ...
2. ...

--- What Didn't ---
1. ...
2. ...

--- Actions from Last Review ---
| Action | Owner | Status |
|--------|-------|--------|
| ... | ... | Done / In Progress / Blocked |

--- New Actions ---
| Action | Owner | Due |
|--------|-------|-----|
| ... | ... | YYYY-MM-DD |

--- Decision ---
🟢 Continue / 🟡 Adjust / 🔴 Pause
Next review: Day [N]
```

---

> **Last Updated:** 2026-05-28
