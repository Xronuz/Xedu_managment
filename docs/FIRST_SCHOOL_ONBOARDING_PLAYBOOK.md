# First School Onboarding Playbook

**Version:** 1.0  
**Scope:** Structured plan for onboarding the first pilot school.  
**Goal:** Get the school from zero to daily operations in 2 weeks.

---

## Overview

| Phase | Timeline | Focus |
|-------|----------|-------|
| Day 0 | Before director logs in | Infrastructure, account creation, data prep |
| Day 1 | Director's first day | Login, setup wizard, initial configuration |
| Week 1 | Days 2–7 | Classes, teachers, subjects, schedule, attendance |
| Week 2 | Days 8–14 | Grades, homework, parent portal, exports, validation |

---

## Day 0 — Pre-Flight

### Tasks (Engineer / Super Admin)

| # | Task | Owner | Success Criteria |
|---|------|-------|-----------------|
| 0.1 | Create school in system | Super Admin | School has slug, name, timezone |
| 0.2 | Create main branch | Super Admin | Branch has code, address, phone |
| 0.3 | Create director account | Super Admin | Director can log in |
| 0.4 | Pre-load standard subjects | Super Admin | ≥ 10 subjects exist |
| 0.5 | Pre-load rooms | Super Admin | ≥ 5 rooms exist |
| 0.6 | Test login flow | Engineer | `POST /api/v1/auth/login` returns 200 |
| 0.7 | Test setup wizard endpoint | Engineer | `GET /api/v1/system-config/onboarding` returns data |
| 0.8 | Send director credentials securely | Super Admin | Director received email with temp password |
| 0.9 | Prepare CSV templates for teachers/students | Engineer | Templates downloaded and explained |
| 0.10 | Schedule Day 1 call with director | Pilot Lead | Call scheduled, agenda shared |

### Risk Indicators

- Director cannot log in → Check account role, password hash, school assignment
- Setup wizard returns errors → Check `system-config` endpoints, Prisma relations
- Frontend 404s → Check `NEXT_PUBLIC_API_URL` points to correct backend

---

## Day 1 — Director Onboarding

### Morning (2 hours)

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 1.1 | Director logs in | Director | Dashboard loads, no errors |
| 1.2 | Setup wizard step 1: School profile | Director | Name, address, phone, email confirmed |
| 1.3 | Setup wizard step 2: Branch setup | Director | Main branch verified, optional branches added |
| 1.4 | Setup wizard step 3: Academic year | Director | Year set (e.g., 2025–2026), terms defined |

### Afternoon (2 hours)

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 1.5 | Setup wizard step 4: Subjects | Director | Subjects reviewed, missing ones added |
| 1.6 | Setup wizard step 5: Rooms | Director | Rooms reviewed, missing ones added |
| 1.7 | Setup wizard step 6: Periods | Director | Time slots defined (e.g., 08:00–08:45) |
| 1.8 | Setup wizard step 7: Confirmation | Director | `onboardingCompleted = true` in DB |

### End of Day Check

```bash
# Engineer verifies
 curl -s http://localhost:3001/api/ops/workflows \
   -H "Authorization: Bearer <director_token>" | jq '.data.workflows[0].stages'
```

Expected: All 5 setup stages show `count >= 1`.

### Risk Indicators

- Director abandons wizard → Check which `onboardingStep` they stopped at
- Subjects missing → Director adds via `POST /api/subjects`
- Periods conflict with existing habits → Adjust before teachers see them

---

## Week 1 — Core Operations

### Day 2 — Classes & Students

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 2.1 | Create classes | Director / Admin | All classes created with grade levels |
| 2.2 | Assign class teachers | Director | Each class has a `classTeacherId` |
| 2.3 | Bulk import students | Director | CSV imported, students assigned to classes |
| 2.4 | Verify student roster | Class Teacher | All students visible in class view |

### Day 3 — Teachers & Teaching Loads

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 3.1 | Send teacher invitations | Director | Invitations sent to all teachers |
| 3.2 | Teachers accept invitations | Teachers | All teachers logged in |
| 3.3 | Assign subjects to teachers | Director | `TeachingLoad` records created |
| 3.4 | Verify teaching loads | VP / Director | Hours per teacher visible and balanced |

### Day 4 — Schedule Generation

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 4.1 | Input constraints | Director | Teacher availability, room preferences set |
| 4.2 | Run basic generator | Director | `POST /api/schedule/generate` returns draft |
| 4.3 | Review draft | VP / Director | No obvious conflicts, all classes covered |
| 4.4 | Run advanced solver (optional) | Director | `POST /api/schedule/advanced-generate` completes |
| 4.5 | Publish schedule | Director | `POST /api/schedule/generate/commit` succeeds |

