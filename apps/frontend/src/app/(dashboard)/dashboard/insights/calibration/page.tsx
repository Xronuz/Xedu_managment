'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, RotateCcw, Loader2, History,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, Activity, Info,
  Calendar, GraduationCap, CreditCard, ShieldAlert, BookOpen, TrendingDown as GpaDropIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { useConfirm } from '@/store/confirm.store';
import { aiAnalyticsApi, type RuleEngineConfig, DEFAULT_RULE_CONFIG } from '@/lib/api/ai-analytics';
import { cn } from '@/lib/utils';

// ── Signal definitions — platformadagi rang mapping ──────────────────────
const SIGNALS = [
  {
    key: 'attendanceWeight' as const, label: 'Davomat', icon: Calendar,
    color: '#3B82F6', bg: 'bg-blue-500', light: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-600 dark:text-blue-400',
    max: 50, thresholdKey: 'attendanceThreshold' as const,
    thresholdLabel: 'Trigger: % dan past bo\'lsa ishga tushadi', thresholdMin: 50, thresholdMax: 95, thresholdStep: 5, thresholdSuffix: '%',
    description: 'O\'quvchi darsga qanchalik kamroq kelsa, risk shunchalik yuqori',
  },
  {
    key: 'gpaWeight' as const, label: 'GPA', icon: GraduationCap,
    color: '#8B5CF6', bg: 'bg-violet-500', light: 'bg-violet-50 dark:bg-violet-950/20',
    border: 'border-violet-200 dark:border-violet-800', text: 'text-violet-600 dark:text-violet-400',
    max: 50, thresholdKey: 'gpaThreshold' as const,
    thresholdLabel: 'Trigger: 5-ballik skalada quyida bo\'lsa', thresholdMin: 1.5, thresholdMax: 4.0, thresholdStep: 0.5, thresholdSuffix: '/5',
    description: 'O\'rtacha baho past bo\'lsa akademik xavf yuqori',
  },
  {
    key: 'gpaDropWeight' as const, label: 'GPA tushishi', icon: GpaDropIcon,
    color: '#6366F1', bg: 'bg-indigo-500', light: 'bg-indigo-50 dark:bg-indigo-950/20',
    border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-600 dark:text-indigo-400',
    max: 30, thresholdKey: 'gpaDropThreshold' as const,
    thresholdLabel: 'Trigger: so\'nggi 4 hafta qancha tushsa', thresholdMin: 5, thresholdMax: 30, thresholdStep: 5, thresholdSuffix: '%',
    description: '4 hafta ichida baholar tushish trendini aniqlaydi',
  },
  {
    key: 'paymentWeight' as const, label: "To'lov qarzdorligi", icon: CreditCard,
    color: '#F59E0B', bg: 'bg-amber-500', light: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-600 dark:text-amber-400',
    max: 50, thresholdKey: null, thresholdLabel: null, thresholdMin: 0, thresholdMax: 0, thresholdStep: 0, thresholdSuffix: '',
    description: 'Har kechikkan oy riskni oshiradi (maks 2 oy)',
  },
  {
    key: 'disciplineWeight' as const, label: 'Intizom', icon: ShieldAlert,
    color: '#EF4444', bg: 'bg-red-500', light: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800', text: 'text-red-600 dark:text-red-400',
    max: 30, thresholdKey: 'disciplineThreshold' as const,
    thresholdLabel: 'Trigger: 30 kun ichida nechta hodisa', thresholdMin: 1, thresholdMax: 10, thresholdStep: 1, thresholdSuffix: ' ta',
    description: 'Intizom buzilishlarining to\'planishi',
  },
  {
    key: 'homeworkWeight' as const, label: 'Uy vazifasi', icon: BookOpen,
    color: '#10B981', bg: 'bg-emerald-500', light: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-600 dark:text-emerald-400',
    max: 30, thresholdKey: 'homeworkThreshold' as const,
    thresholdLabel: 'Trigger: bajarilish % dan past bo\'lsa', thresholdMin: 30, thresholdMax: 80, thresholdStep: 5, thresholdSuffix: '%',
    description: 'Berilgan uy vazifalarining bajarilish foizi',
  },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────
function impactLabel(val: number, max: number): { label: string; cls: string } {
  const pct = val / max;
  if (pct >= 0.7) return { label: 'Juda kuchli', cls: 'text-red-600 dark:text-red-400' };
  if (pct >= 0.4) return { label: 'Kuchli',      cls: 'text-orange-600 dark:text-orange-400' };
  if (pct >= 0.2) return { label: "O'rta",        cls: 'text-amber-600 dark:text-amber-400' };
  return             { label: 'Zaif',             cls: 'text-slate-400' };
}

function validateCfg(cfg: RuleEngineConfig): string | null {
  if (cfg.criticalThreshold <= cfg.highThreshold)
    return `CRITICAL (${cfg.criticalThreshold}) YUQORI bo'lishi shart > HIGH (${cfg.highThreshold})`;
  if (cfg.highThreshold <= cfg.mediumThreshold)
    return `HIGH (${cfg.highThreshold}) YUQORI bo'lishi shart > MEDIUM (${cfg.mediumThreshold})`;
  return null;
}

// ── Client-side risk score (formula mirror) ────────────────────────────────
function calcScore(cfg: RuleEngineConfig, params: { att: number; gpa: number; gpaDrop: number; payMonths: number; disc: number; hw: number }): number {
  const att = params.att < cfg.attendanceThreshold
    ? Math.min(cfg.attendanceWeight, Math.round((cfg.attendanceThreshold - params.att) / cfg.attendanceThreshold * cfg.attendanceWeight)) : 0;
  const gpa = params.gpa < cfg.gpaThreshold
    ? Math.min(cfg.gpaWeight, Math.round((cfg.gpaThreshold - params.gpa) / cfg.gpaThreshold * cfg.gpaWeight)) : 0;
  const drop = params.gpaDrop > cfg.gpaDropThreshold
    ? Math.min(cfg.gpaDropWeight, Math.round((params.gpaDrop - cfg.gpaDropThreshold) / cfg.gpaDropThreshold * cfg.gpaDropWeight)) : 0;
  const pay  = Math.min(cfg.paymentWeight, params.payMonths * Math.round(cfg.paymentWeight / 2));
  const disc = params.disc > cfg.disciplineThreshold ? Math.min(cfg.disciplineWeight, params.disc * 3) : params.disc > 0 ? params.disc * 2 : 0;
  const hw   = params.hw < cfg.homeworkThreshold
    ? Math.min(cfg.homeworkWeight, Math.round((cfg.homeworkThreshold - params.hw) / cfg.homeworkThreshold * cfg.homeworkWeight)) : 0;
  return Math.min(100, att + gpa + drop + pay + disc + hw);
}

function riskLevel(score: number, cfg: RuleEngineConfig): string {
  if (score >= cfg.criticalThreshold) return 'CRITICAL';
  if (score >= cfg.highThreshold)     return 'HIGH';
  if (score >= cfg.mediumThreshold)   return 'MEDIUM';
  return 'LOW';
}

// ── SCENARIO SANDBOX ──────────────────────────────────────────────────────
const DEFAULT_SCENARIO = { att: 72, gpa: 2.8, gpaDrop: 18, payMonths: 1, disc: 2, hw: 55 };

function ScenarioSandbox({ cfg }: { cfg: RuleEngineConfig }) {
  const [sc, setSc] = useState(DEFAULT_SCENARIO);
  const score = useMemo(() => calcScore(cfg, sc), [cfg, sc]);
  const level = riskLevel(score, cfg);

  const LEVEL_STYLE: Record<string, { bar: string; badge: string; ring: string }> = {
    CRITICAL: { bar: 'bg-red-500',    badge: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',    ring: 'ring-red-400' },
    HIGH:     { bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400', ring: 'ring-orange-400' },
    MEDIUM:   { bar: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',  ring: 'ring-amber-400' },
    LOW:      { bar: 'bg-emerald-500',badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400', ring: 'ring-emerald-400' },
  };
  const sty = LEVEL_STYLE[level];

  const set = (k: keyof typeof sc, v: number) => setSc(prev => ({ ...prev, [k]: v }));

  return (
    <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden">
      {/* Score display */}
      <div className={cn('p-5 flex items-center justify-between', level === 'CRITICAL' ? 'bg-red-50 dark:bg-red-950/30' : level === 'HIGH' ? 'bg-orange-50 dark:bg-orange-950/30' : level === 'MEDIUM' ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30')}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-xedu-slate-500 dark:text-xedu-slate-400 mb-1">Test o'quvchi · Jonli hisob</p>
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black tabular-nums leading-none">{score}</span>
            <span className="text-xedu-slate-400 text-sm mb-1">/ 100</span>
          </div>
          <div className="mt-2 h-2 w-40 rounded-full bg-xedu-slate-200 dark:bg-xedu-slate-700 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-300', sty.bar)} style={{ width: `${score}%` }} />
          </div>
        </div>
        <div className={cn('h-16 w-16 rounded-2xl flex items-center justify-center text-sm font-black ring-2', sty.badge, sty.ring)}>
          {level}
        </div>
      </div>

      {/* Scenario sliders */}
      <div className="p-4 space-y-3 bg-white dark:bg-xedu-slate-950">
        <p className="text-[10px] font-bold uppercase tracking-wider text-xedu-slate-400">O'quvchi parametrlarini o'zgartiring — natija darhol ko'rinadi</p>

        {[
          { key: 'att' as const,       label: 'Davomat',          min: 0,   max: 100, step: 5,   suffix: '%',  color: '#3B82F6' },
          { key: 'gpa' as const,       label: 'GPA',              min: 0,   max: 5,   step: 0.5, suffix: '/5', color: '#8B5CF6' },
          { key: 'gpaDrop' as const,   label: 'GPA tushishi',     min: 0,   max: 50,  step: 5,   suffix: '%',  color: '#6366F1' },
          { key: 'payMonths' as const, label: "To'lov (oy)",      min: 0,   max: 6,   step: 1,   suffix: ' oy', color: '#F59E0B' },
          { key: 'disc' as const,      label: 'Intizom hodisa',   min: 0,   max: 10,  step: 1,   suffix: ' ta', color: '#EF4444' },
          { key: 'hw' as const,        label: 'Uy vazifasi',      min: 0,   max: 100, step: 5,   suffix: '%',  color: '#10B981' },
        ].map(({ key, label, min, max, step, suffix, color }) => (
          <div key={key} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-xedu-slate-600 dark:text-xedu-slate-400">{label}</span>
              <span className="font-mono font-bold" style={{ color }}>{sc[key]}{suffix}</span>
            </div>
            <Slider min={min} max={max} step={step} value={[sc[key]]} onValueChange={([v]) => set(key, v)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── SIGNAL CARD ───────────────────────────────────────────────────────────
function SignalCard({ signal, weight, threshold, defaultWeight, defaultThreshold, onChange, onThresholdChange, disabled, rank }: {
  signal: typeof SIGNALS[number]; weight: number; threshold?: number;
  defaultWeight: number; defaultThreshold?: number;
  onChange: (v: number) => void; onThresholdChange?: (v: number) => void;
  disabled?: boolean; rank: number;
}) {
  const Icon = signal.icon;
  const { label: impLbl, cls: impCls } = impactLabel(weight, signal.max);
  const changed = weight !== defaultWeight || (threshold !== undefined && threshold !== defaultThreshold);
  const pct = Math.round((weight / signal.max) * 100);

  return (
    <div className={cn('rounded-2xl border-2 overflow-hidden transition-all', signal.light, signal.border, changed && 'ring-2 ring-offset-1 ring-yellow-400')}>
      {/* Card header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: signal.color }}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-xedu-slate-800 dark:text-xedu-slate-100">{signal.label}</span>
              {changed && <span className="text-[9px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-black uppercase">o'zgardi</span>}
            </div>
            <p className="text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">{signal.description}</p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className="text-2xl font-black" style={{ color: signal.color }}>{weight}</div>
          <div className="text-[10px] text-xedu-slate-400">/ {signal.max} ball</div>
        </div>
      </div>

      {/* Impact + weight bar */}
      <div className="px-5 pb-2 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-xedu-slate-500 dark:text-xedu-slate-400">Risk ta'siri</span>
          <span className={cn('font-bold', impCls)}>{impLbl}</span>
        </div>
        {/* Visual weight bar */}
        <div className="h-2 rounded-full bg-white/60 dark:bg-xedu-slate-800/60 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-200" style={{ width: `${pct}%`, background: signal.color }} />
        </div>
        <Slider min={0} max={signal.max} step={1} value={[weight]} onValueChange={([v]) => onChange(v)} disabled={disabled} />
        <div className="flex justify-between text-[9px] text-xedu-slate-300 dark:text-xedu-slate-600">
          <span>Zaif</span><span>O'rta</span><span>Kuchli</span>
        </div>
      </div>

      {/* Threshold (if applicable) */}
      {signal.thresholdKey && threshold !== undefined && onThresholdChange && (
        <div className="mx-5 mb-4 pt-3 border-t border-current/10 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-xedu-slate-500 dark:text-xedu-slate-400">{signal.thresholdLabel}</span>
            <span className="font-mono font-bold" style={{ color: signal.color }}>{threshold}{signal.thresholdSuffix}</span>
          </div>
          <Slider min={signal.thresholdMin} max={signal.thresholdMax} step={signal.thresholdStep}
            value={[threshold]} onValueChange={([v]) => onThresholdChange(v)} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

// ── LIVE IMPACT PANEL ─────────────────────────────────────────────────────
function LiveImpact({ cfg, savedCfg, onPreview, previewData, previewLoading }: {
  cfg: RuleEngineConfig;
  savedCfg?: RuleEngineConfig;
  onPreview: () => void;
  previewData: { distribution: Record<string, number>; totalStudents: number; sampleSize: number } | null;
  previewLoading: boolean;
}) {
  const totalWeights = cfg.attendanceWeight + cfg.gpaWeight + cfg.gpaDropWeight + cfg.paymentWeight + cfg.disciplineWeight + cfg.homeworkWeight;
  const overCap = totalWeights > 100;
  const validErr = validateCfg(cfg);

  // Signal share
  const shares = SIGNALS.map(s => ({
    ...s,
    w: cfg[s.key] as number,
    pct: Math.round((cfg[s.key] as number / Math.max(totalWeights, 1)) * 100),
  })).sort((a, b) => b.w - a.w);

  return (
    <div className="space-y-4">
      {/* Policy health */}
      <div className={cn('rounded-2xl p-4 border-2 space-y-3',
        validErr ? 'border-red-300 bg-red-50 dark:bg-red-950/20' :
        overCap  ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' :
                   'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20'
      )}>
        <div className="flex items-start gap-2.5">
          {validErr ? <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" /> :
           overCap  ? <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" /> :
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
          <div>
            <p className={cn('text-sm font-bold', validErr ? 'text-red-700 dark:text-red-400' : overCap ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400')}>
              {validErr ? 'Siyosat yaroqsiz' : overCap ? 'Risk siyosati muvozanatdan chiqmoqda' : 'Siyosat muvozanatli'}
            </p>
            <p className={cn('text-xs mt-0.5', validErr ? 'text-red-600/80' : overCap ? 'text-amber-600/80' : 'text-emerald-600/80')}>
              {validErr || (overCap ? `Ba'zi signallar bir-birini bosib ketmoqda (jami ${totalWeights}pt). Risk natijalari haddan tashqari agressiv bo'lishi mumkin.` : `Jami ${totalWeights} / 100 — optimal range`)}
            </p>
          </div>
        </div>

        {/* Signal weights bar chart */}
        <div className="space-y-1.5">
          {shares.map(s => (
            <div key={s.key} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
              <span className="text-[11px] text-xedu-slate-600 dark:text-xedu-slate-400 w-28 truncate">{s.label}</span>
              <div className="flex-1 h-2 bg-white/60 dark:bg-xedu-slate-800/60 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${s.pct}%`, background: s.color }} />
              </div>
              <span className="text-[11px] font-mono font-bold w-8 text-right" style={{ color: s.color }}>{s.w}pt</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risk thresholds visual */}
      <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-xedu-slate-400">Risk darajalari chegarasi</p>
        <div className="relative h-6 rounded-full overflow-hidden flex">
          {[
            { label: 'LOW',      from: 0,                        to: cfg.mediumThreshold,   color: '#10B981' },
            { label: 'MEDIUM',   from: cfg.mediumThreshold,      to: cfg.highThreshold,     color: '#F59E0B' },
            { label: 'HIGH',     from: cfg.highThreshold,        to: cfg.criticalThreshold, color: '#F97316' },
            { label: 'CRITICAL', from: cfg.criticalThreshold,    to: 100,                   color: '#EF4444' },
          ].map(seg => (
            <div key={seg.label} className="h-full flex items-center justify-center text-[9px] font-black text-white overflow-hidden transition-all duration-300"
              style={{ width: `${seg.to - seg.from}%`, background: seg.color, minWidth: seg.to - seg.from < 8 ? '4px' : undefined }}>
              {seg.to - seg.from >= 12 && seg.label}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-xedu-slate-400">
          <span>0</span><span>{cfg.mediumThreshold}</span><span>{cfg.highThreshold}</span><span>{cfg.criticalThreshold}</span><span>100</span>
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden">
        <div className="p-4 bg-xedu-slate-50 dark:bg-xedu-slate-900/40 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Joriy siyosat ta'siri</p>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">Real o'quvchilar namunasi</p>
          </div>
          <Button size="sm" variant="outline" onClick={onPreview} disabled={previewLoading || !!validErr} className="gap-1.5 shrink-0">
            {previewLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Activity className="h-3 w-3" />}
            Hisoblash
          </Button>
        </div>
        {previewData ? (
          <div className="p-4 space-y-2">
            <p className="text-[10px] text-xedu-slate-400">{previewData.sampleSize} ta namuna / {previewData.totalStudents} ta jami</p>
            {[
              { k: 'critical', label: 'CRITICAL', color: '#EF4444' },
              { k: 'high',     label: 'HIGH',     color: '#F97316' },
              { k: 'medium',   label: 'MEDIUM',   color: '#F59E0B' },
              { k: 'low',      label: 'LOW',      color: '#10B981' },
            ].map(({ k, label, color }) => {
              const count = previewData.distribution[k] ?? 0;
              const pct   = Math.round((count / previewData.sampleSize) * 100);
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-[10px] font-black w-16" style={{ color }}>{label}</span>
                  <div className="flex-1 h-2 bg-xedu-slate-100 dark:bg-xedu-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold w-14 text-right" style={{ color }}>{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 text-center text-xs text-xedu-slate-400 py-6">
            Hisoblash tugmasini bosing — siz sozlagan policy bilan qancha o'quvchi qaysi darajada chiqishini ko'rasiz
          </div>
        )}
      </div>

      {/* Scenario sandbox */}
      <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden">
        <div className="p-4 bg-xedu-slate-50 dark:bg-xedu-slate-900/40">
          <p className="text-sm font-bold">Scenario Sandbox</p>
          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">Sliderlarni suring — natija darhol yangilanadi</p>
        </div>
        <div className="p-0">
          <ScenarioSandbox cfg={cfg} />
        </div>
      </div>
    </div>
  );
}

// ── AUDIT LOG ─────────────────────────────────────────────────────────────
function AuditLog() {
  const [open, setOpen] = useState(false);
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['risk-config-audit'],
    queryFn: aiAnalyticsApi.getConfigAuditLog,
    enabled: open,
    staleTime: 30_000,
  });
  return (
    <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden">
      <button onClick={() => { setOpen(v => !v); if (!open) refetch(); }}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-900/40 transition-colors">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-xedu-slate-400" />
          <span className="text-sm font-semibold">Audit log</span>
          <span className="text-xs text-xedu-slate-400">— kim, qachon, nima o'zgartirdi</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-xedu-slate-400" /> : <ChevronDown className="h-4 w-4 text-xedu-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-xedu-slate-100 dark:border-xedu-slate-800 p-4 space-y-2 max-h-72 overflow-y-auto">
          {isLoading ? <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-xedu-slate-400" /></div>
           : logs.length === 0 ? <p className="text-center text-sm text-xedu-slate-400 py-4">Hali o'zgarishlar qayd etilmagan</p>
           : logs.map((entry, i) => {
               const ts = new Date(entry.timestamp);
               const changes: string[] = entry.action === 'reset_to_default' ? ["Default sozlamalarga qaytarildi"] :
                 (Object.keys(entry.newConfig) as (keyof RuleEngineConfig)[])
                   .filter(k => entry.oldConfig[k] !== entry.newConfig[k])
                   .map(k => `${k}: ${entry.oldConfig[k]} → ${entry.newConfig[k]}`);
               return (
                 <div key={i} className={cn('rounded-xl p-3 text-xs border', entry.action === 'reset_to_default' ? 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' : 'bg-xedu-slate-50 dark:bg-xedu-slate-900/40 border-xedu-slate-100 dark:border-xedu-slate-800')}>
                   <div className="flex justify-between mb-1.5">
                     <span className="font-semibold">{entry.userName || entry.userId}</span>
                     <span className="text-xedu-slate-400">{ts.toLocaleDateString('uz-UZ')} {ts.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                   </div>
                   {changes.slice(0, 4).map((c, j) => <p key={j} className="text-xedu-slate-500 dark:text-xedu-slate-400">{c}</p>)}
                   {changes.length > 4 && <p className="text-xedu-slate-400">+{changes.length - 4} ta boshqa o'zgarish</p>}
                 </div>
               );
             })}
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function CalibrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const ask = useConfirm();
  const { user } = useAuthStore();
  const canEdit = ['director', 'branch_admin', 'super_admin'].includes(user?.role ?? '');

  const { data: savedCfg, isLoading } = useQuery({ queryKey: ['risk-config'], queryFn: aiAnalyticsApi.getConfig, staleTime: 60_000 });
  const [cfg, setCfg] = useState<RuleEngineConfig>(DEFAULT_RULE_CONFIG);
  const [dirty, setDirty] = useState(false);
  const [previewData, setPreviewData] = useState<{ distribution: Record<string, number>; totalStudents: number; sampleSize: number } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (savedCfg) { setCfg({ ...DEFAULT_RULE_CONFIG, ...savedCfg }); setDirty(false); }
  }, [savedCfg]);

  const update = useCallback((key: keyof RuleEngineConfig, val: number) => {
    setCfg(prev => ({ ...prev, [key]: val }));
    setDirty(true);
    setPreviewData(null); // preview stale bo'ladi
  }, []);

  const validErr = validateCfg(cfg);

  const saveMut = useMutation({
    mutationFn: (c: Partial<RuleEngineConfig>) => aiAnalyticsApi.updateConfig(c),
    onSuccess: (updated) => {
      setCfg({ ...DEFAULT_RULE_CONFIG, ...updated });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['risk-config'] });
      qc.invalidateQueries({ queryKey: ['risk-config-audit'] });
      qc.invalidateQueries({ queryKey: ['insights'] });
      toast({ title: "Siyosat saqlandi", description: "Yangi sozlamalar darhol kuchga kirdi" });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Saqlashda xato' }),
  });

  const resetMut = useMutation({
    mutationFn: aiAnalyticsApi.resetConfig,
    onSuccess: (updated) => {
      setCfg({ ...DEFAULT_RULE_CONFIG, ...updated });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['risk-config'] });
      qc.invalidateQueries({ queryKey: ['risk-config-audit'] });
      toast({ title: "Default siyosatga qaytarildi" });
    },
  });

  const handleReset = async () => {
    if (await ask({ title: "Default siyosatga qaytarish", description: "Barcha o'zgarishlar bekor qilinadi. Bu harakat audit log'ga yoziladi.", variant: 'destructive', confirmText: "Qaytarish" })) {
      resetMut.mutate();
    }
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    try {
      const result = await aiAnalyticsApi.previewConfig(cfg);
      setPreviewData(result);
    } catch { /* ignore */ }
    finally { setPreviewLoading(false); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-xedu-slate-400" /></div>;

  const totalWeights = cfg.attendanceWeight + cfg.gpaWeight + cfg.gpaDropWeight + cfg.paymentWeight + cfg.disciplineWeight + cfg.homeworkWeight;

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/insights')} className="flex items-center gap-1.5 text-sm text-xedu-slate-500 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-300 transition-colors">
            <ArrowLeft className="h-4 w-4" />Insights
          </button>
          <span className="text-xedu-slate-200 dark:text-xedu-slate-700">/</span>
          <div>
            <h1 className="text-xl font-black tracking-tight">Risk Engine Policy Editor</h1>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">Siz butun risk engine siyosatini boshqaryapsiz</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && !validErr && <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20">Saqlanmagan o'zgarishlar</Badge>}
          {validErr && <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-950/20 gap-1"><AlertTriangle className="h-3 w-3" />{validErr}</Badge>}
          {canEdit && <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMut.isPending} className="gap-1.5">
            {resetMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}Default
          </Button>}
          {canEdit && <Button size="sm" disabled={!dirty || !!validErr || saveMut.isPending} onClick={() => saveMut.mutate(cfg)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
            {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Siyosatni saqlash
          </Button>}
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* LEFT: Rule Editor (3/5) */}
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Signal og'irliklari</h2>
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">
                Jami: <span className={cn('font-bold', totalWeights > 100 ? 'text-amber-600' : 'text-emerald-600')}>{totalWeights}pt</span> — Har signal maksimal necha ball qo'sha olishi
              </p>
            </div>
          </div>

          {SIGNALS.map((signal, i) => (
            <SignalCard
              key={signal.key} signal={signal} rank={i + 1}
              weight={cfg[signal.key] as number}
              threshold={signal.thresholdKey ? (cfg[signal.thresholdKey] as number) : undefined}
              defaultWeight={DEFAULT_RULE_CONFIG[signal.key] as number}
              defaultThreshold={signal.thresholdKey ? (DEFAULT_RULE_CONFIG[signal.thresholdKey] as number) : undefined}
              onChange={v => update(signal.key, v)}
              onThresholdChange={signal.thresholdKey ? v => update(signal.thresholdKey!, v) : undefined}
              disabled={!canEdit}
            />
          ))}

          {/* Risk level thresholds */}
          <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" />Risk darajasi chegaralari</h3>
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">critical {'>'} high {'>'} medium majburiy tartib</p>
            </div>
            {[
              { key: 'criticalThreshold' as const, label: 'CRITICAL', color: '#EF4444' },
              { key: 'highThreshold'     as const, label: 'HIGH',     color: '#F97316' },
              { key: 'mediumThreshold'   as const, label: 'MEDIUM',   color: '#F59E0B' },
            ].map(({ key, label, color }) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-black" style={{ color }}>{label} — {cfg[key]}+ ball</span>
                </div>
                <Slider min={10} max={90} step={5} value={[cfg[key]]} onValueChange={([v]) => update(key, v)} disabled={!canEdit} />
              </div>
            ))}
            {validErr && <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl p-3"><AlertTriangle className="h-4 w-4 shrink-0" />{validErr}</div>}
            <div className="space-y-1 pt-2 border-t border-xedu-slate-100 dark:border-xedu-slate-800">
              <div className="flex justify-between text-xs"><span className="font-medium">GPA minimum namuna</span><span className="font-mono font-bold">{cfg.minGpaSample} ta</span></div>
              <Slider min={2} max={10} step={1} value={[cfg.minGpaSample]} onValueChange={([v]) => update('minGpaSample', v)} disabled={!canEdit} />
              <p className="text-[10px] text-xedu-slate-400">Kam = ko'p false positive. Ko'p = sust reaktsiya.</p>
            </div>
          </div>

          <AuditLog />
        </div>

        {/* RIGHT: Live Impact (2/5) */}
        <div className="xl:col-span-2">
          <div className="sticky top-4 space-y-3">
            <div>
              <h2 className="text-base font-bold">Jonli ta'sir paneli</h2>
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5">Policy o'zgarishi real vaqtda ko'rsatiladi</p>
            </div>
            <LiveImpact cfg={cfg} savedCfg={savedCfg} onPreview={handlePreview} previewData={previewData} previewLoading={previewLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
