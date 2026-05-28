# Pilot Success Metrics

**Version:** 1.0  
**Scope:** Measurable KPIs for pilot evaluation.  
**Rule:** Every metric has a green/yellow/red threshold. No vanity metrics.

---

## 1. Setup Metrics

### Setup Completion Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 80% of schools complete onboarding | Continue as planned |
| 🟡 Yellow | 50–79% | Investigate drop-off step, add support |
| 🔴 Red | < 50% | Pause pilot, fix onboarding wizard |

**Measurement:** `prisma.school.count({ onboardingCompleted: true }) / prisma.school.count()`

**Frequency:** Daily during first week, then weekly.

---

### Setup Speed

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≤ 1 day from login to completion | Good |
| 🟡 Yellow | 2–3 days | Some friction, monitor |
| 🔴 Red | > 3 days | Significant blocker, intervention needed |

**Measurement:** `onboardingCompletedAt - createdAt` per school.

---

## 2. Activation Metrics

### Teacher Activation Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 90% of invited teachers logged in | Good |
| 🟡 Yellow | 70–89% | Resend invitations, phone calls |
| 🔴 Red | < 70% | Major issue — investigate invites, training |

**Measurement:** `unique teacher logins (7d) / total active teachers`

**Source:** Audit logs + `prisma.user.count({ where: { role: 'teacher', isActive: true } })`

---

### Student Activation Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 80% of students logged in at least once | Good |
| 🟡 Yellow | 50–79% | Check credentials, classroom demo |
| 🔴 Red | < 50% | Students don't know portal exists |

**Measurement:** `unique student logins (7d) / total active students`

---

### Parent Activation Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 60% of parents logged in | Good |
| 🟡 Yellow | 30–59% | SMS reminder, paper instructions |
| 🔴 Red | < 30% | Parent portal not discovered or trusted |

**Measurement:** `unique parent logins (7d) / total active parents`

---

## 3. Usage Metrics

### Journal Adoption (Teacher)

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 80% of teachers mark attendance daily | Good |
| 🟡 Yellow | 50–79% | Reminder, training refresh |
| 🔴 Red | < 50% | Attendance feature not usable or not understood |

**Measurement:** `prisma.attendance.count({ where: { createdAt: { gte: today } } }) / (classes * weekdays)`

---

### Grade Publish Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 90% of entered grades are published | Good |
| 🟡 Yellow | 70–89% | Add "publish reminder" to teacher dashboard |
| 🔴 Red | < 70% | Teachers don't understand publish vs draft |

**Measurement:** `published grades / total grades`

**Source:** `prisma.grade.groupBy({ by: ['isPublished'] })`

---

### Schedule Publish Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 95% of generated schedules published | Good |
| 🟡 Yellow | 80–94% | Director hesitates to publish — review UX |
| 🔴 Red | < 80% | Schedule has problems or director confusion |

**Measurement:** `published schedules / generated schedules`

---

### Homework Submission Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 70% of homework gets ≥ 1 submission | Good |
| 🟡 Yellow | 40–69% | Students don't see homework or don't care |
| 🔴 Red | < 40% | Homework feature broken or not visible |

**Measurement:** `homework with submissions / total homework`

---

### Announcement Read Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 50% of announcements read by recipients | Good |
| 🟡 Yellow | 20–49% | Add push notification, SMS fallback |
| 🔴 Red | < 20% | Announcements not reaching users |

**Measurement:** `read receipts / total receipts`

---

## 4. Quality Metrics

### Export Success Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 95% of exports complete successfully | Good |
| 🟡 Yellow | 85–94% | Some timeouts — monitor file sizes |
| 🔴 Red | < 85% | Export system unreliable — fix immediately |

**Measurement:** `completed exports / total exports`

**Source:** `prisma.exportJob.groupBy({ by: ['status'] })`

---

### Queue Failure Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≤ 1% queue job failures | Good |
| 🟡 Yellow | 2–5% | Investigate patterns, fix processor |
| 🔴 Red | > 5% | Queue system unstable — stop adding jobs |

**Measurement:** `failed queue jobs / total queue jobs`

**Source:** Export + solver processor logs + `pilot_telemetry_snapshots.queueFailures`

---

### Error 500 Rate

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≤ 0.1% of requests return 500 | Good |
| 🟡 Yellow | 0.1–1% | Review error logs, patch bugs |
| 🔴 Red | > 1% | System unstable — consider rollback |

**Measurement:** `500 responses / total responses`

**Source:** `eduplatform_errors_total` Prometheus metric

---

## 5. Support Metrics

### P0/P1 Ticket Volume

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≤ 1 P0/P1 per week | Sustainable |
| 🟡 Yellow | 2–3 P0/P1 per week | Heavy load, watch for patterns |
| 🔴 Red | > 3 P0/P1 per week | Pilot at risk, consider pause |

**Measurement:** Count of P0/P1 tickets in `PILOT_FEEDBACK_BOARD.md`

---

### Support Response Time

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≤ 4 hours for all tickets | Good |
| 🟡 Yellow | 4–24 hours | Backlog growing, add support resource |
| 🔴 Red | > 24 hours | Users blocked, escalate to engineering |

**Measurement:** `first_response_time - ticket_created_time`

---

### User Satisfaction (Qualitative)

| Threshold | Value | Action |
|-----------|-------|--------|
| 🟢 Green | ≥ 80% positive sentiment in interviews | Good |
| 🟡 Yellow | 50–79% | Mixed — address top complaints |
| 🔴 Red | < 50% | Pilot failing — major intervention needed |

**Measurement:** Weekly interview notes, feedback board sentiment analysis.

---

## 6. Dashboard

### KPI Summary Card

Display on `/api/ops/dashboard` or manual weekly report:

```
Pilot Week N
─────────────────────────
Setup:      ████████░░ 80% 🟢
Teachers:   █████████░ 90% 🟢
Students:   ███████░░░ 70% 🟡
Parents:    ████░░░░░░ 40% 🟡
Attendance: ████████░░ 85% 🟢
Grades:     █████████░ 92% 🟢
Schedule:   █████████░ 95% 🟢
Exports:    █████████░ 98% 🟢
Queue:      ██████████ 99% 🟢
P0/P1:      1 🟢
─────────────────────────
Overall: 🟢 HEALTHY
```

---

## 7. Reporting Cadence

| Frequency | Report | Owner | Audience |
|-----------|--------|-------|----------|
| Daily | Quick health check (automated) | System | Engineer |
| Weekly | KPI dashboard + trends | Pilot Lead | Director, VP, Engineering |
| Bi-weekly | Full pilot report | Pilot Lead | All stakeholders |
| End of pilot | Final evaluation | Pilot Lead | Executive |

---

> **Last Updated:** 2026-05-28
