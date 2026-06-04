'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal, RotateCcw, Save, ArrowLeft, Loader2, Info,
  AlertTriangle, CheckCircle2, BookOpen, Calendar, CreditCard,
  GraduationCap, ShieldAlert, TrendingDown, Activity, History,
  Eye, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { aiAnalyticsApi, type RuleEngineConfig, DEFAULT_RULE_CONFIG } from '@/lib/api/ai-analytics';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/store/confirm.store';

// ── Signal meta ────────────────────────────────────────────────────────────
const SIGNALS = [
  { key: 'attendanceWeight' as const, label: 'Davomat', icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', max: 50, thresholdKey: 'attendanceThreshold' as const, thresholdLabel: 'Trigger chegara (%)', thresholdMin: 50, thresholdMax: 95, thresholdStep: 5 },
  { key: 'gpaWeight' as const, label: 'GPA', icon: GraduationCap, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20', max: 50, thresholdKey: 'gpaThreshold' as const, thresholdLabel: 'Trigger chegara (5-ball)', thresholdMin: 1.5, thresholdMax: 4.0, thresholdStep: 0.5 },
  { key: 'gpaDropWeight' as const, label: 'GPA tushishi', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/20', max: 30, thresholdKey: 'gpaDropThreshold' as const, thresholdLabel: 'Minimum tushish (%)', thresholdMin: 5, thresholdMax: 30, thresholdStep: 5 },
  { key: 'paymentWeight' as const, label: "To'lov qarzdorligi", icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20', max: 50, thresholdKey: null, thresholdLabel: null, thresholdMin: 0, thresholdMax: 0, thresholdStep: 0 },
  { key: 'disciplineWeight' as const, label: 'Intizom', icon: ShieldAlert, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', max: 30, thresholdKey: 'disciplineThreshold' as const, thresholdLabel: 'Hodisalar soni (30 kun)', thresholdMin: 1, thresholdMax: 10, thresholdStep: 1 },
  { key: 'homeworkWeight' as const, label: 'Uy vazifasi', icon: BookOpen, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-950/20', max: 30, thresholdKey: 'homeworkThreshold' as const, thresholdLabel: 'Trigger chegara (%)', thresholdMin: 30, thresholdMax: 80, thresholdStep: 5 },
] as const;

// ── Guard 1: Validate thresholds ──────────────────────────────────────────
function validateConfig(cfg: RuleEngineConfig): string | null {
  if (cfg.criticalThreshold <= cfg.highThreshold)
    return `CRITICAL (${cfg.criticalThreshold}) > HIGH (${cfg.highThreshold}) bo'lishi shart`;
  if (cfg.highThreshold <= cfg.mediumThreshold)
    return `HIGH (${cfg.highThreshold}) > MEDIUM (${cfg.mediumThreshold}) bo'lishi shart`;
  if (cfg.mediumThreshold < 5)
    return `MEDIUM chegara kamida 5 bo'lishi kerak`;
  return null;
}

// ── Signal Row ─────────────────────────────────────────────────────────────
function SignalRow({ signal, value, thresholdValue, defaultWeight, defaultThreshold, onWeightChange, onThresholdChange, disabled }: {
  signal: typeof SIGNALS[number]; value: number; thresholdValue?: number;
  defaultWeight: number; defaultThreshold?: number;
  onWeightChange: (v: number) => void; onThresholdChange?: (v: number) => void;
  disabled?: boolean;
}) {
  const Icon = signal.icon;
  const changed = value !== defaultWeight || (thresholdValue !== undefined && thresholdValue !== defaultThreshold);
  return (
    <div className={cn('rounded-xl p-4 border space-y-3', signal.bg, 'border-current/10')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', signal.color)} />
          <span className="text-sm font-semibold">{signal.label}</span>
          {changed && <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-bold">o'zgartirildi</span>}
        </div>
        <span className={cn('text-2xl font-black tabular-nums', signal.color)}>{value}<span className="text-xs text-xedu-slate-400 ml-1">/ {signal.max}</span></span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-xedu-slate-400"><span>Risk ulushi (max ball)</span><span className="font-mono">{value} ball</span></div>
        <Slider min={0} max={signal.max} step={1} value={[value]} onValueChange={([v]) => onWeightChange(v)} disabled={disabled} />
      </div>
      {signal.thresholdKey && thresholdValue !== undefined && onThresholdChange && signal.thresholdLabel && (
        <div className="space-y-1 pt-1 border-t border-current/10">
          <div className="flex justify-between text-[10px] text-xedu-slate-400">
            <span>{signal.thresholdLabel}</span>
            <span className="font-mono font-bold">{thresholdValue}{signal.thresholdKey === 'gpaThreshold' ? '/5' : '%'}</span>
          </div>
          <Slider min={signal.thresholdMin} max={signal.thresholdMax} step={signal.thresholdStep} value={[thresholdValue]} onValueChange={([v]) => onThresholdChange(v)} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

// ── Guard 4: Preview Panel ─────────────────────────────────────────────────
function PreviewPanel({ cfg, savedCfg }: { cfg: RuleEngineConfig; savedCfg?: RuleEngineConfig }) {
  const [preview, setPreview] = useState<{ distribution: Record<string, number>; totalStudents: number; sampleSize: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const runPreview = async () => {
    setLoading(true);
    try {
      const result = await aiAnalyticsApi.previewConfig(cfg);
      setPreview(result);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const totalWeights = cfg.attendanceWeight + cfg.gpaWeight + cfg.gpaDropWeight + cfg.paymentWeight + cfg.disciplineWeight + cfg.homeworkWeight;
  const overCap = totalWeights > 100;
  const validErr = validateConfig(cfg);

  return (
    <div className="space-y-3 sticky top-4">
      {/* Weight balance */}
      <div className={cn('rounded-xl p-3.5 border text-xs flex items-start gap-2',
        overCap || validErr ? 'bg-red-50 dark:bg-red-950/20 border-red-200 text-red-700 dark:text-red-400' :
        'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-700 dark:text-emerald-400'
      )}>
        {overCap || validErr ? <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" /> : <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />}
        <div>
          {validErr ? (
            <><p className="font-bold">Validation xatosi</p><p className="mt-0.5">{validErr}</p></>
          ) : overCap ? (
            <><p className="font-bold">Signallar yig'indisi {'>'} 100</p><p className="mt-0.5">Jami {totalWeights} (cap tufayli 100 ga kesadi)</p></>
          ) : (
            <><p className="font-bold">Muvozanatli</p><p className="mt-0.5">Jami: {totalWeights} / 100</p></>
          )}
        </div>
      </div>

      {/* Guard 4: Preview button + results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4 text-indigo-500" />
            Saqlashdan oldin preview
          </CardTitle>
          <CardDescription className="text-xs">Bu config bilan qancha o'quvchi qaysi darajada chiqishini ko'ring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={runPreview} disabled={loading || !!validErr}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {loading ? 'Hisoblanmoqda...' : 'Preview hisoblash'}
          </Button>
          {preview && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-xedu-slate-400 font-medium uppercase tracking-wider">
                {preview.sampleSize} ta o'quvchi namunasi ({preview.totalStudents} ta jami)
              </p>
              {[
                { key: 'critical', label: 'CRITICAL', color: 'text-red-600', bar: 'bg-red-500' },
                { key: 'high',     label: 'HIGH',     color: 'text-orange-600', bar: 'bg-orange-500' },
                { key: 'medium',   label: 'MEDIUM',   color: 'text-amber-600', bar: 'bg-amber-500' },
                { key: 'low',      label: 'LOW',      color: 'text-emerald-600', bar: 'bg-emerald-500' },
              ].map(({ key, label, color, bar }) => {
                const count = preview.distribution[key] ?? 0;
                const pct   = Math.round((count / preview.sampleSize) * 100);
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className={cn('text-[10px] font-bold w-16', color)}>{label}</span>
                    <div className="flex-1 h-1.5 bg-xedu-slate-100 dark:bg-xedu-slate-800 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full', bar)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={cn('text-[10px] font-mono font-bold w-10 text-right', color)}>{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weight distribution */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-xedu-slate-400">Signal taqsimoti</p>
          {SIGNALS.map(s => {
            const w = cfg[s.key] as number;
            const pct = Math.round((w / Math.max(totalWeights, 1)) * 100);
            return (
              <div key={s.key} className="flex items-center gap-2">
                <span className="text-[10px] text-xedu-slate-500 w-24 truncate">{s.label}</span>
                <div className="flex-1 h-1.5 bg-xedu-slate-100 dark:bg-xedu-slate-800 rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', s.color.replace('text-', 'bg-'))} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] font-mono text-xedu-slate-400 w-8 text-right">{w}pt</span>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Guard 2: Audit Log ─────────────────────────────────────────────────────
function AuditLog() {
  const [open, setOpen] = useState(false);
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['risk-config-audit'],
    queryFn: aiAnalyticsApi.getConfigAuditLog,
    enabled: open,
    staleTime: 30_000,
  });

  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => { setOpen(v => !v); if (!open) refetch(); }}
        className="w-full flex items-center justify-between px-4 py-3 bg-xedu-slate-50 dark:bg-xedu-slate-900/40 hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-xedu-slate-500" />
          <span className="text-sm font-medium">Audit log — kim, qachon, nima o'zgartirdi</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-xedu-slate-400" /> : <ChevronDown className="h-4 w-4 text-xedu-slate-400" />}
      </button>

      {open && (
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-xedu-slate-400" /></div>
          ) : logs.length === 0 ? (
            <p className="text-center text-sm text-xedu-slate-500 py-4">Hali o'zgarishlar qayd etilmagan</p>
          ) : (
            logs.map((entry, i) => {
              const ts = new Date(entry.timestamp);
              const changes: string[] = [];
              if (entry.action === 'reset_to_default') {
                changes.push('Default sozlamalarga qaytarildi');
              } else {
                const keys = Object.keys(entry.newConfig) as (keyof RuleEngineConfig)[];
                for (const k of keys) {
                  if (entry.oldConfig[k] !== entry.newConfig[k]) {
                    changes.push(`${k}: ${entry.oldConfig[k]} → ${entry.newConfig[k]}`);
                  }
                }
              }
              return (
                <div key={i} className={cn('rounded-lg p-3 border text-xs', entry.action === 'reset_to_default' ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' : 'bg-xedu-slate-50 dark:bg-xedu-slate-900/40')}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold">{entry.userName || entry.userId}</span>
                    <span className="text-xedu-slate-400">
                      {ts.toLocaleDateString('uz-UZ')} {ts.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {changes.slice(0, 5).map((c, j) => <p key={j} className="text-xedu-slate-600 dark:text-xedu-slate-400">{c}</p>)}
                    {changes.length > 5 && <p className="text-xedu-slate-400">+{changes.length - 5} ta boshqa o'zgarish</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function CalibrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const ask = useConfirm();
  const { user } = useAuthStore();
  const canEdit = ['director', 'branch_admin', 'super_admin'].includes(user?.role ?? '');

  const { data: savedCfg, isLoading } = useQuery({
    queryKey: ['risk-config'],
    queryFn: aiAnalyticsApi.getConfig,
    staleTime: 60_000,
  });

  const [cfg, setCfg] = useState<RuleEngineConfig>(DEFAULT_RULE_CONFIG);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (savedCfg) { setCfg({ ...DEFAULT_RULE_CONFIG, ...savedCfg }); setDirty(false); }
  }, [savedCfg]);

  const update = useCallback((key: keyof RuleEngineConfig, val: number) => {
    setCfg(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  }, []);

  const saveMut = useMutation({
    mutationFn: (c: Partial<RuleEngineConfig>) => aiAnalyticsApi.updateConfig(c),
    onSuccess: (updated) => {
      setCfg({ ...DEFAULT_RULE_CONFIG, ...updated });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['risk-config'] });
      qc.invalidateQueries({ queryKey: ['risk-config-audit'] });
      qc.invalidateQueries({ queryKey: ['insights'] });
      toast({ title: "Saqlandi", description: "Yangi sozlamalar darhol kuchga kirdi" });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Saqlashda xato';
      toast({ variant: 'destructive', title: 'Xato', description: msg });
    },
  });

  const resetMut = useMutation({
    mutationFn: aiAnalyticsApi.resetConfig,
    onSuccess: (updated) => {
      setCfg({ ...DEFAULT_RULE_CONFIG, ...updated });
      setDirty(false);
      qc.invalidateQueries({ queryKey: ['risk-config'] });
      qc.invalidateQueries({ queryKey: ['risk-config-audit'] });
      qc.invalidateQueries({ queryKey: ['insights'] });
      toast({ title: "Default sozlamalarga qaytarildi" });
    },
  });

  // Guard 1: client-side validation before save
  const validErr = validateConfig(cfg);

  const handleSave = () => {
    if (validErr) { toast({ variant: 'destructive', title: 'Validation xatosi', description: validErr }); return; }
    saveMut.mutate(cfg);
  };

  // Guard 3: Reset with confirm
  const handleReset = async () => {
    const confirmed = await ask({
      title: "Default sozlamalarga qaytarish",
      description: "Barcha o'zgarishlar bekor qilinadi va default qiymatlar tiklanadi. Bu harakat audit log'ga yoziladi.",
      variant: 'destructive',
      confirmText: "Qaytarish",
    });
    if (confirmed) resetMut.mutate();
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-xedu-slate-400" /></div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/insights')} className="flex items-center gap-1.5 text-sm text-xedu-slate-500 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-300 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Insights
          </button>
          <span className="text-xedu-slate-300 dark:text-xedu-slate-700">/</span>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-indigo-500" />
            <h1 className="text-xl font-bold tracking-tight">Kalibrasiya paneli</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {validErr && (
            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-950/20 gap-1">
              <AlertTriangle className="h-3 w-3" /> {validErr}
            </Badge>
          )}
          {dirty && !validErr && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/20">
              Saqlanmagan o'zgarishlar
            </Badge>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={resetMut.isPending} className="gap-1.5">
              {resetMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Default
            </Button>
          )}
          {canEdit && (
            <Button size="sm" disabled={!dirty || !!validErr || saveMut.isPending} onClick={handleSave} className="gap-1.5">
              {saveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Saqlash
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 p-4">
        <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-700 dark:text-indigo-300">
          <p className="font-medium mb-0.5">Policy-driven risk engine</p>
          <p className="text-xs opacity-90">Har bir maktab risk siyosatini o'z ehtiyojiga mos sozlaydi. Barcha o'zgarishlar audit log'ga yoziladi. Saqlashdan oldin preview orqali ta'sirini ko'ring.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Signals (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-xedu-slate-700 dark:text-xedu-slate-200 mb-1">Signal og'irliklari va chegaralar</h2>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Har signal max necha ball qo'sha olishi va trigger chegara</p>
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
              onThresholdChange={signal.thresholdKey ? v => update(signal.thresholdKey!, v) : undefined}
              disabled={!canEdit}
            />
          ))}

          {/* Risk level thresholds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" />Risk darajasi chegaralari</CardTitle>
              <CardDescription className="text-xs">critical {'>'} high {'>'} medium majburiy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'criticalThreshold' as const, label: 'CRITICAL', color: 'text-red-600', bar: 'bg-red-500' },
                { key: 'highThreshold'     as const, label: 'HIGH',     color: 'text-orange-600', bar: 'bg-orange-500' },
                { key: 'mediumThreshold'   as const, label: 'MEDIUM',   color: 'text-amber-600', bar: 'bg-amber-500' },
              ].map(({ key, label, color }) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('font-bold', color)}>{label}</span>
                    <span className="font-mono font-bold">{cfg[key]}+ ball</span>
                  </div>
                  <Slider min={10} max={90} step={5} value={[cfg[key]]} onValueChange={([v]) => update(key, v)} disabled={!canEdit} />
                </div>
              ))}
              {validErr && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 rounded-lg p-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0" />{validErr}
                </div>
              )}
              <div className="space-y-1 pt-2 border-t">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">GPA minimum namuna soni</span>
                  <span className="font-mono font-bold">{cfg.minGpaSample} ta</span>
                </div>
                <Slider min={2} max={10} step={1} value={[cfg.minGpaSample]} onValueChange={([v]) => update('minGpaSample', v)} disabled={!canEdit} />
                <p className="text-[10px] text-xedu-slate-400">Kam = ko'p false positive. Ko'p = sust reaktsiya.</p>
              </div>
            </CardContent>
          </Card>

          {/* Guard 2: Audit Log */}
          <AuditLog />
        </div>

        {/* Preview sidebar (1/3) */}
        <div>
          <h2 className="text-sm font-bold text-xedu-slate-700 dark:text-xedu-slate-200 mb-3">Preview va muvozanat</h2>
          <PreviewPanel cfg={cfg} savedCfg={savedCfg} />
        </div>
      </div>
    </div>
  );
}
