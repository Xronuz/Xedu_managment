# Pilot Risk Register

**Version:** 1.0  
**Scope:** Top operational risks for the pilot. Probability × Impact = Risk Score.  
**Rule:** Every risk has an owner and a mitigation. No risks without actions.

---

## Risk Scoring

| Probability | Score | Impact | Score |
|-------------|-------|--------|-------|
| Rare | 1 | Negligible | 1 |
| Unlikely | 2 | Minor | 2 |
| Possible | 3 | Moderate | 3 |
| Likely | 4 | Major | 4 |
| Almost certain | 5 | Critical | 5 |

**Risk Score = Probability × Impact**

| Score | Action |
|-------|--------|
| 1–4 | Monitor |
| 5–9 | Mitigation plan required |
| 10–16 | Active monitoring + contingency |
| 17–25 | Must mitigate before pilot starts |

---

## Registered Risks

### R1 — Teacher Resistance to New System

| Field | Value |
|-------|-------|
| **Description** | Teachers refuse to use Xedu, continue paper-based processes. |
| **Probability** | 4 (Likely) |
| **Impact** | 4 (Major) — Attendance and grades not entered |
| **Risk Score** | 16 |
| **Owner** | Pilot Lead |
| **Mitigation** | 1. In-person training on Day 5. 2. Show time savings vs paper. 3. Start with one enthusiastic teacher as champion. 4. No forced cutoff from paper initially — parallel run. |
| **Contingency** | If > 30% of teachers resist after Week 1, extend parallel run. If > 50% resist, pause pilot and interview teachers. |
| **Indicators** | Low attendance marking rate; teacher complaints in feedback board. |

---

### R2 — Bad Imported Data

| Field | Value |
|-------|-------|
| **Description** | Bulk import CSV contains errors (wrong format, duplicate IDs, bad dates). |
| **Probability** | 3 (Possible) |
| **Impact** | 4 (Major) — Corrupted roster, wrong grades, confused users |
| **Risk Score** | 12 |
| **Owner** | Engineer |
| **Mitigation** | 1. Use `parse` endpoint before `commit`. 2. Test with 5-row sample first. 3. Provide CSV templates. 4. Backup before bulk import. |
| **Contingency** | Use `POST /api/import/rollback` with session ID. If rollback fails, restore from `scripts/ops/backup.sh`. |
| **Indicators** | Import fails with validation errors; users report missing or duplicated records. |

---

### R3 — Setup Wizard Abandonment

| Field | Value |
|-------|-------|
| **Description** | Director starts onboarding but does not complete it. |
| **Probability** | 4 (Likely) |
| **Impact** | 4 (Major) — School cannot use core features |
| **Risk Score** | 16 |
| **Owner** | Pilot Lead |
| **Mitigation** | 1. Break wizard into saveable steps. 2. Day 1 call with director. 3. Progress indicator visible. 4. Engineer on standby for real-time help. |
| **Contingency** | If director abandons at step < 4, engineer completes setup remotely via screen share. |
| **Indicators** | `onboardingCompleted = false` after 48h; director stops responding. |

---

### R4 — Solver Confusion

| Field | Value |
|-------|-------|
| **Description** | Director/VP runs advanced solver but doesn't understand output. Schedule not published. |
| **Probability** | 4 (Likely) |
| **Impact** | 3 (Moderate) — Manual scheduling fallback, time lost |
| **Risk Score** | 12 |
| **Owner** | Engineer |
| **Mitigation** | 1. Default to basic generator first. 2. Add plain-language constraint explanations. 3. Provide "publish with warnings" option. 4. Day 4 training includes schedule review. |
| **Contingency** | Director manually edits draft schedule. Engineer provides manual scheduling template. |
| **Indicators** | High draft-to-published ratio; solver run cancelled; feedback mentions confusion. |

---

### R5 — RBAC Confusion

| Field | Value |
|-------|-------|
| **Description** | Users see wrong data or can't access features due to role/branch misconfiguration. |
| **Probability** | 3 (Possible) |
| **Impact** | 3 (Moderate) — Support tickets, data privacy concerns |
| **Risk Score** | 9 |
| **Owner** | Engineer |
| **Mitigation** | 1. Pre-configure roles during account creation. 2. Branch scope clearly labeled in UI. 3. Audit log tracks data access. |
| **Contingency** | Manual role/branch fix via DB or super-admin endpoint. |
| **Indicators** | "I can't see my class" tickets; cross-branch data visible to wrong user. |

---

### R6 — Slow Onboarding

| Field | Value |
|-------|-------|
| **Description** | Onboarding takes > 3 days, delaying all downstream activities. |
| **Probability** | 3 (Possible) |
| **Impact** | 3 (Moderate) — Pilot timeline slips |
| **Risk Score** | 9 |
| **Owner** | Pilot Lead |
| **Mitigation** | 1. Pre-load subjects and rooms. 2. Day 0 engineer prep. 3. Day 1 call with director. 4. Checklist-driven, not exploratory. |
| **Contingency** | Extend Week 1 by 2 days. Reduce Week 2 scope. |
| **Indicators** | `onboardingCompletedAt` > 72h after login. |

---

### R7 — Low Parent Adoption

