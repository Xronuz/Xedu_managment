# Pilot Feedback Intake Process

**Version:** 1.0  
**Scope:** How pilot findings are collected, triaged, prioritized, and resolved.  
**Rule:** No roadmap features. Only P0 blockers and P1 severe usability problems get fixed in Sprint 1.

---

## 1. Source Channels

Feedback can come from any of these channels. Each has a preferred capture method.

| Channel | Capture Method | Response Time |
|---------|---------------|---------------|
| **Telegram** | Screenshot + forward to `#pilot-feedback` channel | Same day |
| **Live pilot session** | Observer takes structured notes using intake template | Within 1h |
| **Screen recording** | User shares Loom / screen capture link | Same day |
| **Call / interview** | Recorded notes + transcript snippets if available | Within 1h |
| **Direct observation** | Observer logs what they saw in real time | Within 1h |
| **Metrics / logs** | Correlation ID → log query → ticket with evidence | Within 4h |
| **Support reports** | Formal ticket copied to board with full context | Same day |

---

## 2. Intake Workflow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Report    │────▶│   Triage    │────▶│  Prioritize │────▶│   Resolve   │
│  Received   │     │  (24h SLA)  │     │  (Formula)  │     │  (Sprint)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### Step 1 — Report Received (any channel)
- Capture the report in the channel it arrived.
- Create a ticket in `docs/PILOT_FEEDBACK_BOARD.md` using the intake template.
- Assign status: `new`.
- Fill in: ID, Title, Category, Reported By, Source, Created Date.

### Step 2 — Triage (within 24 hours)
- **Reproduce** the issue if possible.
- Assign **Severity** using the legend:
  - P0: Pilot cannot continue → immediate escalation
  - P1: Major usability problem → sprint priority
  - P2: Workaround exists → backlog
  - P3: Cosmetic / edge case → backlog or deferred
- Assign **Frequency** based on how many users reported it.
- Fill in: Reproduction, Expected, Actual, Evidence, Impact, Root Cause.
- Update status: `investigating` → `confirmed` (once reproduced) or `deferred` (if out of scope).

### Step 3 — Prioritize
- Apply the weighted scoring formula from the board:
  ```
  Priority Score = (Severity × 5) + (Frequency × 3) + (Business Impact × 4) − (Effort × 2)
  ```
- Score ≥ 30 → sprint priority (P0/P1)
- Score 20–29 → backlog candidate (P2)
- Score < 20 → deferred (P3 or won't-fix)

### Step 4 — Resolve

| Severity | Action | SLA | Owner |
|----------|--------|-----|-------|
| **P0** | Drop everything. Fix immediately. Deploy hotfix. | 24h | Lead dev on-call |
| **P1** | Sprint priority. Fix within current sprint. | 3–5 days | Assigned engineer |
| **P2** | Add to backlog. Review in Sprint 2 planning. | v0.1.3 | Product owner |
| **P3** | Add to backlog or mark deferred. | Future release | Product owner |

---

## 3. Escalation Rules

### P0 — Immediate Escalation
- Tag `@kimi` and `@lead-dev` in the ticket.
- Post in `#pilot-alerts` Telegram channel.
- Stop current work if necessary.
- Fix → deploy → verify → close within 24 hours.

### P1 — Sprint Priority
- Add to current sprint board.
- Assign to available engineer.
- Daily standup check-in until resolved.

### P2/P3 — Backlog
- Mark status as `backlog`.
- No immediate action required.
- Reviewed in weekly retro and Sprint 2 planning.

---

## 4. Evidence Standards

Every ticket must have at least one evidence type. The stronger the evidence, the higher the confidence in severity assignment.

| Evidence Strength | Types |
|-------------------|-------|
| **Strong** | screen_recording + live_observation + logs_metrics |
| **Medium** | interview + support_ticket + session_review |
| **Weak** | telegram_message alone (needs follow-up) |

### Required Evidence per Severity

| Severity | Minimum Evidence |
|----------|-----------------|
| P0 | screen_recording OR live_observation + logs_metrics |
| P1 | interview OR support_ticket + reproduction steps |
| P2 | telegram_message OR support_ticket with steps |
| P3 | Any single evidence type |

---

## 5. Definition of Done (for resolved tickets)

A ticket is `resolved` when ALL of the following are true:

1. Fix is implemented and merged.
2. Fix is deployed to pilot environment.
3. Reporter confirms the fix works (for P0/P1).
4. Resolution Commit SHA is added to the ticket.
5. If applicable, test is added to prevent regression.
6. Status updated to `resolved` and Last Updated date set.

---

## 6. Weekly Retro Checklist

Every week during the pilot, review:

- [ ] New tickets opened since last retro
- [ ] P0/P1 resolution times (are we meeting SLA?)
- [ ] Top 3 complaints by frequency
- [ ] Any patterns emerging? (same module, same role, same workflow)
- [ ] Telemetry review — any spikes in errors or drops in usage?
- [ ] User satisfaction observations (qualitative notes from calls)
- [ ] Backlog health — is P2 growing too fast?

---

## 7. Sprint Reporting

At the end of Sprint 1, produce `docs/PILOT_FEEDBACK_SPRINT_1_REPORT.md` using the template in that file. Include:

- Tickets opened vs resolved
- Top complaints
- Usage metrics
- Adoption insights
- Blocked workflows
- User satisfaction observations
- Recommended next sprint focus
