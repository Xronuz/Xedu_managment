# Phase 8B.2C — Marketing and Documentation Parity Cleanup Report

**Goal:** Remove or reword product claims that are not supported by actual code, based on `docs/PHASE8A_ORPHAN_DOMAIN_API_PARITY_AUDIT.md`.

**Scope:** Docs, labels, and user-facing copy only. No new features. No module deletions.

**Baseline:** v0.1.1-pilot

---

## 1. Claims Removed / Reworded

### 1.1 Online Exam Engine — Proctoring
**Finding:** `XEDU_SYSTEM_DESIGN_REPORT.md:1229` claimed "real-time proctoring". No proctoring controller, webcam access, or anti-cheat logic exists beyond basic timer.

**Action:**
- `docs/XEDU_SYSTEM_DESIGN_REPORT.md`: Changed to "auto-grading for objective questions, timer enforcement"
- `docs/DATA_ARCHITECTURE_PHASE23.md:70`: Changed "School-wide proctoring" → "School-wide exam session monitoring"

**DocX import finding corrected:** Phase 8A audit incorrectly flagged DocX import as "marketing-only". Verification confirmed `mammoth` parser + `/online-exam/:id/import-docx` endpoint is fully implemented.
- `docs/PHASE8A_ORPHAN_DOMAIN_API_PARITY_AUDIT.md:259`: Updated row to "✅ **Real** — mammoth parser, endpoint works. No action needed."

### 1.2 AI / Risk Scoring
**Finding:** `ai-analytics.service.ts` is rule-based (attendance + grades + homework + discipline weights), not AI/LLM-powered. Frontend copy claimed "AI tahlil" and "Sun'iy intellekt".

**Action:**
- `apps/frontend/src/components/director-workspace/activity-stream.tsx:118`: "AI xavf signali" → "Analitik xavf signali"
- `apps/frontend/src/app/(dashboard)/dashboard/alerts/page.tsx:153-154`: "AI tahliliga ko'ra" → "Analitik tahliliga ko'ra"; source label "AI tahlil" → "Analitik tahlil"
- `apps/frontend/src/app/(dashboard)/dashboard/insights/page.tsx:160`: "risk baholash tizimi" → "rule-based risk baholash tizimi"
- `apps/frontend/src/app/(dashboard)/dashboard/insights/page.tsx:240-246`: Reworded AI placeholder cards:
  - "AI tavsiyalar" → "Tahliliy tavsiyalar" (description: "Kelgusida AI yordamida...")
  - "Bashoratli tahlil" kept but description changed to "Kelgusida o'quvchi natijalarini..."
- `docs/PILOT_CHECKLIST.md:93`: "AI features: Stubs only. No real LLM integration yet." → "AI features: Rule-based analytics only. No LLM integration yet. AI extension planned."

### 1.3 Mobile / PWA
**Finding:** No `manifest.json`, no service worker, no React Native/Flutter code. Tailwind responsive classes exist but PWA is not installable.

**Action:**
- `docs/PILOT_CHECKLIST.md:94`: "Mobile app: Web-only. PWA installable but not native." → "Mobile: Responsive web interface. PWA planned."
- `docs/PRODUCTION_GO_LIVE_READINESS_AUDIT.md:234`: "Mobile app | Web-only | PWA installable" → "Mobile | Responsive web | PWA planned"
- `docs/COMPETITOR_ANALYSIS.md:384`: "Mobil ilova (React Native yoki PWA)" → "Mobil-optimallashtirilgan web interfeys (PWA rejalashtirilgan)"
- `docs/COMPETITOR_ANALYSIS.md:461`: "Mobil ilova (PWA birinchi)" → "Mobil web interfeys (PWA birinchi)"

### 1.4 Video Meetings
**Finding:** Backend `meetings` module stores `medium: 'video'` enum but has no Zoom/Meet/Jitsi integration. Frontend showed "Video qo'ng'iroq" which implies an actual video call feature.