### Day 5 — Teacher Journal Training

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 5.1 | Teachers view their schedule | Teachers | Personal schedule visible, no confusion |
| 5.2 | Mark attendance demo | Class Teacher | Attendance marked for one class |
| 5.3 | Grade entry demo | Teacher | One grade entered and published |
| 5.4 | Homework creation demo | Teacher | One homework created for a class |
| 5.5 | Q&A session | Pilot Lead | All teacher questions answered |

### Day 6 — Attendance Routine

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 6.1 | Daily attendance marked | Class Teachers | ≥ 80% of classes marked |
| 6.2 | Absence notes added | Class Teachers | Unusual absences documented |
| 6.3 | Attendance report viewed | Director | Daily summary visible on dashboard |

### Day 7 — Weekly Review

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 7.1 | Review attendance report | Director | All days marked, patterns visible |
| 7.2 | Review grade entries | VP | Grades entered, published correctly |
| 7.3 | Check `/api/ops/friction` | Engineer | No unexpected friction signals |
| 7.4 | Collect teacher feedback | Pilot Lead | ≥ 3 teacher feedback items collected |
| 7.5 | Update feedback board | Pilot Lead | Tickets created for issues found |

---

## Week 2 — Advanced Operations

### Day 8 — Homework & Submissions

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 8.1 | Teachers create weekly homework | Teachers | ≥ 5 homework assignments created |
| 8.2 | Students submit homework | Students | ≥ 50% submission rate |
| 8.3 | Teachers grade submissions | Teachers | Grades entered within 48h |

### Day 9 — Exam Setup

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 9.1 | Create first exam | Teacher | Exam created with questions |
| 9.2 | Student takes exam | Student | Session started, answers submitted |
| 9.3 | Grade exam | Teacher | Score calculated and visible |

### Day 10 — Parent Portal Activation

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 10.1 | Send parent invitations | Director | Invitations sent to all parents |
| 10.2 | Parents accept and log in | Parents | ≥ 30% of parents logged in |
| 10.3 | Parents view child data | Parents | Attendance, grades, schedule visible |
| 10.4 | Parent Q&A | Pilot Lead | Parent confusion addressed |

### Day 11 — Payroll Validation

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 11.1 | Verify teacher attendance data | Accountant | Attendance counts match payroll expectations |
| 11.2 | Run payroll preview | Accountant | Salary calculations look correct |
| 11.3 | Identify discrepancies | Accountant / Director | Issues logged, not paid yet |

### Day 12 — Export Validation

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 12.1 | Export attendance report | Director | CSV generated, data correct |
| 12.2 | Export grade report | Director | CSV generated, all students included |
| 12.3 | Export schedule PDF | Director | PDF generated, readable |
| 12.4 | Verify export success rate | Engineer | `GET /api/ops/dashboard` exports show success |

### Day 13 — Support & Feedback

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 13.1 | Review all open tickets | Pilot Lead | P0/P1 triaged, rest in backlog |
| 13.2 | Collect structured feedback | All roles | ≥ 10 feedback items collected |
| 13.3 | Update evidence board | Engineer | Metrics, funnels, friction updated |
| 13.4 | Prepare week 2 report | Pilot Lead | Report draft ready |

### Day 14 — Pilot Review

| # | Activity | Owner | Success Criteria |
|---|----------|-------|-----------------|
| 14.1 | Pilot retrospective meeting | All | Attended by director, VP, teachers, engineer |
| 14.2 | Review success metrics | Pilot Lead | KPIs measured against thresholds |
| 14.3 | Decide on pilot continuation | Pilot Lead | Go / No-go / Adjust decision made |
| 14.4 | Document lessons learned | Pilot Lead | `PILOT_DRY_RUN_REPORT.md` updated |

---

## Success Criteria by Phase

| Phase | Must Achieve | Nice to Have |
|-------|-------------|--------------|
| Day 0 | School + director account ready | Subjects, rooms pre-loaded |
| Day 1 | Onboarding completed | Director comfortable with UI |
| Week 1 | Classes, teachers, schedule, attendance working | Advanced solver used |
| Week 2 | Grades, homework, parent portal, exports working | Payroll validated |

## Risk Indicators by Phase

| Phase | Red Flag | Action |
|-------|----------|--------|
| Day 0 | Director cannot log in | Verify account, reset password, engineer call |
| Day 1 | Onboarding abandoned at step < 4 | Simplify wizard, add save/resume, screen share |
| Week 1 | < 50% teachers logged in | Resend invitations, manual onboarding, phone calls |
| Week 1 | Schedule has conflicts | Manual fix, re-run generator, teach constraints |
| Week 2 | < 20% parent logins | SMS reminder, in-person demo, paper instructions |
| Week 2 | Export timeouts | Use smaller date ranges, async export, engineer fix |

---

> **Last Updated:** 2026-05-28  
> **Next Review:** After first school completes Day 14
