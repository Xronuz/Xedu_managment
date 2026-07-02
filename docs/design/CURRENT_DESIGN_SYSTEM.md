# CURRENT Design System — XEDU Student Experience

> *"A current is a flow of water. It has direction, momentum, and power. XEDU is the student's current — the thing that carries them forward, day by day, becoming stronger."*

This is the specification for the **CURRENT** design language: a reusable primitive system that makes every XEDU screen feel like **motion**, not **storage**. It is not a color or typography refresh. It is a set of behavioral, motion-first components.

Every student screen MUST be composed from these primitives. Screen-specific components are forbidden unless absolutely necessary and justified here.

---

## 0 · Foundation contract (existing — do NOT change)

These tokens already exist in `src/theme/tokens.ts`. Every primitive consumes them by reference, never hardcodes values.

| Token group | Values | Used for |
|---|---|---|
| `spacing` | `xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24 · xxxl 32 · xxxxl 40` | All gaps, paddings, insets (4px grid) |
| `radius` | `sm 8 · md 12 · lg 16 · xl 20 · xxl 28 · xxxl 36 · pill 999` | Corner radii |
| `type` | `overline · label · caption · body · bodyStrong · heading · title · display` | Text via `<Text variant>` |
| `anim.spring` | `gentle · bouncy · snappy · rubbery · slow` | Spring-driven motion |
| `anim.duration` | `instant 80 · fast 150 · normal 250 · slow 400 · crawl 600` (ms) | Timing-based motion |
| `anim.easing` | `standard · decel · accel · sharp` (Bezier cubic) | Timing curves |
| `lightColors` / `darkColors` | see tokens.ts | All color, resolved via `useTheme()` |
| `shadow(level 0–3, isDark)` | helper | Elevation |
| `haptics` | `impact('light'|'medium'|'heavy') · success · warning · error` | Feedback |

**Semantic color rule (sacred):**
- `primary` (emerald) = growth, the brand, "go."
- `accent` (gold) = coins, rewards, achievements.
- `success` = positive outcome.
- `warning` = needs attention — **NEVER `danger`**. There is no red in the student experience for academic performance. A 58% is "climbing" (warning/amber directional), never "failed" (danger/red).
- `danger` is reserved exclusively for destructive confirmations (delete, logout). It must NEVER appear on a grade, homework, or streak.
- `info` = neutral/secondary emphasis.

**State color rule:** Subjects are color-neutral. Only *states* carry color: `rising → primary`, `steady → info`, `needs-care → warning`, `achieved → accent`.

---

## 1 · The 9 Primitives — index

| # | Primitive | Role | Lives on |
|---|---|---|---|
| 1 | `DayRing` | The soul — daily completeness | Home hero |
| 2 | `Compass` | The single dominant "do this now" action | Home primary |
| 3 | `Pulse` | A living stat chip (streak/xp/coins) | Every header, Me |
| 4 | `Horizon` | Level progress line + next milestone | Headers, Me |
| 5 | `PathNode` | One node on the learning path | Journey |
| 6 | `TrophyTile` | Earned or locked achievement | Me, Trophy Case |
| 7 | `LedgerEntry` | One growth-framed moment | Journey, Portfolio, Home mini-feed |
| 8 | `Continuum` | Per-subject growth sparkline + direction | Grades, Me |
| 9 | `QuestCard` | Homework/mission as a quest with reward | Homework |

Each primitive below specifies: **Purpose · Props (TS) · States · Variants · Interaction · Animation · Spacing · Accessibility.**

---

## 2 · Primitive 1 — `DayRing`

**Purpose.** The visual metaphor for "today's completeness." A circular progress arc that fills as the student completes today's learning loop (lessons attended + homework done + reviews). This is the home screen's emotional anchor — the answer to "am I closing my day?"

**Mental model:** Apple Activity ring + Duolingo daily goal, but neutral-to-emerald and *always forward*.

### Props (TS)