**Action:**
- `apps/frontend/src/app/(dashboard)/dashboard/meetings/page.tsx:34`: "Video qo'ng'iroq" → "Video uchrashuv (tashqi ilova)"

### 1.5 Push Notifications
**Finding:** Frontend notification preferences include `push_all` but no service worker or push infrastructure exists.

**Action:**
- `apps/frontend/src/app/(dashboard)/dashboard/notifications/page.tsx:60`: "Push bildirishnomalar" → "Push bildirishnomalar (rejalashtirilgan)" with description "Brauzer push notifications — hali faollashtirilmagan"

---

## 2. Files Changed

### Frontend (5 files)
| File | Change |
|------|--------|
| `src/components/director-workspace/activity-stream.tsx` | "AI xavf signali" → "Analitik xavf signali" |
| `src/app/(dashboard)/dashboard/alerts/page.tsx` | "AI tahliliga ko'ra" → "Analitik tahliliga ko'ra" |
| `src/app/(dashboard)/dashboard/meetings/page.tsx` | "Video qo'ng'iroq" → "Video uchrashuv (tashqi ilova)" |
| `src/app/(dashboard)/dashboard/notifications/page.tsx` | Push label marked as planned/not-yet-active |
| `src/app/(dashboard)/dashboard/insights/page.tsx` | AI placeholder titles reworded; header now says "rule-based" |

### Docs (6 files)
| File | Change |
|------|--------|
| `docs/XEDU_SYSTEM_DESIGN_REPORT.md` | Removed "real-time proctoring" claim |
| `docs/PILOT_CHECKLIST.md` | AI + Mobile claims reworded to match reality |
| `docs/PHASE8A_ORPHAN_DOMAIN_API_PARITY_AUDIT.md` | DocX import finding corrected (was false negative) |
| `docs/COMPETITOR_ANALYSIS.md` | Mobile app claims reworded to web interface |
| `docs/DATA_ARCHITECTURE_PHASE23.md` | "proctoring" → "exam session monitoring" |
| `docs/PRODUCTION_GO_LIVE_READINESS_AUDIT.md` | Mobile/PWA claim reworded |

---

## 3. Remaining Planned-but-Not-Active Features

These are intentionally preserved as "planned" or "coming soon" with honest labeling:

| Feature | Status | Evidence in Code |
|---------|--------|-----------------|
| LLM / AI insights | Planned | `AiPlaceholderCard` with "Tez orada" badge |
| PWA installable | Planned | No manifest, no service worker |
| Push notifications | Planned | Preference toggle exists but no service worker |
| Video conferencing integration | Planned | `video` enum exists but no provider integration |
| Native mobile app | Planned | Responsive Tailwind only |
| Real-time proctoring | Planned | Timer enforcement exists; webcam/proctoring does not |

---

## 4. What Was NOT Changed (Correctly Implemented)

| Feature | Why Left Alone |
|---------|---------------|
| DocX import | Fully implemented (`mammoth` + `/import-docx` endpoint) |
| Auto-grading (MCQ/TF) | Real — `submitSession()` calculates scores |
| Timer enforcement | Real — frontend countdown + auto-submit at 0 |
| Rule-based risk scoring | Real — `ai-analytics.service.ts` computes from real data |
| Gamification / coins / achievements | Real — wired in Batch 2B |

---

## 5. Verification

| Check | Result |
|-------|--------|
| Frontend `pnpm build` | ✅ Pass |
| Frontend `pnpm test` | ✅ 64/64 pass |
| No backend code changed | ✅ Confirmed |
| No schema changes | ✅ Confirmed |

---

## 6. Commit Message Suggestion

```
docs: align marketing claims with implemented product reality

- Remove unsupported proctoring, PWA, native mobile claims
- Reword AI claims to "rule-based analytics / planned"
- Reword video meetings to indicate no provider integration
- Mark push notifications as planned-not-active
- Correct Phase 8A audit: DocX import is actually implemented
```
