'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, RotateCcw, Loader2, ChevronRight,
  AlertTriangle, CheckCircle2, Activity, History, Clock,
  Calendar, GraduationCap, CreditCard, ShieldAlert, BookOpen, TrendingDown,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { useConfirm } from '@/store/confirm.store';
import { aiAnalyticsApi, type RuleEngineConfig, DEFAULT_RULE_CONFIG } from '@/lib/api/ai-analytics';
import { cn } from '@/lib/utils';

// ── Color palette (saturated — 120% vibrance) ─────────────────────────────
const SIG = {
  attendance: { icon: Calendar,     color: '#1D4ED8', bg: '#DBEAFE', text: '#1E40AF', dark_bg: '#1e3a5f' },
  gpa:        { icon: GraduationCap,color: '#7C3AED', bg: '#EDE9FE', text: '#6D28D9', dark_bg: '#3b1e7a' },
  gpaDrop:    { icon: TrendingDown,  color: '#4F46E5', bg: '#E0E7FF', text: '#4338CA', dark_bg: '#2a1f70' },
  payment:    { icon: CreditCard,   color: '#D97706', bg: '#FEF3C7', text: '#B45309', dark_bg: '#6b3c0a' },
  discipline: { icon: ShieldAlert,  color: '#DC2626', bg: '#FEE2E2', text: '#B91C1C', dark_bg: '#5c1a1a' },
  homework:   { icon: BookOpen,     color: '#059669', bg: '#D1FAE5', text: '#047857', dark_bg: '#0a4a30' },
} as const;

