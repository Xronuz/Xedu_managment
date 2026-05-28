# Pilot Training Matrix

**Version:** 1.0  
**Scope:** Role-based training for pilot execution. Practical, not theoretical.  
**Time estimates:** Approximate, based on guided walkthrough + solo practice.

---

## Director (Maktab Direktori)

### Must-Know Workflows

| # | Workflow | Time | Critical Mistakes | Success Checkpoint |
|---|----------|------|-------------------|-------------------|
| 1 | Log in + dashboard navigation | 10 min | Using wrong URL; not clearing old password | Dashboard loads, all sidebar items visible |
| 2 | Complete setup wizard | 30 min | Skipping steps; leaving fields blank | `onboardingCompleted = true` in system |
| 3 | Create classes | 15 min | Wrong grade level; missing branch | All classes visible with correct grades |
| 4 | Invite teachers | 10 min | Wrong email; wrong role | Teachers receive invitation link |
| 5 | Assign teaching loads | 20 min | Overloading one teacher; missing subject | Balanced hours per teacher |
| 6 | Generate and publish schedule | 30 min | Not reviewing draft; publishing with conflicts | Schedule published, no conflicts |
| 7 | View attendance reports | 10 min | Wrong date range; wrong class | Report shows all classes, correct dates |
| 8 | Export data (CSV/PDF) | 10 min | Wrong format; wrong date range | File downloads, opens correctly |
| 9 | View ops dashboard | 10 min | Not checking regularly | Can interpret DAU, module usage, friction |
| 10 | Invite parents | 10 min | Wrong email; not verifying send | Parents receive invitation |

**Total guided time:** ~2.5 hours  
**Total solo practice time:** ~1 hour

### Critical Mistakes to Avoid

- **Don't skip the setup wizard.** Incomplete setup breaks downstream features.
- **Don't publish a schedule without review.** Conflicts cause teacher frustration.
- **Don't forget to assign branch to users.** Users without branch see no data.
- **Don't bulk-invite without testing one first.** One bad email = many support tickets.

---

## Vice Principal (Direktor O'rinbosari)

### Must-Know Workflows

| # | Workflow | Time | Critical Mistakes | Success Checkpoint |
|---|----------|------|-------------------|-------------------|
| 1 | Log in + dashboard | 10 min | Using director's credentials | Personal dashboard loads |
| 2 | Review and approve schedule | 20 min | Missing conflicts; approving blindly | Schedule approved with zero conflicts |
| 3 | Monitor teacher attendance | 10 min | Wrong date; wrong teacher | Late/absent teachers identified |
| 4 | Review grade publications | 15 min | Not checking unpublished grades | All grades published on time |
| 5 | Run timetable analytics | 15 min | Wrong filters; wrong term | Analytics report useful for adjustments |
| 6 | Substitute teacher assignment | 20 min | Wrong subject; double-booking | Substitution created, notified |
| 7 | Review homework assignments | 10 min | Wrong class; wrong date | All classes have homework assigned |

**Total guided time:** ~1.5 hours  
**Total solo practice time:** ~45 min

### Critical Mistakes to Avoid

- **Don't approve schedules without checking conflicts.** Teachers will complain.
- **Don't forget substitute notifications.** Unnotified substitutes = empty classes.
- **Don't ignore unpublished grades.** Students and parents see nothing.

---

## Branch Admin (Filial Admini)

### Must-Know Workflows

| # | Workflow | Time | Critical Mistakes | Success Checkpoint |
|---|----------|------|-------------------|-------------------|
| 1 | Log in + branch-scoped view | 10 min | Viewing wrong branch data | Only own branch data visible |
| 2 | Manage branch users | 15 min | Wrong role; wrong branch | Users created with correct scope |
| 3 | Branch-level attendance review | 10 min | Wrong date range | Accurate branch attendance summary |
| 4 | Branch-level reports | 15 min | Wrong filters | Report scoped to branch only |

**Total guided time:** ~1 hour  
**Total solo practice time:** ~30 min

### Critical Mistakes to Avoid

- **Don't create users in wrong branch.** Cross-branch data leakage.
- **Don't assume you see all data.** Branch scope limits visibility intentionally.

---

## Teacher (O'qituvchi)

### Must-Know Workflows

| # | Workflow | Time | Critical Mistakes | Success Checkpoint |
|---|----------|------|-------------------|-------------------|
| 1 | Log in + view personal schedule | 10 min | Not understanding week A/B | Schedule matches actual classes |
| 2 | Mark daily attendance | 10 min | Wrong status (absent vs late); wrong student | All students marked, saved |
| 3 | Enter grades | 15 min | Wrong student; wrong subject; not publishing | Grades visible to students/parents |
| 4 | Create homework | 10 min | Wrong class; wrong due date | Students see homework in portal |
| 5 | Grade homework submissions | 15 min | Not grading all submissions | All submissions have scores |
| 6 | View student history | 10 min | Wrong student | Full history visible |
| 7 | Award coins (if enabled) | 10 min | Wrong amount; wrong student | Coin balance updated |

**Total guided time:** ~1.5 hours  
**Total solo practice time:** ~1 hour

### Critical Mistakes to Avoid

