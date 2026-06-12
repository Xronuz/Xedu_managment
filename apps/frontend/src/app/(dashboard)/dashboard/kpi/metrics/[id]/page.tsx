'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Zap, PencilLine, Trash2, Plus, Loader2, Target,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip,
  ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/store/confirm.store';
import { useAuthStore } from '@/store/auth.store';
import { kpiApi, type KpiMetric, type KpiRecord } from '@/lib/api/kpi';
import { usersApi } from '@/lib/api/users';
import { cn } from '@/lib/utils';

const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

const CATEGORY_LABELS: Record<string, string> = {
  STRATEGY: 'Strategiya', ACADEMIC: 'Akademik', TEACHER: "O'qituvchi",
  STUDENT: "O'quvchi", MARKETING: 'Marketing', FINANCE: 'Moliya',
  OPERATIONS: 'Operatsiya', AI_IT: 'AI & IT', BRANDING: 'Brending', MONITORING: 'Monitoring',
};

// Mas'ul sifatida KPI sahifasiga kira oladigan rollar tanlanadi
const OWNER_ROLES = new Set(['director', 'vice_principal', 'branch_admin']);

function periodLabel(iso: string) {
  const d = new Date(iso);
  return `${UZ_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Oxirgi 12 oy ro'yxati — qiymat kiritish dialogi uchun (eng yangi birinchi) */
function lastMonths(count = 12) {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59, 999));
    return {
      value: start.toISOString(),
      end: end.toISOString(),
      label: `${UZ_MONTHS[start.getUTCMonth()]} ${start.getUTCFullYear()}`,
    };
  });
}

export default function KpiMetricDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const canManage = ['vice_principal', 'super_admin'].includes(user?.role ?? '');

  const { data: metric, isLoading } = useQuery({
    queryKey: ['kpi', 'metric', id],
    queryFn: () => kpiApi.getMetric(id),
    enabled: !!id,
  });

  const records: KpiRecord[] = (metric as any)?.records ?? [];
  const isSystem = metric?.sourceType === 'SYSTEM';
  const lowerIsBetter = metric?.direction === 'LOWER_IS_BETTER';

  // Grafik uchun: eskidan yangiga
  const chartData = useMemo(
    () =>
      records
        .slice()
        .reverse()
        .map((r) => ({
          label: periodLabel(r.periodStart),
          qiymat: r.actualValue,
        })),
    [records],
  );

  /* ── Qiymat kiritish dialogi ── */
  const months = useMemo(() => lastMonths(12), []);
  const [valueOpen, setValueOpen] = useState(false);
  const [periodStart, setPeriodStart] = useState(months[1]?.value ?? months[0].value); // default: o'tgan oy
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');

  const recordMutation = useMutation({
    mutationFn: () => {
      const m = months.find((x) => x.value === periodStart)!;
      return kpiApi.createRecord({
        metricId: id,
        actualValue: Number(value),
        periodStart: m.value,
        periodEnd: m.end,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi'] });
      setValueOpen(false);
      setValue('');
      setNotes('');
      toast({ title: 'Qiymat saqlandi' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  /* ── Tahrirlash dialogi ── */
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{ name: string; description: string; targetValue: string; ownerId: string; isActive: boolean }>({
    name: '', description: '', targetValue: '', ownerId: '', isActive: true,
  });

  const openEdit = () => {
    if (!metric) return;
    setEditForm({
      name: metric.name,
      description: metric.description ?? '',
      targetValue: String(metric.targetValue),
      ownerId: metric.ownerId ?? '',
      isActive: metric.isActive,
    });
    setEditOpen(true);
  };

  const { data: staffData } = useQuery({
    queryKey: ['kpi', 'staff-options'],
    queryFn: () => usersApi.getAll({ limit: 200 }),
    enabled: canManage && editOpen,
  });
  const staffList = ((staffData as any)?.data ?? [])
    .filter((u: any) => OWNER_ROLES.has(u.role));

  const editMutation = useMutation({
    mutationFn: () =>
      kpiApi.updateMetric(id, {
        name: editForm.name,
        description: editForm.description || undefined,
        targetValue: Number(editForm.targetValue),
        ownerId: editForm.ownerId || null,
        isActive: editForm.isActive,
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi'] });
      setEditOpen(false);
      toast({ title: 'Metrika yangilandi' });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  /* ── O'chirish ── */
  const deleteMutation = useMutation({
    mutationFn: () => kpiApi.deleteMetric(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi'] });
      toast({ title: 'Metrika o‘chirildi' });
      router.push('/dashboard/kpi');
    },
    onError: () => toast({ variant: 'destructive', title: 'Xato', description: 'O‘chirishda xatolik' }),
  });

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Metrikani o‘chirish',
      description: `"${metric?.name}" va uning barcha tarix yozuvlari (${records.length} ta) qaytarib bo'lmas tarzda o'chiriladi.`,
      confirmText: "O'chirish",
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate();
  };

  if (isLoading || !metric) {
    return (
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-1">
            <Link href="/dashboard/kpi">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              KPI Dashboard
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{metric.name}</h1>
            {isSystem && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-xedu-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-xedu-violet-600">
                <Zap className="h-2.5 w-2.5" /> AUTO
              </span>
            )}
            {!metric.isActive && <Badge variant="outline">Noaktiv</Badge>}
          </div>
          {metric.description && (
            <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400 mt-1">{metric.description}</p>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            {!isSystem && (
              <Button onClick={() => setValueOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Qiymat kiritish
              </Button>
            )}
            <Button variant="outline" onClick={openEdit}>
              <PencilLine className="h-4 w-4 mr-2" />
              Tahrirlash
            </Button>
            <Button variant="outline" size="icon" onClick={handleDelete} aria-label="O'chirish">
              <Trash2 className="h-4 w-4 text-xedu-ruby-600" />
            </Button>
          </div>
        )}
      </div>

      {/* Meta */}
      <Card>
        <CardContent className="pt-4 pb-4 grid gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5 text-sm">
          <div>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Kategoriya</p>
            <p className="font-medium mt-0.5">{CATEGORY_LABELS[metric.category] ?? metric.category}</p>
          </div>
          <div>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Maqsad</p>
            <p className="font-medium mt-0.5">
              {lowerIsBetter ? '≤ ' : ''}{metric.targetValue.toLocaleString()}{metric.unit}
              <span className="ml-1 text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                ({lowerIsBetter ? 'kam = yaxshi' : "ko'p = yaxshi"})
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Mas&apos;ul</p>
            <p className="font-medium mt-0.5">
              {metric.owner ? `${metric.owner.firstName} ${metric.owner.lastName}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Qamrov</p>
            <p className="font-medium mt-0.5">{metric.branch?.name ?? 'Butun maktab'}</p>
          </div>
          <div>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Yozuvlar</p>
            <p className="font-medium mt-0.5">{records.length} ta davr</p>
          </div>
        </CardContent>
      </Card>

      {/* Trend chart */}
      {chartData.length >= 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-xedu-primary" />
              Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--xedu-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--xedu-text-muted)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--xedu-text-muted)" width={48} />
                  <ChartTooltip
                    formatter={(v: any) => [`${Number(v).toLocaleString()}${metric.unit}`, 'Qiymat']}
                    contentStyle={{
                      background: 'var(--xedu-bg-floating)',
                      border: '1px solid var(--xedu-border-strong)',
                      borderRadius: 10,
                      color: 'var(--xedu-text)',
                    }}
                  />
                  {metric.targetValue > 0 && (
                    <ReferenceLine
                      y={metric.targetValue}
                      stroke="var(--xedu-primary)"
                      strokeDasharray="6 4"
                      label={{ value: 'Maqsad', fontSize: 10, fill: 'var(--xedu-primary)', position: 'insideTopRight' }}
                    />
                  )}
                  <Line type="monotone" dataKey="qiymat" stroke="var(--xedu-primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tarix</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="py-8 text-center text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
              {isSystem
                ? "Hali snapshot olinmagan — keyingi oy boshida avtomatik hisoblanadi yoki KPI dashboarddan qo'lda snapshot oling."
                : 'Hali qiymat kiritilmagan.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left pb-2">Davr</th>
                  <th className="text-right pb-2 px-3">Qiymat</th>
                  <th className="text-left pb-2 px-3">Izoh</th>
                  <th className="text-left pb-2 px-3">Manba</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const meets = lowerIsBetter
                    ? r.actualValue <= metric.targetValue
                    : metric.targetValue > 0 && r.actualValue >= metric.targetValue;
                  return (
                    <tr key={r.id} className="border-t border-xedu-border">
                      <td className="py-2.5 font-medium whitespace-nowrap">{periodLabel(r.periodStart)}</td>
                      <td className={cn(
                        'py-2.5 px-3 text-right tabular-nums whitespace-nowrap font-semibold',
                        metric.targetValue > 0 && (meets ? 'text-xedu-primary' : 'text-xedu-ruby-600'),
                      )}>
                        {r.actualValue.toLocaleString()}{metric.unit}
                      </td>
                      <td className="py-2.5 px-3 text-xedu-slate-500 dark:text-xedu-slate-400 max-w-[260px] truncate">
                        {r.notes ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-xedu-slate-500 dark:text-xedu-slate-400">
                        {r.isAuto
                          ? <span className="inline-flex items-center gap-0.5 text-xedu-violet-600 font-medium"><Zap className="h-3 w-3" /> Avto</span>
                          : r.createdBy ? `${r.createdBy.firstName} ${r.createdBy.lastName}` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Qiymat kiritish dialogi ── */}
      <Dialog open={valueOpen} onOpenChange={setValueOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Qiymat kiritish</DialogTitle>
            <DialogDescription>
              Tanlangan davr uchun qiymat allaqachon bo&apos;lsa, yangisi bilan almashtiriladi (tuzatish).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Davr</Label>
              <Select value={periodStart} onValueChange={setPeriodStart}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recValue">Qiymat ({metric.unit})</Label>
              <Input
                id="recValue"
                type="number"
                step="any"
                min={0}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={String(metric.targetValue)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recNotes">Izoh</Label>
              <Input
                id="recNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Masalan: so'rovnoma natijasi (ixtiyoriy)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValueOpen(false)}>Bekor qilish</Button>
            <Button disabled={value === '' || recordMutation.isPending} onClick={() => recordMutation.mutate()}>
              {recordMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tahrirlash dialogi ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Metrikani tahrirlash</DialogTitle>
            {isSystem && (
              <DialogDescription>
                Tizim metrikasida hisoblash manbasi, birligi va yo&apos;nalishi o&apos;zgarmaydi.
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="editName">Nomi</Label>
              <Input
                id="editName"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editDesc">Tavsif</Label>
              <Input
                id="editDesc"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="editTarget">Maqsad qiymat ({metric.unit})</Label>
              <Input
                id="editTarget"
                type="number"
                step="any"
                min={0}
                value={editForm.targetValue}
                onChange={(e) => setEditForm((f) => ({ ...f, targetValue: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Mas&apos;ul xodim</Label>
              <Select
                value={editForm.ownerId || 'none'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, ownerId: v === 'none' ? '' : v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Mas&apos;ul yo&apos;q —</SelectItem>
                  {staffList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm">Aktiv holat</Label>
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Noaktiv metrika snapshot va eslatmalardan chiqariladi</p>
              </div>
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Bekor qilish</Button>
            <Button
              disabled={editForm.name.trim().length < 2 || editMutation.isPending}
              onClick={() => editMutation.mutate()}
            >
              {editMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