const SIGNALS = [
  { key: 'attendanceWeight' as const, sig: 'attendance', label: 'Davomat',          max: 50, tKey: 'attendanceThreshold' as const, tMin: 50, tMax: 95, tStep: 5,   tSfx: '%',   desc: "Darsga kelmasa risk oshadi" },
  { key: 'gpaWeight'        as const, sig: 'gpa',        label: 'GPA',              max: 50, tKey: 'gpaThreshold'        as const, tMin: 1.5,tMax: 4.0,tStep: 0.5, tSfx: '/5',  desc: "O'rtacha baho past bo'lsa" },
  { key: 'gpaDropWeight'    as const, sig: 'gpaDrop',    label: 'GPA tushishi',     max: 30, tKey: 'gpaDropThreshold'    as const, tMin: 5,  tMax: 30, tStep: 5,   tSfx: '%',   desc: "4 hafta ichida trend tushsa" },
  { key: 'paymentWeight'    as const, sig: 'payment',    label: "To'lov qarzdorlik",max: 50, tKey: null,                           tMin: 0,  tMax: 0,  tStep: 0,   tSfx: '',    desc: "Har kechikkan oy +ball" },
  { key: 'disciplineWeight' as const, sig: 'discipline', label: 'Intizom',          max: 30, tKey: 'disciplineThreshold' as const, tMin: 1,  tMax: 10, tStep: 1,   tSfx: ' ta', desc: "30 kun ichida hodisalar" },
  { key: 'homeworkWeight'   as const, sig: 'homework',   label: 'Uy vazifasi',      max: 30, tKey: 'homeworkThreshold'   as const, tMin: 30, tMax: 80, tStep: 5,   tSfx: '%',   desc: "Bajarilmagan uy vazifalari" },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────────
function impactLabel(val: number, max: number, totalWeights: number): { text: string; sub: string } {
  const pct = val / max;
  const share = Math.round((val / Math.max(totalWeights, 1)) * 100);
  const tier = pct >= 0.7 ? 'Juda kuchli' : pct >= 0.4 ? 'Kuchli' : pct >= 0.2 ? "O'rta" : 'Zaif';
  return { text: tier, sub: `Riskning ${share}%` };
}

function validateCfg(cfg: RuleEngineConfig): string | null {
  if (cfg.criticalThreshold <= cfg.highThreshold) return `CRITICAL > HIGH bo'lishi shart`;
  if (cfg.highThreshold <= cfg.mediumThreshold)    return `HIGH > MEDIUM bo'lishi shart`;
  return null;
}

function calcBreakdown(cfg: RuleEngineConfig, sc: ScenarioParams) {
  const att = sc.att < cfg.attendanceThreshold
    ? Math.min(cfg.attendanceWeight, Math.round((cfg.attendanceThreshold - sc.att) / cfg.attendanceThreshold * cfg.attendanceWeight)) : 0;
  const gpa = sc.gpa < cfg.gpaThreshold
    ? Math.min(cfg.gpaWeight, Math.round((cfg.gpaThreshold - sc.gpa) / cfg.gpaThreshold * cfg.gpaWeight)) : 0;
  const drop = sc.gpaDrop > cfg.gpaDropThreshold
    ? Math.min(cfg.gpaDropWeight, Math.round((sc.gpaDrop - cfg.gpaDropThreshold) / cfg.gpaDropThreshold * cfg.gpaDropWeight)) : 0;
  const pay  = Math.min(cfg.paymentWeight, sc.pay * Math.round(cfg.paymentWeight / 2));
  const disc = sc.disc > cfg.disciplineThreshold ? Math.min(cfg.disciplineWeight, sc.disc * 3) : sc.disc > 0 ? sc.disc * 2 : 0;
  const hw   = sc.hw < cfg.homeworkThreshold
    ? Math.min(cfg.homeworkWeight, Math.round((cfg.homeworkThreshold - sc.hw) / cfg.homeworkThreshold * cfg.homeworkWeight)) : 0;
  const total = Math.min(100, att + gpa + drop + pay + disc + hw);
  return { att, gpa, drop, pay, disc, hw, total };
}

function riskLevel(score: number, cfg: RuleEngineConfig) {
  if (score >= cfg.criticalThreshold) return 'CRITICAL';
  if (score >= cfg.highThreshold)     return 'HIGH';
  if (score >= cfg.mediumThreshold)   return 'MEDIUM';
  return 'LOW';
}

type ScenarioParams = { att: number; gpa: number; gpaDrop: number; pay: number; disc: number; hw: number };

// ── ACCORDION SIGNAL CARD ─────────────────────────────────────────────────
function SignalCard({ signal, weight, threshold, defaultWeight, defaultThreshold, totalWeights, onChange, onThresholdChange, disabled }: {
  signal: typeof SIGNALS[number]; weight: number; threshold?: number;
  defaultWeight: number; defaultThreshold?: number; totalWeights: number;
  onChange: (v: number) => void; onThresholdChange?: (v: number) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const s = SIG[signal.sig as keyof typeof SIG];
  const Icon = s.icon;
  const { text: impTxt, sub: impSub } = impactLabel(weight, signal.max, totalWeights);
  const changed = weight !== defaultWeight || (threshold !== undefined && threshold !== defaultThreshold);
  const pct = Math.round((weight / signal.max) * 100);

  return (
    <div className={cn('rounded-2xl overflow-hidden border-2 transition-all duration-200',
      open ? 'border-current/20 shadow-sm' : 'border-transparent',
      changed && 'ring-2 ring-yellow-400 ring-offset-1'
    )} style={{ borderColor: open ? s.color + '40' : undefined }}>

      {/* ── Collapsed header (always visible) ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left rounded-2xl"
        style={{ background: open ? s.bg : 'transparent' }}
      >
        {/* Icon */}
        <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-white transition-transform duration-200"
          style={{ background: s.color, transform: open ? 'scale(1.05)' : 'scale(1)' }}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Label + desc */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-xedu-slate-800 dark:text-xedu-slate-100">{signal.label}</span>
            {changed && <span className="text-[9px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-black">↑ o'zgardi</span>}
          </div>
          <p className="text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400 truncate">{signal.desc}</p>
        </div>

        {/* Score + impact label */}
        <div className="text-right shrink-0 mr-1">
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-xl font-black" style={{ color: s.color }}>{weight}</span>
            <span className="text-xs text-xedu-slate-400">/{signal.max}</span>
          </div>
          <div className="text-[10px] font-semibold" style={{ color: s.color }}>{impTxt}</div>
          <div className="text-[9px] text-xedu-slate-400">{impSub}</div>
        </div>

        {/* Mini weight bar + chevron */}
        <div className="flex flex-col items-center gap-1 shrink-0">
          <div className="h-8 w-1.5 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 overflow-hidden">
            <div className="w-full rounded-full transition-all duration-300" style={{ height: `${pct}%`, marginTop: `${100 - pct}%`, background: s.color }} />
          </div>
          <ChevronRight className={cn('h-3.5 w-3.5 text-xedu-slate-400 transition-transform duration-200', open && 'rotate-90')} />
        </div>
      </button>

      {/* ── Expanded sliders ── */}
      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4" style={{ background: s.bg }}>
          {/* Weight slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-medium" style={{ color: s.text }}>Risk og'irligi (max ball)</span>
              <span className="font-mono font-bold" style={{ color: s.color }}>{weight} / {signal.max}</span>
            </div>
            <Slider min={0} max={signal.max} step={1} value={[weight]} onValueChange={([v]) => onChange(v)} disabled={disabled} />
            <div className="flex justify-between text-[9px]" style={{ color: s.text + '80' }}>
              <span>Zaif</span><span>O'rta</span><span>Kuchli</span><span>Juda kuchli</span>
            </div>
          </div>

          {/* Threshold slider */}
          {signal.tKey && threshold !== undefined && onThresholdChange && (
            <div className="space-y-2 pt-3 border-t" style={{ borderColor: s.color + '30' }}>
              <div className="flex justify-between text-xs">
                <span className="font-medium" style={{ color: s.text }}>Trigger chegara</span>
                <span className="font-mono font-bold" style={{ color: s.color }}>{threshold}{signal.tSfx}</span>
              </div>
              <Slider min={signal.tMin} max={signal.tMax} step={signal.tStep} value={[threshold]} onValueChange={([v]) => onThresholdChange(v)} disabled={disabled} />
            </div>
          )}

          {/* Change diff (if changed) */}
          {changed && (
            <div className="flex items-center gap-2 text-[11px] font-medium rounded-xl px-3 py-2" style={{ background: s.color + '15', color: s.text }}>
              <span>Default:</span>
              <span className="line-through opacity-60">{defaultWeight}</span>
              <span>→</span>
              <span className="font-black">{weight}</span>
              {weight > defaultWeight
                ? <span className="ml-auto text-orange-600">↑ kuchaytirildı</span>
                : <span className="ml-auto text-blue-600">↓ yumshatildı</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SCENARIO SANDBOX ──────────────────────────────────────────────────────
const DEFAULT_SC: ScenarioParams = { att: 72, gpa: 2.8, gpaDrop: 18, pay: 1, disc: 2, hw: 55 };

function ScenarioSandbox({ cfg }: { cfg: RuleEngineConfig }) {
  const [sc, setSc] = useState(DEFAULT_SC);
  const bd = useMemo(() => calcBreakdown(cfg, sc), [cfg, sc]);
  const level = riskLevel(bd.total, cfg);

  const LEVEL_STYLE = {
    CRITICAL: { bg: '#FEE2E2', text: '#DC2626', bar: '#DC2626' },
    HIGH:     { bg: '#FFEDD5', text: '#EA580C', bar: '#EA580C' },
    MEDIUM:   { bg: '#FEF3C7', text: '#D97706', bar: '#D97706' },
    LOW:      { bg: '#D1FAE5', text: '#059669', bar: '#059669' },
  };
  const ls = LEVEL_STYLE[level];

  const breakdownRows = [
    { label: 'Davomat', score: bd.att, color: SIG.attendance.color },
    { label: 'GPA',     score: bd.gpa, color: SIG.gpa.color },
    { label: 'GPA trend',score: bd.drop,color: SIG.gpaDrop.color },
    { label: "To'lov",  score: bd.pay, color: SIG.payment.color },
    { label: 'Intizom', score: bd.disc,color: SIG.discipline.color },
    { label: 'HW',      score: bd.hw,  color: SIG.homework.color },
  ].filter(r => r.score > 0);

  return (
    <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden">
      {/* Score */}
      <div className="p-4 flex items-center gap-4" style={{ background: ls.bg }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-0.5" style={{ color: ls.text }}>Jonli hisob</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-black tabular-nums transition-all duration-300" style={{ color: ls.text }}>{bd.total}</span>
            <span className="text-sm opacity-50" style={{ color: ls.text }}>/100</span>
          </div>
          <div className="mt-1.5 h-2 w-36 rounded-full bg-black/10 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${bd.total}%`, background: ls.bar }} />
          </div>
        </div>
        <div className="ml-auto">
          <div className="px-4 py-2 rounded-xl text-sm font-black border-2 transition-all duration-300"
            style={{ color: ls.text, borderColor: ls.bar, background: ls.bar + '20' }}>
            {level}
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {breakdownRows.length > 0 && (
        <div className="px-4 py-3 border-b border-xedu-slate-100 dark:border-xedu-slate-800 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-xedu-slate-400 mb-2">Score tarkibi</p>
          {breakdownRows.map(r => (
            <div key={r.label} className="flex items-center gap-2">
              <span className="text-[11px] text-xedu-slate-600 dark:text-xedu-slate-400 w-20">{r.label}</span>
              <div className="flex-1 h-1.5 bg-xedu-slate-100 dark:bg-xedu-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(r.score / 100) * 100}%`, background: r.color }} />
              </div>
              <span className="text-[11px] font-mono font-bold w-6 text-right" style={{ color: r.color }}>+{r.score}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sliders */}
      <div className="p-4 space-y-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-xedu-slate-400">Parametrlarni o'zgartiring</p>
        {[
          { key: 'att' as const, label: 'Davomat', min: 0, max: 100, step: 5, sfx: '%', color: SIG.attendance.color },
          { key: 'gpa' as const, label: 'GPA',     min: 0, max: 5,   step: 0.5,sfx: '/5',color: SIG.gpa.color },
          { key: 'pay' as const, label: "To'lov",  min: 0, max: 6,   step: 1, sfx: ' oy',color: SIG.payment.color },
          { key: 'disc'as const, label: 'Intizom', min: 0, max: 10,  step: 1, sfx: ' ta',color: SIG.discipline.color },
          { key: 'hw'  as const, label: 'Uy vazifasi',min:0,max:100,step:5, sfx: '%', color: SIG.homework.color },
        ].map(({ key, label, min, max, step, sfx, color }) => (
          <div key={key} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-xedu-slate-600 dark:text-xedu-slate-400">{label}</span>
              <span className="font-mono font-bold" style={{ color }}>{sc[key]}{sfx}</span>
            </div>
            <Slider min={min} max={max} step={step} value={[sc[key]]} onValueChange={([v]) => setSc(p => ({ ...p, [key]: v }))} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LAST MODIFIED BADGE ───────────────────────────────────────────────────
function LastModified() {
  const { data: logs = [] } = useQuery({
    queryKey: ['risk-config-audit'],
    queryFn: aiAnalyticsApi.getConfigAuditLog,
    staleTime: 60_000,
  });
  const last = logs[0];
  if (!last) return null;

  const ts = new Date(last.timestamp);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - ts.getTime()) / 60000);
  const timeAgo = diffMin < 60 ? `${diffMin} daqiqa oldin` : diffMin < 1440 ? `${Math.floor(diffMin / 60)} soat oldin` : `${Math.floor(diffMin / 1440)} kun oldin`;

  const changes = last.action === 'reset_to_default' ? ['Default sozlamalarga qaytarildi'] :
    (Object.keys(last.newConfig) as (keyof RuleEngineConfig)[])
      .filter(k => last.oldConfig[k] !== last.newConfig[k])
      .map(k => `${k.replace('Weight', '').replace('Threshold', ' chegara')}: ${last.oldConfig[k]} → ${last.newConfig[k]}`);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-slate-50 dark:bg-xedu-slate-900/40 px-4 py-3">
      <Clock className="h-4 w-4 text-xedu-slate-400 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-xedu-slate-700 dark:text-xedu-slate-200">
          {last.userName || 'Foydalanuvchi'} · <span className="font-normal text-xedu-slate-500">{timeAgo}</span>
        </p>
        <p className="text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5 truncate">
          {changes.slice(0, 2).join(' · ')}{changes.length > 2 ? ` +${changes.length - 2}` : ''}
        </p>
      </div>
      <History className="h-3.5 w-3.5 text-xedu-slate-300 shrink-0" />
    </div>
  );
}

// ── LIVE IMPACT ───────────────────────────────────────────────────────────
function LiveImpact({ cfg, onPreview, previewData, previewLoading }: {
  cfg: RuleEngineConfig; onPreview: () => void;
  previewData: { distribution: Record<string, number>; totalStudents: number; sampleSize: number } | null;
  previewLoading: boolean;
}) {
  const totalWeights = SIGNALS.reduce((s, sig) => s + (cfg[sig.key] as number), 0);
  const overCap = totalWeights > 100;
  const validErr = validateCfg(cfg);

  return (
    <div className="space-y-4">
      {/* Policy health */}
      <div className={cn('rounded-2xl p-4 border-2 transition-all duration-300',
        validErr ? 'border-red-400 bg-red-50 dark:bg-red-950/20' :
        overCap  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' :
                   'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
      )}>
        <div className="flex items-start gap-2.5">
          {validErr || overCap ? <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5', validErr ? 'text-red-600' : 'text-amber-600')} />
                               : <CheckCircle2  className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
          <div>
            <p className={cn('text-sm font-bold', validErr ? 'text-red-700 dark:text-red-400' : overCap ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400')}>
              {validErr ? 'Siyosat yaroqsiz' : overCap ? 'Risk siyosati muvozanatdan chiqmoqda' : 'Siyosat muvozanatli'}
            </p>
            <p className={cn('text-xs mt-0.5 opacity-80', validErr ? 'text-red-600' : overCap ? 'text-amber-600' : 'text-emerald-600')}>
              {validErr || (overCap
                ? `Signallar yig'indisi ${totalWeights}pt — ba'zilari bir-birini bosib ketmoqda`
                : `Jami ${totalWeights}pt — optimal range`)}
            </p>
          </div>
        </div>

        {/* Weight chart */}
        <div className="mt-3 space-y-1.5">
          {SIGNALS.map(sig => {
            const w = cfg[sig.key] as number;
            const s = SIG[sig.sig as keyof typeof SIG];
            const pct = Math.round((w / Math.max(totalWeights, 1)) * 100);
            return (
              <div key={sig.key} className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                <span className="text-[11px] text-xedu-slate-600 dark:text-xedu-slate-400 w-24 truncate">{sig.label}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                  <div className="h-full rounded-full transition-all duration-400" style={{ width: `${pct}%`, background: s.color }} />
                </div>
                <span className="text-[10px] font-mono font-bold w-7 text-right" style={{ color: s.color }}>{w}pt</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Animated threshold bar */}
      <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-xedu-slate-400">Risk darajalari</p>
        <div className="relative h-7 rounded-full overflow-hidden flex shadow-inner">
          {[
            { label: 'LOW',      from: 0,                     to: cfg.mediumThreshold,   color: '#059669' },
            { label: 'MEDIUM',   from: cfg.mediumThreshold,   to: cfg.highThreshold,     color: '#D97706' },
            { label: 'HIGH',     from: cfg.highThreshold,     to: cfg.criticalThreshold, color: '#EA580C' },
            { label: 'CRITICAL', from: cfg.criticalThreshold, to: 100,                   color: '#DC2626' },
          ].map(seg => (
            <div key={seg.label}
              className="h-full flex items-center justify-center text-[9px] font-black text-white overflow-hidden transition-all duration-500"
              style={{ width: `${seg.to - seg.from}%`, background: seg.color }}>
              {seg.to - seg.from >= 14 && seg.label}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-xedu-slate-400 px-0.5">
          <span>0</span><span>{cfg.mediumThreshold}</span><span>{cfg.highThreshold}</span><span>{cfg.criticalThreshold}</span><span>100</span>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-xedu-slate-50 dark:bg-xedu-slate-900/40 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold">Joriy siyosat ta'siri</p>
            <p className="text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400">Real o'quvchilar namunasi</p>
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
              { k: 'critical', label: 'CRITICAL', color: '#DC2626' },
              { k: 'high',     label: 'HIGH',     color: '#EA580C' },
              { k: 'medium',   label: 'MEDIUM',   color: '#D97706' },
              { k: 'low',      label: 'LOW',      color: '#059669' },
            ].map(({ k, label, color }) => {
              const count = previewData.distribution[k] ?? 0;
              const pct   = Math.round((count / previewData.sampleSize) * 100);
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-[10px] font-black w-16" style={{ color }}>{label}</span>
                  <div className="flex-1 h-2 bg-xedu-slate-100 dark:bg-xedu-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <span className="text-[11px] font-mono font-bold w-14 text-right" style={{ color }}>{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-xs text-xedu-slate-400 py-6 px-4">Hisoblash tugmasini bosing — bu policy bilan qancha o'quvchi qaysi darajada chiqishini ko'rasiz</p>
        )}
      </div>

      {/* Scenario Sandbox */}
      <div>
        <p className="text-sm font-bold mb-2">Scenario Sandbox</p>
        <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-3">Parametr o'zgartiring — natija + breakdown darhol yangilanadi</p>
        <ScenarioSandbox cfg={cfg} />
      </div>
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

  const update = useCallback((key: keyof RuleEngineConfig, val: number) => {
    setCfg(prev => ({ ...prev, [key]: val }));
    setDirty(true);
    setPreviewData(null);
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
      toast({ title: "Siyosat saqlandi" });
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
    if (await ask({ title: "Default siyosatga qaytarish", description: "Barcha o'zgarishlar bekor qilinadi. Audit log'ga yoziladi.", variant: 'destructive', confirmText: "Qaytarish" })) resetMut.mutate();
  };

  useEffect(() => { if (savedCfg) { setCfg({ ...DEFAULT_RULE_CONFIG, ...savedCfg }); setDirty(false); } }, [savedCfg]);

  const totalWeights = SIGNALS.reduce((s, sig) => s + (cfg[sig.key] as number), 0);

  if (isLoading) return <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-xedu-slate-400" /></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/insights')} className="flex items-center gap-1.5 text-sm text-xedu-slate-500 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-300 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Insights
          </button>
          <span className="text-xedu-slate-200 dark:text-xedu-slate-700">/</span>
          <div>
            <h1 className="text-xl font-black">Risk Engine Policy Editor</h1>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Siz butun risk engine siyosatini boshqaryapsiz</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && !validErr && <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">Saqlanmagan</Badge>}
          {validErr && <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 gap-1"><AlertTriangle className="h-3 w-3" />{validErr}</Badge>}
          {canEdit && <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMut.isPending} className="gap-1.5">
            {resetMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />} Default
          </Button>}
          {canEdit && <Button size="sm" disabled={!dirty || !!validErr || saveMut.isPending} onClick={() => saveMut.mutate(cfg)} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white">
            {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Siyosatni saqlash
          </Button>}
        </div>
      </div>

      {/* Last modified */}
      <LastModified />

      {/* Two columns */}
      <div className="grid gap-5 xl:grid-cols-5">
        {/* Rule editor (3/5) */}
        <div className="xl:col-span-3 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-bold">Signal og'irliklari · <span className={cn('font-mono', totalWeights > 100 ? 'text-amber-600' : 'text-emerald-600')}>{totalWeights}pt</span></p>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Bosib oching</p>
          </div>

          {SIGNALS.map(signal => (
            <SignalCard
              key={signal.key} signal={signal}
              weight={cfg[signal.key] as number}
              threshold={signal.tKey ? (cfg[signal.tKey] as number) : undefined}
              defaultWeight={DEFAULT_RULE_CONFIG[signal.key] as number}
              defaultThreshold={signal.tKey ? (DEFAULT_RULE_CONFIG[signal.tKey] as number) : undefined}
              totalWeights={totalWeights}
              onChange={v => update(signal.key, v)}
              onThresholdChange={signal.tKey ? v => update(signal.tKey!, v) : undefined}
              disabled={!canEdit}
            />
          ))}

          {/* Thresholds */}
          <div className="rounded-2xl border-2 border-xedu-slate-100 dark:border-xedu-slate-800 p-4 space-y-3 mt-1">
            <p className="text-sm font-bold flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" />Daraja chegaralari</p>
            {[
              { key: 'criticalThreshold' as const, label: 'CRITICAL', color: '#DC2626' },
              { key: 'highThreshold'     as const, label: 'HIGH',     color: '#EA580C' },
              { key: 'mediumThreshold'   as const, label: 'MEDIUM',   color: '#D97706' },
            ].map(({ key, label, color }) => (
              <div key={key} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-black" style={{ color }}>{label} — {cfg[key]}+ ball</span>
                </div>
                <Slider min={10} max={90} step={5} value={[cfg[key]]} onValueChange={([v]) => update(key, v)} disabled={!canEdit} />
              </div>
            ))}
            {validErr && <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl p-2.5"><AlertTriangle className="h-4 w-4 shrink-0" />{validErr}</div>}
            <div className="pt-2 border-t border-xedu-slate-100 dark:border-xedu-slate-800 space-y-1">
              <div className="flex justify-between text-xs"><span>GPA min namuna</span><span className="font-mono font-bold">{cfg.minGpaSample} ta</span></div>
              <Slider min={2} max={10} step={1} value={[cfg.minGpaSample]} onValueChange={([v]) => update('minGpaSample', v)} disabled={!canEdit} />
            </div>
          </div>
        </div>

        {/* Live impact (2/5) */}
        <div className="xl:col-span-2">
          <div className="sticky top-4">
            <LiveImpact cfg={cfg} onPreview={async () => {
              setPreviewLoading(true);
              try { setPreviewData(await aiAnalyticsApi.previewConfig(cfg)); } catch {} finally { setPreviewLoading(false); }
            }} previewData={previewData} previewLoading={previewLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
