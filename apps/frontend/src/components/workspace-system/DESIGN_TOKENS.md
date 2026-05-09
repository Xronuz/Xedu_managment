# Xedu Design Tokens

## Semantic Color System

### Token Families

| Family | Usage | Light 500 | Dark 500 |
|--------|-------|-----------|----------|
| `xedu-primary` | Brand, action, success-adjacent | `#0F7B53` | `#0F7B53` |
| `xedu-slate` | Neutrals, text, borders | Full 50-950 scale | Inverted dark scale |
| `xedu-ruby` | Danger, error, urgent, rejected, failed, overdue | `#EF4444` | `#DC2626` |
| `xedu-amber` | Warning, attention, pending | `#F59E0B` | `#B45309` |
| `xedu-emerald` | Success, positive, approved, paid, active, resolved | `#10B981` | `#059669` |
| `xedu-sky` | Info, published, neutral-action, resolved-alt | `#0EA5E9` | `#0284C7` |
| `xedu-violet` | AI, analytics, premium insights | `#8B5CF6` | `#6D28D9` |
| `xedu-gold` | Premium, achievement, coins, rewards | `#D4A843` | `#96732B` |

### Scale Convention

Each family provides 50-950:
- `50` — Lightest tint (subtle backgrounds, hover states)
- `100-200` — Light tints (badge backgrounds, row tones)
- `300-400` — Medium tints (borders, accents)
- `500-600` — Core color (primary text, icons, dots)
- `700-800` — Dark shades (emphasis text)
- `900-950` — Darkest shades (dark mode text, borders)

### Forbidden Patterns

❌ **Never use raw Tailwind colors in operational UI:**
- `bg-red-*`, `text-red-*`, `border-red-*`
- `bg-amber-*`, `text-amber-*` (except via `xedu-amber` tokens)
- `bg-blue-*`, `text-blue-*`
- `bg-violet-*`, `text-violet-*`
- `bg-green-*`, `text-green-*`
- `bg-gray-*`, `text-gray-*`

✅ **Always use semantic tokens:**
- Status → `StatusBadge` or `StatusDot` components
- Backgrounds → `surface-*` utilities or `xedu-{family}-50`
- Text → `xedu-{family}-600` or `xedu-{family}-700`
- Borders → `xedu-{family}-200` or `xedu-{family}-300`

## Status Mapping

| Business State | StatusBadge Variant | Tone |
|----------------|---------------------|------|
| Active, Paid, Approved, Resolved, Success | `success` / `active` / `paid` / `approved` / `resolved` | `success` |
| Pending, Warning, Attention | `pending` / `warning` | `attention` |
| Danger, Failed, Overdue, Rejected, Unresolved | `danger` / `failed` / `overdue` / `rejected` / `unresolved` | `urgent` |
| Info, Published | `info` / `published` | — |
| Draft, Inactive, Neutral | `draft` / `inactive` / `neutral` | `muted` |
| Premium | `premium` | — |
| AI-generated | `ai` | — |

## Surface Utilities

| Utility | Usage |
|---------|-------|
| `surface-base` | Default card/container background |
| `surface-muted` | Subdued background (sidebars, secondary panels) |
| `surface-elevated` | Cards with shadow (dialogs, modals) |
| `surface-inset` | Nested/input-like backgrounds |
| `surface-selected` | Selected/highlighted state |
| `surface-warning` | Warning alert background |
| `surface-danger` | Error alert background |
| `surface-success` | Success alert background |

## Chart Palettes

Import from `chart-palette.ts`:
- `chartAttendance` — Green-primary, sky accent
- `chartFinance` — Green-primary, gold secondary
- `chartAcademic` — Violet-primary, green secondary
- `chartDiscipline` — Ruby-primary, amber secondary
- `chartNeutral` — Slate scale
- `chartRisk` — Ruby scale
- `chartPremium` — Gold-primary, green secondary

## Row Tones (OpTable)

| Tone | Visual |
|------|--------|
| `neutral` | Default |
| `success` | Emerald left border + emerald tint background |
| `attention` | Amber left border + amber tint background |
| `urgent` | Ruby left border + ruby tint background |
| `muted` | 60% opacity |