```ts
interface DayRingProps {
  done: number;          // completed units today (>= 0)
  total: number;         // planned units today (>= done, >= 1)
  label?: string;        // center primary text, e.g. "3/5" — derived if omitted
  caption?: string;      // center secondary text, e.g. "TODAY"
  size?: 'sm' | 'md' | 'lg';   // diameter: 120 / 180 / 240 (default 'lg')
  tone?: 'primary' | 'accent'; // ring color (default 'primary')
  onComplete?: () => void;     // fires once when done reaches total (celebration hook)
  accessibleLabel?: string;    // a11y override
}
```

### States

| State | Condition | Visual |
|---|---|---|
| `empty` | `done === 0` | Track at `bgSubtle`; arc invisible; center caption muted |
| `progress` | `0 < done < total` | Arc fills `done/total`; emerald; center shows `done/total` |
| `complete` | `done >= total` | Full ring emerald; subtle pulse glow; center shows ✦ + caption; fires `onComplete` once |
| `zero-total` | `total < 1` (defensive) | Render a rest-state: faint ring, "Rest day" caption, no fraction |

### Variants

- `size: 'sm'` (120px) — used inside headers/compact surfaces.
- `size: 'md'` (180px) — secondary placement.
- `size: 'lg'` (240px) — **default**, home hero.
- `tone: 'accent'` (gold) — reserved for "bonus/streak" rings only.

### Interaction
- **Non-interactive by default.** It is a display, not a button.
- `onComplete` is a side-effect hook, not a tap. When the ring completes live (user crosses threshold during the session), trigger `CelebrationOverlay` (Phase 2).

### Animation rules
- On **mount**: arc animates from 0 → `done/total` over `anim.duration.slow` (400ms) with `anim.easing.decel`. Gives "filling" feel.
- On **change** (done increments while screen mounted): animate the delta with `anim.spring.bouncy`. Ring visibly grows.
- On **complete**: 1× gentle scale pulse (1.0 → 1.04 → 1.0) via `anim.spring.bouncy`, plus a soft glow (`shadowColor: primary`, opacity 0.3 → 0) lasting `anim.duration.crawl`. Only once per completion.
- Track and arc use `react-native-svg` `<Circle>` with `strokeDasharray` driven by an `Animated.Value`.
- **Reduce motion** (`AccessibilityInfo.isReduceMotionEnabled`): snap to final value, no glow.

### Spacing
- Stroke width: `lg` → 16, `md` → 12, `sm` → 8.
- Center content gap: `spacing.xs` between `label` and `caption`.
- Outer padding from container: caller-controlled; ring itself has no margin.

### Accessibility
- `accessibilityRole="image"`, `accessibilityLabel={accessibleLabel ?? \`${done} of ${total} done today\`}`.
- Never convey state by color alone: the center label always carries the numeric truth.
- Minimum touch target N/A (non-interactive), but the ring must not be the *only* way to act — the `Compass` carries the action.

---

## 3 · Primitive 2 — `Compass`

**Purpose.** The single dominant "do this now" card. There is ever only **one** `Compass` per screen. It computes the highest-priority next action and presents it with its reward upfront. This is the answer to "what do I do today?"

**Mental model:** Linear's focused next-issue + Headspace's "today's session" + a visible XP reward.

### Props (TS)

```ts
interface CompassProps {
  icon: keyof typeof Ionicons.glyphMap; // mission glyph
  eyebrow?: string;        // small overline, e.g. "NEXT UP" / "DUE IN 2H"
  title: string;           // dominant, e.g. "Algebra homework"
  subtitle?: string;       // context, e.g. "Chapter 4 · Quadratics"
  rewardLabel?: string;    // e.g. "+15 XP" / "+5 🪙" — always show reward
  ctaLabel: string;        // button text, e.g. "Continue"
  tone?: 'primary' | 'accent' | 'warning'; // urgency/celebration (default 'primary')
  onPress: () => void;
  completed?: boolean;     // renders a "done" variant (checkmark, no CTA)
}
```

### States

| State | Condition | Visual |
|---|---|---|
| `active` | default | Elevated card, `tone`-tinted leading icon, full CTA button |
| `completed` | `completed === true` | Faint check, emerald tint, no CTA, muted — "you did this" |
| `urgent` | `tone === 'warning'` | Amber eyebrow + warm hairline border; **never red**. Reward still shown. |

