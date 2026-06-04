'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal, RotateCcw, Save, ArrowLeft, Loader2,
  Info, AlertTriangle, CheckCircle2, BookOpen, Calendar, CreditCard,
  GraduationCap, ShieldAlert, TrendingDown, Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { aiAnalyticsApi, type RuleEngineConfig, DEFAULT_RULE_CONFIG } from '@/lib/api/ai-analytics';
import { cn } from '@/lib/utils';

// ── Signal meta ────────────────────────────────────────────────────────────
const SIGNALS = [
  {
    key:   'attendanceWeight' as const,
    label: 'Davomat',
    desc:  'Davomat pastligining risk ulushi',
    icon:  Calendar,
    color: 'text-orange-500',
    bg:    'bg-orange-50 dark:bg-orange-950/20',
    max:   50,
    thresholdKey: 'attendanceThreshold' as const,
    thresholdLabel: 'Trigger chegara (%)',
    thresholdMin: 50, thresholdMax: 95, thresholdStep: 5,
  },
  {
    key:   'gpaWeight' as const,
    label: 'GPA',
    desc:  'Past baho risk ulushi',
    icon:  GraduationCap,
    color: 'text-red-500',
    bg:    'bg-red-50 dark:bg-red-950/20',
    max:   50,
    thresholdKey: 'gpaThreshold' as const,
    thresholdLabel: 'Trigger chegara (5-ball)',
    thresholdMin: 1.5, thresholdMax: 4.0, thresholdStep: 0.5,
  },
  {
    key:   'gpaDropWeight' as const,
    label: 'GPA tushishi',
    desc:  'Baho pasayish trendining risk ulushi',
    icon:  TrendingDown,
    color: 'text-red-600',
    bg:    'bg-red-50 dark:bg-red-950/20',
    max:   30,
    thresholdKey: 'gpaDropThreshold' as const,
    thresholdLabel: 'Minimum tushish foizi (%)',
    thresholdMin: 5, thresholdMax: 30, thresholdStep: 5,
  },
  {
    key:   'paymentWeight' as const,
    label: "To'lov qarzdorligi",
    desc:  'Kechikkan to\'lov risk ulushi',
    icon:  CreditCard,
    color: 'text-amber-600',
    bg:    'bg-amber-50 dark:bg-amber-950/20',
    max:   50,
    thresholdKey: null,
    thresholdLabel: null,
    thresholdMin: 0, thresholdMax: 0, thresholdStep: 0,
  },
  {
    key:   'disciplineWeight' as const,
    label: 'Intizom',
    desc:  "Intizom hodisalarining risk ulushi",
    icon:  ShieldAlert,
    color: 'text-purple-500',
    bg:    'bg-purple-50 dark:bg-purple-950/20',
    max:   30,
    thresholdKey: 'disciplineThreshold' as const,
    thresholdLabel: 'Hodisalar soni (30 kun)',
    thresholdMin: 1, thresholdMax: 10, thresholdStep: 1,
  },
  {
    key:   'homeworkWeight' as const,
    label: 'Uy vazifasi',
    desc:  'Uy vazifasi bajarmaslikning risk ulushi',
    icon:  BookOpen,
    color: 'text-sky-500',
    bg:    'bg-sky-50 dark:bg-sky-950/20',
    max:   30,
    thresholdKey: 'homeworkThreshold' as const,
    thresholdLabel: 'Trigger chegara (%)',
    thresholdMin: 30, thresholdMax: 80, thresholdStep: 5,
  },
] as const;