| Field | Value |
|-------|-------|
| **Description** | Parents do not log in to portal. Portal investment wasted. |
| **Probability** | 4 (Likely) |
| **Impact** | 3 (Moderate) — Parent engagement goal missed |
| **Risk Score** | 12 |
| **Owner** | Pilot Lead |
| **Mitigation** | 1. SMS invitation with simple instructions. 2. In-person parent meeting demo. 3. Paper quick-reference card in local language. 4. Parent champion (one tech-savvy parent helps others). |
| **Contingency** | If < 20% adoption after Week 2, defer parent portal focus to later phase. |
| **Indicators** | `unique parent logins (7d) / total parents < 0.3`. |

---

### R8 — Grading Backlog

| Field | Value |
|-------|-------|
| **Description** | Teachers enter grades but do not publish. Or submissions pile up ungraded. |
| **Probability** | 4 (Likely) |
| **Impact** | 3 (Moderate) — Students/parents see no grades |
| **Risk Score** | 12 |
| **Owner** | Support Lead |
| **Mitigation** | 1. Teacher training emphasizes "publish" step. 2. Dashboard reminder for unpublished grades. 3. VP reviews grade status weekly. 4. Homework grading within 48h policy. |
| **Contingency** | Bulk publish tool for admin (if grades entered but not published). |
| **Indicators** | `Grade.isPublished = false` count grows; `HomeworkSubmission.score = null` count grows. |

---

### R9 — Export Timeouts for Large Schools

| Field | Value |
|-------|-------|
| **Description** | Schools with 500+ students cannot generate attendance/grade exports. |
| **Probability** | 3 (Possible) |
| **Impact** | 3 (Moderate) — Reports unavailable when needed |
| **Risk Score** | 9 |
| **Owner** | Engineer |
| **Mitigation** | 1. Warn before large exports. 2. Default to smaller date ranges. 3. Async export queue for large reports. 4. Pre-generate common reports. |
| **Contingency** | Engineer generates report manually from DB query. |
| **Indicators** | Export job status = 'failed' with timeout; user reports 504. |

---

### R10 — Queue Failures Accumulate

| Field | Value |
|-------|-------|
| **Description** | Export or solver queue jobs fail repeatedly. Users lose trust. |
| **Probability** | 2 (Unlikely) |
| **Impact** | 4 (Major) — Core async features unreliable |
| **Risk Score** | 8 |
| **Owner** | Engineer |
| **Mitigation** | 1. Queue health check in `/api/health`. 2. Failed job retry logic. 3. Alert on queue failure rate > 1%. 4. Graceful degradation to sync mode. |
| **Contingency** | Restart workers; clear stuck jobs; manual processing. |
| **Indicators** | `queueFailures` metric spikes; `/api/ops/friction` shows failed exports/solvers. |

---

### R11 — Data Loss (Critical)

| Field | Value |
|-------|-------|
| **Description** | Database corruption or accidental deletion causes irrecoverable data loss. |
| **Probability** | 1 (Rare) |
| **Impact** | 5 (Critical) — Entire school data gone |
| **Risk Score** | 5 |
| **Owner** | Engineer |
| **Mitigation** | 1. Daily automated backups (`scripts/ops/backup.sh`). 2. 14-day retention. 3. Backup integrity check weekly. 4. Soft delete for schools (`deletedAt`). |
| **Contingency** | Restore from latest backup. If backup corrupt, use previous day's backup. |
| **Indicators** | Backup script fails; disk full; accidental `DELETE` in logs. |

---

### R12 — Student/Parent Portal Security Issue

| Field | Value |
|-------|-------|
| **Description** | Student sees another student's data, or parent accesses wrong child. |
| **Probability** | 2 (Unlikely) |
| **Impact** | 5 (Critical) — Privacy breach, legal risk |
| **Risk Score** | 10 |
| **Owner** | Engineer |
| **Mitigation** | 1. RBAC strictly enforced on all endpoints. 2. Service layer validates `userId` vs `schoolId`/`branchId`. 3. Audit logs track all data access. 4. Penetration test for student/parent endpoints. |
| **Contingency** | Immediately revoke affected tokens; fix bug; notify affected users. |
| **Indicators** | User reports seeing wrong data; audit logs show cross-user access. |

---

## Risk Heat Map

| Risk | Probability | Impact | Score | Status |
|------|-------------|--------|-------|--------|
| R1 — Teacher resistance | 4 | 4 | 16 | 🔴 Active |
| R3 — Setup abandonment | 4 | 4 | 16 | 🔴 Active |
| R7 — Low parent adoption | 4 | 3 | 12 | 🟡 Monitor |
| R4 — Solver confusion | 4 | 3 | 12 | 🟡 Monitor |
| R8 — Grading backlog | 4 | 3 | 12 | 🟡 Monitor |
| R2 — Bad imported data | 3 | 4 | 12 | 🟡 Monitor |
| R12 — Security issue | 2 | 5 | 10 | 🟡 Monitor |
| R5 — RBAC confusion | 3 | 3 | 9 | 🟡 Monitor |
| R6 — Slow onboarding | 3 | 3 | 9 | 🟡 Monitor |
| R9 — Export timeouts | 3 | 3 | 9 | 🟡 Monitor |
| R10 — Queue failures | 2 | 4 | 8 | 🟢 Low |
| R11 — Data loss | 1 | 5 | 5 | 🟢 Low |

---

## Review Schedule

| Frequency | Activity | Owner |
|-----------|----------|-------|
| Daily | Check for new risk indicators | Support Lead |
| Weekly | Review heat map, update probabilities | Pilot Lead |
| Bi-weekly | Deep-dive top 3 risks | Pilot Lead + Engineer |
| Post-incident | Add new risks, update mitigations | All |

---

> **Last Updated:** 2026-05-28
