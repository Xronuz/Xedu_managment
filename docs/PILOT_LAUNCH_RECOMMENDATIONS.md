# Pilot Launch Recommendations

**Version:** 1.0  
**Date:** 2026-05-28  
**Scope:** Top 10 actionable recommendations for pilot launch execution.  
**Rule:** No roadmap features. No technical scope expansion. Operational focus only.

---

## Top 10 Launch Recommendations

### 1. Engineer On Standby for Director Day 1 (Immediate)

| Field | Value |
|-------|-------|
| **What** | Engineer must be available via Telegram/call during director's first 2 hours |
| **Why** | 80% onboarding drop-off observed in dry run. Real-time help prevents abandonment. |
| **Evidence** | `PILOT_DRY_RUN_REPORT.md` — Friction #1: No auto-save in wizard |
| **Action** | Engineer joins director's onboarding session via screen share if needed |
| **Owner** | Pilot Lead |
| **Due** | Day 1, 09:00 |

---

### 2. Pre-Load All School Data Before Director Logs In (Immediate)

| Field | Value |
|-------|-------|
| **What** | Classes, subjects, rooms, periods already configured before Day 1 |
| **Why** | Reduces wizard steps from 7 to 3–4. Director only validates, not creates. |
| **Evidence** | `PILOT_DRY_RUN_REPORT.md` — Director spent 30+ min on subjects and rooms |
| **Action** | Engineer/Super Admin runs setup script the night before |
| **Owner** | Engineer |
| **Due** | Day 0, 20:00 |

---

### 3. Send Teacher Invitations in Batches, Not All at Once (Immediate)

| Field | Value |
|-------|-------|
| **What** | Send 5 invitations first, verify they work, then send remaining 13 |
| **Why** | If invitation email has issue, only 5 affected, not all 18. |
| **Evidence** | `PILOT_RISK_REGISTER.md` — R2: Bad imported data |
| **Action** | Day 1 morning: 5 test invites. Day 1 afternoon: remaining 13. |
| **Owner** | Support Lead |
| **Due** | Day 1 |

---

### 4. Assign a "Teacher Champion" for Peer Support (Week 1)

| Field | Value |
|-------|-------|
| **What** | Identify 1 tech-savvy teacher who helps colleagues |
| **Why** | Teachers trust peers more than external support. Reduces support load. |
| **Evidence** | `PILOT_RISK_REGISTER.md` — R1: Teacher resistance (score 16) |
| **Action** | Ask director to nominate champion. Brief them on Day 5 training. |
| **Owner** | Pilot Lead |
| **Due** | Day 3 |

---

### 5. Daily Attendance Check-in by VP (Week 1)

| Field | Value |
|-------|-------|
| **What** | VP reviews attendance dashboard every morning, nudges missing teachers |
| **Why** | Attendance is the first daily habit. Missing it breaks the routine. |
| **Evidence** | `PILOT_SUCCESS_METRICS.md` — Attendance threshold: ≥ 80% 🟢 |
| **Action** | VP gets 5-min morning briefing on which classes missing attendance. |
| **Owner** | VP (Sardor Rahimov) |
| **Due** | Daily, Week 1 |

---

### 6. Grade Publish Reminder Poster in Staff Room (Week 1)

| Field | Value |
|-------|-------|
| **What** | Physical A4 poster: "Bahoni kiriting → NASHR QILING" with screenshots |
| **Why** | Dry run found 304 ungraded submissions. Visual reminder reduces forgetfulness. |
| **Evidence** | `PILOT_DRY_RUN_REPORT.md` — Friction #10: Grade publish step easy to forget |
| **Action** | Print 2 posters (staff room + accountant office) |
| **Owner** | Support Lead |
| **Due** | Day 5 |

---

### 7. Parent SMS + Paper Card Campaign (Week 2)

| Field | Value |
|-------|-------|
| **What** | SMS with portal URL + paper quick-reference card sent home with student |
| **Why** | Parent activation threshold is 60% 🟢. Low email adoption expected. |
| **Evidence** | `PILOT_SCHOOL_PROFILE.md` — IT Readiness: Email partial, Telegram universal |
| **Action** | Director approves SMS text. Support Lead prints cards. |
| **Owner** | Pilot Lead |
| **Due** | Day 8 |

---

### 8. Export Test with Real Data Before Director Needs It (Week 1)

| Field | Value |
|-------|-------|
| **What** | Engineer runs attendance export with real school data before director requests it |
| **Why** | Sample ticket #S003: Export timeout for large date ranges. Catch early. |
| **Evidence** | `PILOT_DRY_RUN_REPORT.md` — Friction #17: Export timeout risk |
| **Action** | Day 4: Test export for full month. If timeout, recommend smaller range. |
| **Owner** | Engineer |
| **Due** | Day 4 |

---

### 9. Weekly Friction Review (Ongoing)

| Field | Value |
|-------|-------|
| **What** | Engineer runs `/api/ops/friction` every Monday, shares results with pilot team |
| **Why** | Detect problems before users complain. Proactive > reactive. |
| **Evidence** | `PILOT_MONITORING_PLAN.md` — Friction signals review weekly |
| **Action** | Add to Monday morning standup agenda. |
| **Owner** | Engineer |
| **Due** | Every Monday |

---

### 10. Document Solver Output Plain Language (Backlog)

| Field | Value |
|-------|-------|
| **What** | When advanced solver is used, output shows human-readable explanations |
| **Why** | VP confused by raw constraint scores in dry run. Avoidable with better UX. |
| **Evidence** | `PILOT_DRY_RUN_REPORT.md` — Friction #7: Solver output shows raw scores |
| **Action** | Backlog for v0.1.3. Not blocking launch. Workaround: Use basic generator. |
| **Owner** | Engineer |
| **Due** | v0.1.3 |

---

## Summary by Category

| Category | Count | Items |
|----------|-------|-------|
| **Immediate** (before/during Day 1) | 3 | #1 Engineer standby, #2 Pre-load data, #3 Batch invitations |
| **Week 1** | 3 | #4 Teacher champion, #5 VP attendance check, #6 Grade poster |
| **Week 2** | 2 | #7 Parent SMS campaign, #8 Export test |
| **Ongoing** | 1 | #9 Weekly friction review |
| **Backlog** | 1 | #10 Solver plain language |

---

## Launch Day Checklist (Condensed)

| Time | Task | Owner |
|------|------|-------|
| Day 0, 20:00 | Pre-load all school data | Engineer |
| Day 1, 08:30 | Final health check | Engineer |
| Day 1, 09:00 | Notify director: "System live" | Pilot Lead |
| Day 1, 09:00 | Engineer on standby | Engineer |
| Day 1, 09:30 | Verify director login | Support Lead |
| Day 1, 10:00 | Send first 5 teacher invites | Support Lead |
| Day 1, 12:00 | Midday pulse check | Engineer |
| Day 1, 14:00 | Send remaining 13 invites | Support Lead |
| Day 1, 18:00 | Day 1 summary | Engineer |
| Day 2–3 | Teacher activation push | Support Lead + VP |
| Day 4 | Export test | Engineer |
| Day 5 | Teacher training session | Pilot Lead |
| Day 5 | Print grade reminder posters | Support Lead |
| Day 8 | Parent SMS + cards | Pilot Lead |
| Day 7 | 7-day review | Pilot Lead |

---

> **Last Updated:** 2026-05-28  
> **Next Update:** After Day 1 summary