// ── Signal slider ──────────────────────────────────────────────────────────
function SignalRow({
  signal, value, thresholdValue, defaultWeight, defaultThreshold,
  onWeightChange, onThresholdChange,
}: {
  signal: typeof SIGNALS[number];
  value: number;
  thresholdValue?: number;
  defaultWeight: number;
  defaultThreshold?: number;
  onWeightChange: (v: number) => void;
  onThresholdChange?: (v: number) => void;
}) {
  const Icon = signal.icon;
  const pct = Math.round((value / signal.max) * 100);
  const changed = value !== defaultWeight || (thresholdValue !== undefined && thresholdValue !== defaultThreshold);

  return (
    <div className={cn('rounded-xl p-4 border space-y-3', signal.bg, 'border-current/10')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', signal.color)} />
          <span className="text-sm font-semibold text-xedu-slate-700 dark:text-xedu-slate-200">{signal.label}</span>
          {changed && <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">o'zgartirildi</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-2xl font-black tabular-nums', signal.color)}>{value}</span>
          <span className="text-xs text-xedu-slate-400">/ {signal.max}</span>
        </div>
      </div>
      <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{signal.desc}</p>

      {/* Weight slider */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-xedu-slate-400">
          <span>Risk ulushi (max ball)</span>
          <span className="font-mono">{value} ball</span>
        </div>
        <Slider
          min={0} max={signal.max} step={1}
          value={[value]}
          onValueChange={([v]) => onWeightChange(v)}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-xedu-slate-300">
          <span>0</span><span>{signal.max}</span>
        </div>
      </div>

      {/* Threshold slider */}
      {signal.thresholdKey && thresholdValue !== undefined && onThresholdChange && signal.thresholdLabel && (
        <div className="space-y-1 pt-1 border-t border-current/10">
          <div className="flex justify-between text-[10px] text-xedu-slate-400">
            <span>{signal.thresholdLabel}</span>
            <span className="font-mono font-bold">{thresholdValue}{signal.thresholdKey === 'gpaThreshold' ? '/5' : '%'}</span>
          </div>
          <Slider
            min={signal.thresholdMin} max={signal.thresholdMax} step={signal.thresholdStep}
            value={[thresholdValue]}
            onValueChange={([v]) => onThresholdChange(v)}
            className="w-full"
          />
        </div>
      )}
    </div>
  );
}

// ── Live preview ───────────────────────────────────────────────────────────
function LivePreview({ cfg }: { cfg: RuleEngineConfig }) {
  const totalWeights = cfg.attendanceWeight + cfg.gpaWeight + cfg.gpaDropWeight +
                       cfg.paymentWeight + cfg.disciplineWeight + cfg.homeworkWeight;
  const overCap = totalWeights > 100;

  return (
    <div className="space-y-3 sticky top-4">
      <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-xedu-slate-400">Jonli ko'rinish</p>

        {/* Total weight warning */}
        <div className={cn(
          'rounded-lg p-2.5 text-xs flex items-start gap-2',
          overCap
            ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
        )}>
          {overCap ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
          <div>
            <p className="font-semibold">{overCap ? 'Signallar yig\'indisi > 100' : 'Signallar muvozanatli'}</p>
            <p className="mt-0.5">Jami: {totalWeights} / 100 (cap tufayli 100 ga kesadi)</p>
          </div>
        </div>

        {/* Weight distribution */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-xedu-slate-400 font-medium uppercase tracking-wider">Signal ulushlar</p>
          {SIGNALS.map(s => {
            const w = cfg[s.key] as number;
            const pct = Math.round((w / Math.max(totalWeights, 1)) * 100);
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className="text-[10px] text-xedu-slate-500 w-28 truncate">{s.label}</span>
                <div className="flex-1 h-1.5 bg-xedu-slate-100 dark:bg-xedu-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', s.color.replace('text-', 'bg-'))}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-xedu-slate-400 w-8 text-right">{w}pt</span>
              </div>
            );
          })}
        </div>

        {/* Risk level thresholds */}
        <div className="space-y-1.5 pt-2 border-t border-xedu-slate-100 dark:border-xedu-slate-800">
          <p className="text-[10px] text-xedu-slate-400 font-medium uppercase tracking-wider">Risk darajalari</p>
          {[
            { label: 'CRITICAL', val: cfg.criticalThreshold, color: 'text-red-600', bg: 'bg-red-500' },
            { label: 'HIGH',     val: cfg.highThreshold,     color: 'text-orange-600', bg: 'bg-orange-500' },
            { label: 'MEDIUM',   val: cfg.mediumThreshold,   color: 'text-amber-600', bg: 'bg-amber-500' },
          ].map(({ label, val, color, bg }) => (
            <div key={label} className="flex items-center gap-2 text-xs">
              <span className={cn('w-16 font-bold text-[10px]', color)}>{label}</span>
              <div className="flex-1 h-1.5 bg-xedu-slate-100 dark:bg-xedu-slate-800 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full', bg)} style={{ width: `${val}%` }} />
              </div>
              <span className="text-[10px] font-mono text-xedu-slate-400 w-8 text-right">{val}+</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scenario examples */}
      <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 p-4 space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-xedu-slate-400">Misol stsenariylar</p>
        {[
          { label: 'Davomat 55% + 3 oy qarzdorlik', att: 55, pay: 3, disc: 0, gpa: 3.5, hw: 70 },
          { label: 'GPA 2.5/5 + GPA 20% tushish',   att: 85, pay: 0, disc: 0, gpa: 2.5, hw: 70 },
          { label: "Hammasi yaxshi o'quvchi",        att: 95, pay: 0, disc: 0, gpa: 4.2, hw: 90 },
        ].map(sc => {
          const attScore = sc.att < cfg.attendanceThreshold
            ? Math.min(cfg.attendanceWeight, Math.round((cfg.attendanceThreshold - sc.att) / cfg.attendanceThreshold * cfg.attendanceWeight))
            : 0;
          const payScore = Math.min(cfg.paymentWeight, sc.pay * Math.round(cfg.paymentWeight / 2));
          const gpaScore = sc.gpa < cfg.gpaThreshold
            ? Math.min(cfg.gpaWeight, Math.round((cfg.gpaThreshold - sc.gpa) / cfg.gpaThreshold * cfg.gpaWeight))
            : 0;
          const total = Math.min(100, attScore + payScore + gpaScore);
          const level = total >= cfg.criticalThreshold ? 'CRITICAL' : total >= cfg.highThreshold ? 'HIGH' : total >= cfg.mediumThreshold ? 'MEDIUM' : 'LOW';
          const lvlColor = level === 'CRITICAL' ? 'text-red-600' : level === 'HIGH' ? 'text-orange-600' : level === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600';
          return (
            <div key={sc.label} className="flex items-center justify-between text-xs">
              <span className="text-xedu-slate-500 dark:text-xedu-slate-400 truncate flex-1 mr-2">{sc.label}</span>
              <span className={cn('font-bold tabular-nums shrink-0', lvlColor)}>{total} ({level})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CalibrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = ['director', 'branch_admin', 'super_admin'].includes(user?.role ?? '');

  const { data: savedCfg, isLoading } = useQuery({
    queryKey: ['risk-config'],
    queryFn:  aiAnalyticsApi.getConfig,
    staleTime: 60_000,
  });

  const [cfg, setCfg] = useState<RuleEngineConfig>(DEFAULT_RULE_CONFIG);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (savedCfg) { setCfg({ ...DEFAULT_RULE_CONFIG, ...savedCfg }); setDirty(false); }
  }, [savedCfg]);

  const updateMut = useMutation({
    mutationFn: (c: Partial<RuleEngineConfig>) => aiAnalyticsApi.updateConfig(c),
    onSuccess: (updated) => {
      setCfg({ ...DEFAULT_RULE_CONFIG, ...updated });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['risk-config'] });
      qc.invalidateQueries({ queryKey: ['insights'] });
      toast({ title: "Konfiguratsiya saqlandi", description: "Yangi sozlamalar darhol kuchga kiradi" });
    },
    onError: () => toast({ variant: 'destructive', title: 'Saqlashda xato' }),
  });

  const update = (key: keyof RuleEngineConfig, val: number) => {
    setCfg(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const resetToDefault = () => {
    setCfg({ ...DEFAULT_RULE_CONFIG });
    setDirty(true);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="h-6 w-6 animate-spin text-xedu-slate-400" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/dashboard/insights')}
            className="flex items-center gap-1.5 text-sm text-xedu-slate-500 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Insights
          </button>
          <span className="text-xedu-slate-300 dark:text-xedu-slate-700">/</span>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-indigo-500" />
            <h1 className="text-xl font-bold tracking-tight">Kalibrasiya paneli</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              Saqlanmagan o'zgarishlar
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={resetToDefault} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Default
          </Button>
          {canEdit && (
            <Button
              size="sm"
              disabled={!dirty || updateMut.isPending}
              onClick={() => updateMut.mutate(cfg)}
              className="gap-1.5"
            >
              {updateMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Saqlash
            </Button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 p-4">
        <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-700 dark:text-indigo-300">
          <p className="font-medium mb-0.5">Maktab siyosatiga mos sozlash</p>
          <p className="text-xs opacity-90">
            Har bir maktabda "xavf" tushunchasi boshqa. Moliya muhim maktabda to'lov og'irligi, akademik maktabda GPA og'irligi kattaroq bo'lishi mumkin.
            O'zgarishlar darhol barcha o'quvchilar uchun kuchga kiradi.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Signals (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-xedu-slate-700 dark:text-xedu-slate-200 mb-1">Signal og'irliklari</h2>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Har bir signal maksimal necha ball qo'sha olishi</p>
          </div>

          {SIGNALS.map(signal => (
            <SignalRow
              key={signal.key}
              signal={signal}
              value={cfg[signal.key] as number}
              thresholdValue={signal.thresholdKey ? (cfg[signal.thresholdKey] as number) : undefined}
              defaultWeight={DEFAULT_RULE_CONFIG[signal.key] as number}
              defaultThreshold={signal.thresholdKey ? (DEFAULT_RULE_CONFIG[signal.thresholdKey] as number) : undefined}
              onWeightChange={v => update(signal.key, v)}
              onThresholdChange={signal.thresholdKey ? (v => update(signal.thresholdKey!, v)) : undefined}
            />
          ))}

          {/* Risk level thresholds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                Risk darajasi chegaralari
              </CardTitle>
              <CardDescription className="text-xs">
                Qaysi umumiy ball qaysi risk darajasiga kiradi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'criticalThreshold' as const, label: 'CRITICAL', color: 'text-red-600',    barColor: 'bg-red-500' },
                { key: 'highThreshold'     as const, label: 'HIGH',     color: 'text-orange-600', barColor: 'bg-orange-500' },
                { key: 'mediumThreshold'   as const, label: 'MEDIUM',   color: 'text-amber-600',  barColor: 'bg-amber-500' },
              ].map(({ key, label, color, barColor }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('font-bold', color)}>{label}</span>
                    <span className="font-mono font-bold">{cfg[key]}+ ball</span>
                  </div>
                  <Slider
                    min={10} max={90} step={5}
                    value={[cfg[key]]}
                    onValueChange={([v]) => update(key, v)}
                    className="w-full"
                    disabled={!canEdit}
                  />
                  <div className="flex justify-between text-[10px] text-xedu-slate-300">
                    <span>10</span><span>90</span>
                  </div>
                </div>
              ))}
              <div className="rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-900/40 p-3 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                <p className="font-medium mb-1">Hozirgi: {cfg.mediumThreshold}–{cfg.highThreshold-1} = MEDIUM · {cfg.highThreshold}–{cfg.criticalThreshold-1} = HIGH · {cfg.criticalThreshold}+ = CRITICAL</p>
                <p>Tavsiya: CRITICAL ehtiyotkorlik bilan pastlatmang — direktor har CRITICAL alertga reaktsiya qilishi kerak.</p>
              </div>

              {/* minGpaSample */}
              <div className="pt-2 border-t border-xedu-slate-100 dark:border-xedu-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-xedu-slate-600 dark:text-xedu-slate-300">GPA tahlili uchun minimum baho soni</span>
                  <span className="font-mono font-bold">{cfg.minGpaSample} ta</span>
                </div>
                <Slider
                  min={2} max={10} step={1}
                  value={[cfg.minGpaSample]}
                  onValueChange={([v]) => update('minGpaSample', v)}
                  disabled={!canEdit}
                />
                <p className="text-[10px] text-xedu-slate-400">
                  Kam soni = ko'p false positive. Ko'p soni = sust reaktsiya.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview (1/3 width) */}
        <div>
          <h2 className="text-sm font-bold text-xedu-slate-700 dark:text-xedu-slate-200 mb-3">Jonli ko'rinish</h2>
          <LivePreview cfg={cfg} />
        </div>
      </div>
    </div>
  );
}