### Variants
- `tone` drives the leading icon chip background (`primaryLight` / `accentLight` / `warningLight`) and the CTA button fill.
- Only one `Compass` may exist in a screen tree. (Enforced by convention; a dev-note linter can warn.)

### Interaction
- Tap anywhere on card OR the CTA → `onPress`.
- On press: `haptics.impact('light')`; card scales `0.985` (matches `Card` convention).
- When `completed`: tapping does nothing (or navigates to detail, optional). No reward celebration here.

### Animation rules
- On **mount**: slide-up + fade (`translateY: 12 → 0`, opacity `0 → 1`) over `anim.duration.normal` (250ms), `anim.easing.decel`.
- On **press**: scale `0.985`, spring back via `anim.spring.snappy`.
- On **transition to completed** (live): CTA collapses out (height → 0, opacity → 0) over `anim.duration.fast`; checkmark fades/scales in with `anim.spring.bouncy`.
- Eyebrow urgency (`warning`) may have a slow 2.5s opacity breathe (0.7 ↔ 1.0) to draw the eye — disabled under reduce-motion.

### Spacing
- Card: `radius.xl` (20), padding `spacing.xl` (20), elevation `shadow(2)`.
- Icon chip: 48×48, `radius.md` (12), `gap: spacing.md` to text column.
- Text column internal gap: `spacing.xs`.
- CTA button: full-width minus padding, height 48, `radius.md`, margin-top `spacing.md`.

### Accessibility
- Whole card: `accessibilityRole="button"`, `accessibilityLabel` = `${eyebrow ?? ''} ${title}, ${subtitle ?? ''}, reward ${rewardLabel ?? 'none'}`.
- CTA is a child button; the outer press handler satisfies the action (nested tap targets are fine since the whole card acts).
- Honor `minimum hit slop`: extend pressable by `spacing.sm` insets.
- Color is not the only signal: `urgent` adds the eyebrow text "DUE SOON".

---

## 4 · Primitive 3 — `Pulse`

**Purpose.** A living stat chip — streak count, XP total, coin balance, trophy count. It animates when its value changes so the student *sees* their growth happen. Replaces every static stat number in headers and the Me tab.

**Mental model:** The breathing counters in Apple Fitness / the way Headspace's streak dot pulses.

### Props (TS)

```ts
interface PulseProps {
  icon: keyof typeof Ionicons.glyphMap; // leading glyph (e.g. 'flame', 'star', 'medal')
  value: number | string;               // the live number/text
  label?: string;                       // under value, e.g. "streak"
  tone?: 'streak' | 'xp' | 'coins' | 'wins' | 'neutral';
  size?: 'sm' | 'md';                   // chip height 36 / 44
  delta?: number;                       // change since last render → triggers pop animation
  onPress?: () => void;                 // optional → makes it a tappable chip
}
```

### States

| State | Condition | Visual |
|---|---|---|
| `idle` | default | Chip with icon + value + optional label |
| `pop` | `delta !== 0` (just changed) | Value scales 1.0 → 1.18 → 1.0; `success` haptic if `delta > 0` |
| `zero` | `value === 0` and tone is `streak` | Streak flame rendered **muted/sleeping**, NOT "streak broken". Label "start today". Never red. |

### Variants (`tone` → color mapping)
- `streak` → icon `flame`, color `#F97316` (orange) — the *only* sanctioned orange. Sleeping state = muted `textMuted`.
- `xp` → icon `star`, color `primary`.
- `coins` → icon `medal`, color `accent` (gold).
- `wins` → icon `trophy`, color `accent`.
- `neutral` → icon as given, color `textSecondary`.

### Interaction
- If `onPress` provided → whole chip tappable, `haptics.impact('light')`, scale `0.96` on press.
- Otherwise display-only.

### Animation rules
- On **value change** (`delta` provided and non-zero): value `<Animated.Text>` scale pop via `anim.spring.bouncy`; leading icon does one quick rotation (0 → 360°) for positive deltas only. Duration bounded by the spring.
- On **first mount**: no pop (avoids every chip flashing on screen open).
- Streak `zero`/sleeping: slow 4s opacity breathe (0.5 ↔ 0.8) to imply "waiting to ignite" — disabled under reduce-motion.
- `delta > 0` → `haptics.success()`; `delta < 0` → no haptic (never punish).

