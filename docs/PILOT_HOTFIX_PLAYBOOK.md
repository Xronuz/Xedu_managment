# Pilot Hotfix Playbook

**Version:** 1.0  
**Scope:** When and how to deploy emergency fixes during pilot.  
**Rule:** Minimal change. Maximum safety. No heroics.

---

## 1. What Qualifies for Hotfix

### ✅ Qualifies

| Condition | Example | Typical Severity |
|-----------|---------|-----------------|
| System unusable for all users | Login fails for everyone | P0 |
| Data corruption or loss | Attendance marks overwritten | P0 |
| Critical security issue | Cross-user data visible | P0 |
| Core workflow completely broken | Schedule cannot be published | P1 |
| Export fails for all users | All exports timeout | P1 |
| Queue worker crash loop | Jobs fail continuously | P1 |

### ❌ Does NOT Qualify

| Condition | Example | Typical Severity | Why Not |
|-----------|---------|-----------------|---------|
| Cosmetic UI issue | Wrong color, typo | P3 | Next release |
| Feature request | "Can you add X?" | P3 | Backlog |
| Performance annoyance | Page loads in 3s instead of 1s | P2 | Monitor, fix next sprint |
| Edge case bug | Happens only with 1000+ students | P2 | Workaround exists |
| Training issue | User doesn't know how to click | Question | Training, not code |
| Mobile layout suboptimal | Needs scroll on small screen | P3 | Next release |

---

## 2. Hotfix Procedure

### Step 1 — Triage (5 minutes)

1. Confirm severity: Is this P0 or P1 with no workaround?
2. Reproduce: Can you make it happen on demand?
3. Scope: How many users affected? All or subset?
4. Rollback safer? If unsure, rollback first.

**Decision:**
- P0 → Proceed to hotfix
- P1 with workaround → Document workaround, schedule fix
- P1 no workaround → Proceed to hotfix
- P2/P3 → Ticket, backlog

### Step 2 — Branch & Fix (15–60 minutes)

```bash
# 1. Create hotfix branch from main
git fetch origin
git checkout -b hotfix/pilot-YYYY-MM-DD origin/main

# 2. Make MINIMAL change
# - One bug = one commit
# - No refactoring
# - No feature additions
# - Add test if trivial, skip if time-critical

# 3. Test locally
pnpm test --testPathPattern='affected-module'

# 4. Commit with clear message
git commit -m "hotfix: [brief description]"
```

**Rules:**
- Change ≤ 20 lines if possible
- If > 50 lines, reconsider — maybe rollback is safer
- Never mix hotfix with unrelated changes

### Step 3 — Review (5–15 minutes)

| Severity | Review Required | How |
|----------|----------------|-----|
| P0 | Async OK | Self-review + one other engineer via Telegram/screenshot |
| P1 | Async OK | Self-review + one other engineer |

**What to check:**
- [ ] Fix addresses root cause, not symptom
- [ ] No side effects on unrelated code
- [ ] Rollback path still works
- [ ] Test passes (or manual verification done)

### Step 4 — Deploy (10 minutes)

```bash
# 1. Merge to main
git checkout main
git merge hotfix/pilot-YYYY-MM-DD --no-ff

# 2. Push triggers deploy workflow
git push origin main

# 3. Monitor deploy
# Watch GitHub Actions or docker compose logs
```

**Deploy window:**
- P0: Any time, including nights and weekends
- P1: Business hours preferred (08:00–18:00 Tashkent)
- No-deploy windows for P1: Friday after 16:00, exam periods

### Step 5 — Verify (10 minutes)

1. Health check passes: `GET /api/health` → 200
2. Ready check passes: `GET /api/health/ready` → 200
3. Original issue no longer reproduces
4. No new 500 errors in metrics
5. User confirms fix (if P0)

### Step 6 — Document (5 minutes)

1. Add ticket to `PILOT_FEEDBACK_BOARD.md`:
   - Status: `resolved`
   - Resolution Commit: `[SHA]`
   - Notes: What was fixed, why

2. Update `PILOT_DRY_RUN_REPORT.md` if relevant

3. Notify stakeholders:
   ```
   ✅ Hotfix deployed: [brief description]
   Commit: [SHA]
   Verified: [how]
   ```

---

## 3. Rollback Decision Tree

```
Bug reported
    ↓
Can reproduce?
    ↓ No → Monitor, gather more info
    ↓ Yes
Is it P0?
    ↓ No → Workaround exists?
    ↓        ↓ Yes → Document workaround, fix next sprint
    ↓        ↓ No → Hotfix (P1)
    ↓ Yes
Fix obvious and < 20 lines?
    ↓ Yes → Hotfix immediately
    ↓ No → Rollback safer?
    ↓        ↓ Yes → Rollback deployment
    ↓        ↓ No → Hotfix with extra caution
```

### Rollback Procedure

```bash
# 1. Identify last known good commit
git log --oneline -5

# 2. Revert or reset
# Option A: Revert the bad commit
git revert <bad-commit-sha>

# Option B: Reset to last known good
git reset --hard <last-good-sha>

# 3. Force push (only if no other changes merged)
git push origin main --force-with-lease

# 4. Verify health
# 5. Notify team: "Rolled back to [SHA] due to [reason]"
```

---

## 4. Emergency Contact Tree

| Role | Contact | When to Call |
|------|---------|-------------|
| Engineer On-Call | [Phone] | P0 at any time |
| Engineer (Secondary) | [Phone] | On-Call unreachable |
| Pilot Lead | [Phone] | P0 + business impact decision |
| Director (School) | [Phone] | Only if system down and they need to know |

**Call order:**
1. Engineer On-Call (immediate)
2. If unreachable → Secondary Engineer (5 min)
3. If P0 + decision needed → Pilot Lead (10 min)
4. If system down > 30 min → Notify Director (30 min)

---

## 5. Hotfix Log Template

```
=== Hotfix Log ===
Date: YYYY-MM-DD HH:MM
Reporter: [Name]
Severity: P0 / P1
Issue: [Description]
Affected: [Users/modules]

Triage:
- Reproduced: yes / no
- Scope: all / subset
- Rollback considered: yes / no

Fix:
- Branch: hotfix/pilot-YYYY-MM-DD
- Commit: [SHA]
- Lines changed: X
- Test added: yes / no

Deploy:
- Time deployed: HH:MM
- Verification: [What was checked]
- User confirmed: yes / no

Follow-up:
- Ticket: #[ID]
- Regression test needed: yes / no
- Documentation updated: yes / no
```

---

## 6. Pre-Approved Quick Fixes

These fixes are pre-approved and can be deployed without full review if they match exactly:

| Fix | Condition | Max Lines |
|-----|-----------|-----------|
| Increase rate limit | User blocked by throttling | 1 line |
| Add CORS origin | New frontend URL | 1 line |
| Extend token expiry | Session too short | 1 line |
| Fix env var default | Missing fallback | 1 line |
| Add missing `@Public()` | Public endpoint blocked | 1 line |
| Increase heap limit | Out of memory | 1 line |

**Still required:** Test locally, verify after deploy, log the change.

---

> **Last Updated:** 2026-05-28