- **Don't forget to publish grades.** Draft grades are invisible to students.
- **Don't mark attendance for wrong class.** Data integrity depends on accuracy.
- **Don't set impossible due dates.** Students need reasonable time.
- **Don't ignore homework submissions.** Backlog grows quickly.

---

## Class Teacher (Sinfbosh)

### Must-Know Workflows

| # | Workflow | Time | Critical Mistakes | Success Checkpoint |
|---|----------|------|-------------------|-------------------|
| 1 | All teacher workflows | — | Same as teacher | Same as teacher |
| 2 | Class-level attendance (all subjects) | 10 min | Not coordinating with subject teachers | Class attendance complete |
| 3 | Parent communication | 10 min | Wrong parent; wrong student | Messages reach correct parent |
| 4 | Class report export | 10 min | Wrong format | CSV/PDF usable for parent meetings |

**Total guided time:** ~1.5 hours (same as teacher) + 30 min  
**Total solo practice time:** ~1 hour

### Critical Mistakes to Avoid

- **Don't duplicate attendance with subject teachers.** Coordinate who marks what.
- **Don't miss parent contact updates.** Outdated phone = failed communication.

---

## Student (O'quvchi)

### Must-Know Workflows

| # | Workflow | Time | Critical Mistakes | Success Checkpoint |
|---|----------|------|-------------------|-------------------|
| 1 | Log in + view schedule | 5 min | Forgetting password | Schedule visible for today |
| 2 | View homework | 5 min | Wrong week; wrong class | All homework listed with due dates |
| 3 | Submit homework | 10 min | Wrong file; wrong homework | Submission confirmed, file attached |
| 4 | View grades | 5 min | Wrong subject filter | All published grades visible |
| 5 | View coins (if enabled) | 5 min | — | Balance and history visible |
| 6 | View announcements | 5 min | — | New announcements marked unread |

**Total guided time:** ~30 min  
**Total solo practice time:** ~15 min

### Critical Mistakes to Avoid

- **Don't share your password.** Other students can see your data.
- **Don't submit homework after due date.** Late policy varies by teacher.
- **Don't ignore announcements.** Important info (exams, holidays) posted there.

---

## Parent (Ota-ona)

### Must-Know Workflows

| # | Workflow | Time | Critical Mistakes | Success Checkpoint |
|---|----------|------|-------------------|-------------------|
| 1 | Accept invitation + set password | 10 min | Wrong token; weak password | Login successful |
| 2 | View child's attendance | 5 min | Wrong child (if multiple) | Today's attendance visible |
| 3 | View child's grades | 5 min | Wrong subject filter | All published grades visible |
| 4 | View child's schedule | 5 min | Wrong week | Schedule matches child's day |
| 5 | View announcements | 5 min | — | School announcements visible |
| 6 | View homework | 5 min | Wrong due date filter | Current homework listed |

**Total guided time:** ~30 min  
**Total solo practice time:** ~15 min

### Critical Mistakes to Avoid

- **Don't use child's login.** Parent portal has different permissions.
- **Don't panic over one bad grade.** Check trend, contact teacher if concerned.
- **Don't ignore unread announcements.** School events, closures posted there.

---

## Accountant (Buxgalter)

### Must-Know Workflows

| # | Workflow | Time | Critical Mistakes | Success Checkpoint |
|---|----------|------|-------------------|-------------------|
| 1 | Log in + view finance dashboard | 10 min | Wrong date range | Dashboard loads with correct data |
| 2 | Review fee structures | 15 min | Wrong branch; wrong grade | Fees match school policy |
| 3 | Generate payment reports | 15 min | Wrong period; wrong status | Report accurate, exportable |
| 4 | Verify teacher attendance for payroll | 10 min | Wrong month; wrong teacher | Attendance matches payroll input |
| 5 | Export financial reports | 10 min | Wrong format | CSV opens in Excel correctly |
| 6 | View payment status by student | 10 min | Wrong class filter | Overdue payments identified |

**Total guided time:** ~1.5 hours  
**Total solo practice time:** ~45 min

### Critical Mistakes to Avoid

- **Don't export without date filter.** Full history = timeout on large schools.
- **Don't ignore fee structure branch scope.** Different branches may have different fees.
- **Don't pay without attendance verification.** Payroll depends on accurate attendance.

---

## Training Delivery Format

| Format | Best For | Duration |
|--------|----------|----------|
| Live screen share (Loom/Meet) | Director, VP | 2 hours |
| In-person group session | Teachers | 1.5 hours |
| Self-paced video + quiz | Students, Parents | 30 min |
| One-on-one call | Accountant, Branch Admin | 1 hour |
| Printed quick-reference card | All roles | 1 page |

---

## Training Checklist

| # | Task | Owner | Deadline |
|---|------|-------|----------|
| 1 | Record director training video | Pilot Lead | Day 0 |
| 2 | Record teacher training video | Pilot Lead | Day 0 |
| 3 | Create student quick-reference | Pilot Lead | Day 0 |
| 4 | Create parent quick-reference | Pilot Lead | Day 0 |
| 5 | Print and distribute cards | School Director | Day 1 |
| 6 | Schedule live Q&A session | Pilot Lead | Day 3 |
| 7 | Collect "I got stuck" feedback | Pilot Lead | Day 7 |
| 8 | Update training based on feedback | Pilot Lead | Day 10 |

---

> **Last Updated:** 2026-05-28