### Spacing
- Chip: `radius.pill`, height 36 (`sm`) / 44 (`md`), padding `spacing.sm` horizontal, `gap: spacing.xs` icon↔value.
- Label (optional) sits under value as `type.label` `textMuted`; chip grows to fit.
- In a `PulseRow`, chips gap `spacing.sm`.

### Accessibility
- `accessibilityRole="text"` (display) or `"button"` (if pressable).
- `accessibilityLabel` = `${label ?? ''}: ${value}`.
- The sleeping-streak state label reads "Streak: 0 — start today" (actionable, not judgmental).

---

## 5 · Primitive 4 — `Horizon`

**Purpose.** A thin progress line showing level progress and naming the next milestone. It makes the future visible — the student always knows what they are walking toward. Replaces bare level numbers.

**Mental model:** The XP bar at the bottom of a game HUD + a named next destination.

### Props (TS)

```ts
interface HorizonProps {
  level: number;                       // current level
  progress: number;                    // 0..1 within current level
  xpCurrent?: number;                  // optional numeric "240/300"
  xpNeeded?: number;
  nextMilestoneLabel?: string;         // e.g. "Math Maverick" or "Level 7"
  compact?: boolean;                   // header variant (no milestone text)
}
```

### States
| State | Condition | Visual |
|---|---|---|
| `progress` | `0 < progress < 1` | Bar partially filled emerald; milestone label right-aligned |
| `level-up-ready` | `progress >= 1` (defensive; usually re-levels) | Full bar + subtle shimmer |
| `compact` | `compact === true` | Just the bar + level chip, no milestone text — for headers |

### Variants
- Full (default): bar + level chip + `nextMilestoneLabel` + optional `xpCurrent/xpNeeded`.
- Compact: bar + `Lv.N` chip only.

### Interaction
- Display-only. Tap → optional `onPress` to open the Journey (leave unset for now).

### Animation rules
- On **mount**: bar fills 0 → `progress` over `anim.duration.slow` (400ms), `anim.easing.decel`.
- On **progress change**: animate to new width via `anim.spring.gentle`.
- On **level-up** event (progress wraps): full-bar shimmer sweep once (`translateX` highlight), `haptics.success()`.
- Shimmer disabled under reduce-motion.

### Spacing
- Bar height: 6 (full) / 4 (compact). `radius.pill`.
- Track: `bgSubtle`. Fill: `primary` gradient (primary → primaryHover).
- Level chip: `radius.pill`, height 22, `type.label`, `primaryLight` bg, `primary` text.
- Milestone label: `type.caption`, `textMuted`, right-aligned.
- Container vertical gap: `spacing.xs`.

### Accessibility
- `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 0, max: 1, now: progress }}`.
- `accessibilityLabel` = `Level ${level}, ${Math.round(progress*100)} percent to ${nextMilestoneLabel ?? 'next level'}`.

---

## 6 · Primitive 5 — `PathNode`

**Purpose.** One node on the student's learning path. Past = filled/solid. Current = glowing. Future = dotted/silhouette. The path makes the journey *walkable* and *visible*.

**Mental model:** Duolingo's skill tree node + the "you are here" dot on a map.

### Props (TS)

```ts
interface PathNodeProps {
  state: 'done' | 'current' | 'locked';
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;        // e.g. date or "Lesson 4"
  index?: number;           // position hint for connector styling
  isLast?: boolean;         // suppress downward connector
  onPress?: () => void;     // current/done are tappable; locked is not
  rewardLabel?: string;     // "+15 XP" shown for current node
}
```

### States
| State | Visual | Tappable |
|---|---|---|
| `done` | Filled emerald circle, white check/icon, connector behind solid | Yes (review) |
| `current` | Larger, glowing ring (primary), white icon, reward label below, **breathing** | Yes |
| `locked` | Dashed circle, `bgSubtle`, muted icon silhouette, no connector forward | No |

