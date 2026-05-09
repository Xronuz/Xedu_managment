/* ═══════════════════════════════════════════════════════════════════════════════
   CHART PALETTE TOKENS
   Centralized color constants for Recharts and data visualization.

   Usage:
     import { chartAttendance, chartFinance } from '@/components/workspace-system/chart-palette';
     <Line stroke={chartAttendance.primary} />

   Rules:
   - No colorful chart chaos
   - Calm institutional tones
   - Dark-mode ready via CSS variable fallbacks
   - Each palette provides: primary, secondary, muted, accent, risk
   ═══════════════════════════════════════════════════════════════════════════════ */

export interface ChartPalette {
  primary:   string;
  secondary: string;
  muted:     string;
  accent:    string;
  risk:      string;
  surface:   string;
}

/* ── Attendance ── */
export const chartAttendance: ChartPalette = {
  primary:   'var(--xedu-primary)',
  secondary: 'var(--xedu-emerald-400)',
  muted:     'var(--xedu-slate-300)',
  accent:    'var(--xedu-sky-400)',
  risk:      'var(--xedu-ruby-400)',
  surface:   'var(--xedu-primary-light)',
};

/* ── Finance ── */
export const chartFinance: ChartPalette = {
  primary:   'var(--xedu-primary)',
  secondary: 'var(--xedu-gold-400)',
  muted:     'var(--xedu-slate-300)',
  accent:    'var(--xedu-sky-400)',
  risk:      'var(--xedu-ruby-400)',
  surface:   'var(--xedu-gold-100)',
};

/* ── Academic / Grades ── */
export const chartAcademic: ChartPalette = {
  primary:   'var(--xedu-violet-500)',
  secondary: 'var(--xedu-primary)',
  muted:     'var(--xedu-slate-300)',
  accent:    'var(--xedu-sky-400)',
  risk:      'var(--xedu-amber-400)',
  surface:   'var(--xedu-violet-100)',
};

/* ── Discipline / Incidents ── */
export const chartDiscipline: ChartPalette = {
  primary:   'var(--xedu-ruby-500)',
  secondary: 'var(--xedu-amber-400)',
  muted:     'var(--xedu-slate-300)',
  accent:    'var(--xedu-primary)',
  risk:      'var(--xedu-ruby-400)',
  surface:   'var(--xedu-ruby-100)',
};

/* ── Neutral / Generic ── */
export const chartNeutral: ChartPalette = {
  primary:   'var(--xedu-slate-500)',
  secondary: 'var(--xedu-slate-400)',
  muted:     'var(--xedu-slate-300)',
  accent:    'var(--xedu-sky-400)',
  risk:      'var(--xedu-ruby-400)',
  surface:   'var(--xedu-slate-100)',
};

/* ── Risk / Alert ── */
export const chartRisk: ChartPalette = {
  primary:   'var(--xedu-ruby-500)',
  secondary: 'var(--xedu-amber-400)',
  muted:     'var(--xedu-slate-300)',
  accent:    'var(--xedu-ruby-300)',
  risk:      'var(--xedu-ruby-400)',
  surface:   'var(--xedu-ruby-100)',
};

/* ── Premium / Achievement ── */
export const chartPremium: ChartPalette = {
  primary:   'var(--xedu-gold-500)',
  secondary: 'var(--xedu-primary)',
  muted:     'var(--xedu-slate-300)',
  accent:    'var(--xedu-violet-400)',
  risk:      'var(--xedu-ruby-400)',
  surface:   'var(--xedu-gold-100)',
};

/* ── Default Recharts color array (for Pie/Bar with many segments) ── */
export const chartColorSequence = [
  'var(--xedu-primary)',
  'var(--xedu-sky-400)',
  'var(--xedu-violet-400)',
  'var(--xedu-emerald-400)',
  'var(--xedu-amber-400)',
  'var(--xedu-ruby-400)',
  'var(--xedu-gold-400)',
  'var(--xedu-slate-400)',
];

/* ── Opacity helpers for area fills ── */
export const chartFillOpacity = {
  solid:   1,
  strong:  0.4,
  medium:  0.2,
  subtle:  0.1,
  ghost:   0.05,
};