### Variants
- Vertical path (default for Journey). A left/right connector line links consecutive nodes; connector behind a `done` node is solid emerald, behind `current` is half-emerald/half-faint, behind `locked` is faint dashed.

### Interaction
- `done` / `current` → `onPress`, `haptics.impact('light')`, scale `0.95` on press.
- `locked` → no press; if tapped, a tiny shake animation + `haptics.warning()` to communicate "not yet" (supportive, not punitive).

### Animation rules
- `current` node: slow 3s breathe (scale 1.0 ↔ 1.06, glow opacity 0.3 ↔ 0.6). The only continuously-animated element on the path. Disabled under reduce-motion (then a static glow ring).
- On entering `done` (just completed): one-shot confetti-sparkle burst at the node center (small, 6 particles, `anim.duration.slow`), then settles. `haptics.success()`.
- Locked shake: `translateX` 0 → 6 → -6 → 0 via `anim.spring.rubbery`.

### Spacing
- Node circle: `done`/`locked` 48px, `current` 64px (larger to signal "here").
- Connector: 2px wide, vertical length `spacing.xxl` (24) between centers.
- Label/sublabel column: to the right of node, `gap: spacing.xs`.
- Row internal gap: `spacing.md`.

### Accessibility
- `accessibilityRole="button"` for done/current, `accessibilityLabel` = `${label}, ${sublabel ?? ''}, ${state}`.
- `locked`: `accessibilityRole="text"`, label includes "locked — complete previous to unlock".
- State conveyed by icon + text, not color alone (locked has dashed border + muted icon).

---

## 7 · Primitive 6 — `TrophyTile`

**Purpose.** An achievement tile. Earned = full color + date. Locked = silhouette + hint of how to earn it. Turns empty voids into **invitations**. This is the single most important primitive for the "Profile = identity" shift.

**Mental model:** PlayStation trophy icons + Steam achievement cards + the "locked" overlay that makes you *want* it.

### Props (TS)

```ts
interface TrophyTileProps {
  earned: boolean;
  icon: keyof typeof Ionicons.glyphMap; // earned: full color; locked: rendered as silhouette
  title: string;
  hint?: string;            // how to unlock — shown for locked
  dateEarned?: string;      // ISO or formatted — shown for earned
  rarity?: 'common' | 'rare' | 'epic'; // optional tier flair
  onPress?: () => void;
}
```

### States
| State | Visual |
|---|---|
| `earned` | Full-color icon in `accentLight` chip, title, date, optional rarity star |
| `locked` | **Silhouette** (icon tinted `bgSubtle` on `bgSubtle`-darker), title faint, hint "Complete X to unlock", small lock glyph |
| `rare/epic` | Earned + a colored corner flair (rare=`info`, epic=`accent`) |

### Variants
- Default grid tile: 1-of-N in a `TrophyCase`. Width fills grid cell (typically 2-per-row).
- Detail (tap): could open a bottom sheet — out of scope for primitive; the tile just fires `onPress`.

### Interaction
- Tap → `onPress` (earned: show detail/story; locked: show hint expanded). `haptics.impact('light')`.
- On **earn** (live transition): one-shot gold burst + scale pop (`anim.spring.bouncy`), `haptics.success()`.

### Animation rules
- On **mount as earned recently** (within 24h, passed via parent context optionally): gentle gold shimmer sweep once.
- Locked tile: static (no breathe — locked shouldn't beg; the hint does the work).
- Transition locked → earned: silhouette fades to full-color + scale 0.9 → 1.05 → 1.0.

### Spacing
- Tile: `radius.lg` (16), padding `spacing.md`, elevation `shadow(1)` when earned, flat when locked.
- Icon chip: 44×44, `radius.md`.
- Title: `type.bodyStrong`, 1 line; hint: `type.caption`, `textMuted`, 2 lines.
- Grid gap: `spacing.md`.

### Accessibility
- `accessibilityRole="button"`.
- Earned label: `${title}, earned ${dateEarned}`.
- Locked label: `${title}, locked. ${hint ?? 'Keep going to unlock.'}`.
- State conveyed via text ("earned"/"locked"), not color alone.

---

## 8 · Primitive 7 — `LedgerEntry`

**Purpose.** One growth-framed moment in a vertical feed. "↑ +15 · Algebra homework." Every learning event becomes a story entry, not a log row. Powers the Home mini-feed, the Journey, and the Portfolio.

**Mental model:** Strava activity feed + a bank statement of growth, always positive-framed.

### Props (TS)

```ts
interface LedgerEntryProps {
  delta?: string;          // "+15 XP", "+1 🪙", "🏆" — omitted for non-numeric moments
  label: string;           // "Algebra homework completed"
  sublabel?: string;       // "Chapter 4 · 2h ago"
  icon: keyof typeof Ionicons.glyphMap;
  tone?: 'xp' | 'coins' | 'win' | 'milestone' | 'neutral'; // drives icon chip color
  onPress?: () => void;
}
```

### States
| State | Visual |
|---|---|
| `default` | Row: icon chip · (label / sublabel) · right-aligned delta |
| `milestone` | `tone='milestone'` → wider, accent-bordered, "New level!" style |

### Variants (`tone` → chip color)
- `xp` → `primaryLight` / `primary`.
- `coins` → `accentLight` / `accent`.
- `win` → `primaryLight` / `primary` + trophy icon.
- `milestone` → `accentLight` / `accent`, full-width emphasis.
- `neutral` → `bgSubtle` / `textMuted`.

### Interaction
- Tap (if `onPress`) → navigate to source detail. `haptics.impact('light')`.

### Animation rules
- On **mount in a feed**: stagger fade-in by index (`index * 40ms`, capped at 6 entries) over `anim.duration.normal`, `anim.easing.decel`.
- No per-entry idle animation (feed must stay calm).

### Spacing
- Row height ~64, padding `spacing.md`, `radius.lg`.
- Icon chip: 40×40, `radius.md`, `gap: spacing.md` to text.
- Delta: `type.bodyStrong`, right-aligned, tone-colored.
- Container feed gap: `spacing.sm`.

### Accessibility
- `accessibilityRole` = `"button"` if pressable else `"text"`.
- Label: `${label}${delta ? ', ' + delta : ''}${sublabel ? ', ' + sublabel : ''}`.

---

## 9 · Primitive 8 — `Continuum`

**Purpose.** Per-subject growth as a mini sparkline + a **direction word**. Replaces pass/fail color coding entirely. A 58% is "climbing." The data is the same; the story is humane.

**Mental model:** GitHub contribution graph direction + a doctor's "trending" note — never a red F.

### Props (TS)

```ts
interface ContinuumProps {
  label: string;                 // subject name
  points: number[];              // recent scores, chronological (oldest→newest)
  direction?: 'rising' | 'steady' | 'needs-care'; // derived if omitted (last vs prev)
  latestLabel?: string;          // e.g. "78%" or "B+" — shown at right
  onPress?: () => void;          // open subject detail
}
```

### Direction derivation (if not provided)
- `last - prev >= +5` → `rising`
- `last - prev <= -5` → `needs-care`
- else → `steady`

### States / Variants (`direction` → treatment)
| Direction | Sparkline color | Label word | Tone |
|---|---|---|---|
| `rising` | `primary` (emerald) | "climbing" / "ko'tarilmoqda" | positive |
| `steady` | `info` (blue) | "steady" / "barqaror" | neutral-positive |
| `needs-care` | `warning` (amber) | "needs care" / "diqqat" | warm, NEVER red |

### Interaction
- Tap → `onPress` (subject detail). `haptics.impact('light')`.
- Long-press (optional, later): preview tooltip of last 3 scores.

### Animation rules
- Sparkline (`react-native-svg` `<Path>`): `pathLength` draw-in on mount over `anim.duration.slow`, `anim.easing.decel`.
- Direction arrow: fade/slide in after sparkline completes.
- No idle animation.

### Spacing
- Row: padding `spacing.md`, `radius.lg`, height ~56.
- Sparkline: width 64, height 28, `gap: spacing.md` from label.
- Latest label: `type.bodyStrong`, right-aligned.
- Direction word: `type.caption`, tone color, under or beside latest label.

### Accessibility
- `accessibilityRole="button"` if pressable.
- Label: `${label}, latest ${latestLabel ?? points[points.length-1]}, ${directionWord}`. Direction is spoken — never color-only.
- If `points.length < 2`: render a single dot + "Not enough data yet" (invitation, not void).

---

## 10 · Primitive 9 — `QuestCard`

**Purpose.** Homework/mission reframed as a **quest** with a visible reward. Overdue items are never red alarms — they're "waiting, keep your streak strong." Submission success is a celebration.

**Mental model:** Game quest log + battle-pass reward visibility, without the punitive framing.

### Props (TS)

```ts
interface QuestCardProps {
  title: string;
  subject?: string;
  dueLabel?: string;       // "Due in 2h" / "Due tomorrow" / "Overdue"
  xpReward?: number;       // shown as "+N XP" badge
  coinReward?: number;     // optional "+N 🪙"
  status: 'active' | 'overdue' | 'submitted' | 'graded';
  gradeLabel?: string;     // when graded, e.g. "92%" (shown WITHOUT red/green)
  onPress: () => void;
  onSubmit?: () => void;   // quick-action (primary CTA inside)
}
```

### States
| Status | Visual | CTA |
|---|---|---|
| `active` | Default card, XP badge accent, due label neutral | "Start"/"Continue" |
| `overdue` | **Warm amber** hairline + amber "waiting" eyebrow; **NEVER red**. Streak-framed subtitle: "Finish to keep your 🔥 streak" | "Finish now" |
| `submitted` | Muted, checkmark, "Submitted · awaiting review" | none (or view) |
| `graded` | Emerald check + grade label (neutral chip, no traffic light) + "tap to see growth" | "View growth" |

### Variants
- Reward badge: if `xpReward`, show "+N XP" pill (`accentLight`/`accent` text). If also `coinReward`, append "+N 🪙".
- `overdue` streak framing only appears if the student has an active streak (otherwise just warm amber due label).

### Interaction
- Tap card → `onPress` (detail).
- Primary CTA → `onSubmit` (open submission) or `onPress`.
- On **submission success** (parent triggers): the `QuestCard`'s parent screen shows `CelebrationOverlay` (Phase 2); the card animates `active → submitted`.

### Animation rules
- On **mount**: subtle fade-up (`translateY 8 → 0`, opacity) over `anim.duration.fast`, staggered by index (cap 5).
- On **status change to submitted**: card dims, checkmark springs in (`anim.spring.bouncy`), reward badge pulses once.
- On **graded**: grade chip slides in from right.
- Overdue eyebrow: slow 2.5s opacity breathe (0.7 ↔ 1.0) — supportive nudge, not alarm. Disabled under reduce-motion.

### Spacing
- Card: `radius.lg`, padding `spacing.lg`, `shadow(1)`.
- Header row: title (flex 1) + reward badge.
- Meta row (`type.caption`, `textMuted`): `dueLabel` · `subject`, `gap: spacing.sm`, margin-top `spacing.xs`.
- CTA: margin-top `spacing.md`, height 44, `radius.md`, full-width.
- List gap: `spacing.md`.

### Accessibility
- `accessibilityRole="button"`.
- Label: `${title}${subject ? ', ' + subject : ''}${dueLabel ? ', ' + dueLabel : ''}${xpReward ? ', reward ' + xpReward + ' XP' : ''}, ${status}`.
- `overdue` is described as "waiting" not "late/failed". State via text.

---

## 11 · Composition rules (enforced across screens)

1. **One `Compass` per screen, ever.** It is the single dominant action. If you need a second action, it goes in a lower-privilege surface (list, menu), never as a second Compass.
2. **One `DayRing` per Home.** It owns the hero. Other screens use `Pulse` + `Horizon`, not the ring.
3. **Headers are alive.** Every primary screen header contains a `PulseRow` (streak + level) and optionally a compact `Horizon`. Never bare text titles with no living signal.
4. **Emptiness is an invitation.** Anywhere a list could be empty, use `TrophyTile` (locked) semantics or a `Continuum` "not enough data yet" — never a bare dashed void. The `EmptyState` component is reserved for *genuine* nothing (e.g. network) and must use forward-language copy.
5. **No traffic lights on academics.** Grades, homework, subjects use `Continuum` direction words and `warning` amber at most. `danger` red is forbidden on academic surfaces.
6. **Rewards are always visible before action.** Every CTA-bearing primitive (`Compass`, `QuestCard`, `PathNode` current) shows the reward (`rewardLabel` / `xpReward`) *before* the student acts. Anticipation > surprise-only.
7. **Motion = meaning.** Only "alive" things animate continuously (current `PathNode`, streak `Pulse` sleeping/active, overdue eyebrow breathe). Everything else animates only on mount or on change. A calm screen is a trustworthy screen.
8. **Reduce motion is respected everywhere.** Every continuous/celebration animation has a static fallback.

---

## 12 · Shared accessibility contract (all primitives)

- Minimum 44×44 hit target for any pressable (`Compass`, `QuestCard`, `PathNode` done/current, `TrophyTile`, `Continuum`, pressable `Pulse`).
- `haptics` on every press; `success` on positive completions; **never `error` haptic for academic outcomes**.
- Color is never the sole state signal — every state has text/label equivalence.
- Dynamic type: primitives scale with `type` variants; no hardcoded font sizes.
- `AccessibilityInfo.isReduceMotionEnabled()` gates all continuous and celebratory motion.

---

## 13 · Shared animation contract (all primitives)

| Event | Curve / Spring | Duration |
|---|---|---|
| Mount fill / draw-in | `anim.easing.decel` | `anim.duration.slow` (400ms) |
| Press scale | `anim.spring.snappy` | spring-resolved |
| Value pop (Pulse) | `anim.spring.bouncy` | spring-resolved |
| Continuous breathe | — | 2.5–4s loop, reduce-motion gated |
| Celebration burst | `anim.spring.bouncy` | `anim.duration.slow` cap |
| Status transition | `anim.spring.gentle` | spring-resolved |

Stagger rule: list-like mounts stagger by `40ms × index`, capped at 6 entries.

---

## 14 · Shared spacing contract (all primitives)

- Outer screen padding: `spacing.lg` (16).
- Section gap (between primitive blocks): `spacing.xl` (20) on Home, `spacing.lg` elsewhere.
- In-primitive gaps: `spacing.xs` (tight), `spacing.sm` (chip↔text), `spacing.md` (column default), `spacing.lg` (section within card).
- Grid gap (`TrophyCase`, `Continuum` list): `spacing.md`.
- All radii from `radius` scale. Pressables use `radius.md`+; hero/ring surfaces use `radius.xl`+.

---

## 15 · File map (where primitives will live)

```
apps/mobile/src/components/current/
├── day-ring.tsx          # DayRing
├── compass.tsx           # Compass
├── pulse.tsx             # Pulse (+ PulseRow composition)
├── horizon.tsx           # Horizon
├── path-node.tsx         # PathNode (+ Path connector helper)
├── trophy-tile.tsx       # TrophyTile (+ TrophyCase composition)
├── ledger-entry.tsx      # LedgerEntry (+ Ledger composition)
├── continuum.tsx         # Continuum
├── quest-card.tsx        # QuestCard
├── celebration-overlay.tsx # (Phase 2 — celebration moments)
└── index.ts              # barrel export
```

All primitives import from `@/theme/tokens`, `@/theme/use-theme`, `@/lib/haptics`, and `react-native-svg`. No primitive imports a screen. No screen imports a primitive's internals — only the barrel.

---

## 16 · Build order (binding)

1. **Phase 1 (this spec → code):** implement all 9 primitives in `src/components/current/`, each with the API above. Unit-verify props/states in isolation. No screen changes.
2. **Phase 0 (truth, in parallel):** replace `streak = 0` ×3 with `streakFromAttendance`; replace mock `isDone/isActive` with real time-based lesson-state computation. The app stops lying.
3. **Phase 2 (Home):** rebuild StudentHome composing `DayRing + Compass + PulseRow + Horizon + Ledger(mini)`. Only after 1 is complete.

---

*End of CURRENT Design System specification. This document is the source of truth. Any deviation in code must update this doc first.*
