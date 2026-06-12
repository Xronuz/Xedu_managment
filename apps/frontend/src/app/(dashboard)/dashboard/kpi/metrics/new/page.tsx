'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Target, Plus, Loader2, Zap, PencilLine, Check } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { kpiApi, type KpiCatalogItem } from '@/lib/api/kpi';
import { branchesApi } from '@/lib/api/branches';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

// Mas'ul sifatida faqat KPI sahifasiga kira oladigan rollar tanlanadi —
// aks holda eslatma olgan xodim qiymatni kirita olmaydi
const OWNER_ROLES = new Set(['director', 'vice_principal', 'branch_admin']);

const CATEGORY_OPTIONS = [
  { value: 'STRATEGY', label: 'Strategiya' },
  { value: 'ACADEMIC', label: 'Akademik' },
  { value: 'TEACHER', label: "O'qituvchi" },
  { value: 'STUDENT', label: "O'quvchi" },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'FINANCE', label: 'Moliya' },
  { value: 'OPERATIONS', label: 'Operatsiya' },
  { value: 'AI_IT', label: 'AI & IT' },
  { value: 'BRANDING', label: 'Brending' },
  { value: 'MONITORING', label: 'Monitoring' },
];

const PERIOD_OPTIONS = [
  { value: 'WEEKLY', label: 'Haftalik' },
  { value: 'MONTHLY', label: 'Oylik' },
  { value: 'QUARTERLY', label: 'Choraklik' },
  { value: 'YEARLY', label: 'Yillik' },
];

const DIRECTION_OPTIONS = [
  { value: 'HIGHER_IS_BETTER', label: "Ko'p bo'lsa yaxshi (davomat %, yig'ilish %)" },
  { value: 'LOWER_IS_BETTER', label: "Kam bo'lsa yaxshi (qarzdorlik, shikoyatlar)" },
];

const schema = z.object({
  name: z.string().min(2, 'Kamida 2 ta belgi').max(100, 'Ko‘pi bilan 100 ta belgi'),
  description: z.string().optional(),
  category: z.string().min(1, 'Kategoriya tanlanishi shart'),
  targetValue: z.coerce.number().min(0).optional(),
  unit: z.string().optional(),
  period: z.string().optional(),
  direction: z.string().optional(),
  branchId: z.string().optional(),
  ownerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewKpiMetricPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);

  const canManage = ['vice_principal', 'super_admin'].includes(user?.role ?? '');

  // Metrika turi: SYSTEM (katalogdan, avtomatik) yoki MANUAL (qo'lda kiritiladigan)
  const [mode, setMode] = useState<'SYSTEM' | 'MANUAL'>('SYSTEM');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [systemTarget, setSystemTarget] = useState<string>('');
  const [systemBranchId, setSystemBranchId] = useState<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Guard: only managers can create KPIs (wait for auth hydration)
  useEffect(() => {
    if (mounted && user && !canManage) {
      router.replace('/dashboard/kpi');
    }
  }, [mounted, user, canManage, router]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      targetValue: 0,
      unit: '%',
      period: 'MONTHLY',
      direction: 'HIGHER_IS_BETTER',
      isActive: true,
    },
  });

  // Load branches for branch selector
  const { data: branchesData } = useQuery({
    queryKey: ['branches', user?.schoolId],
    queryFn: () => branchesApi.getAll(),
    enabled: canManage && !!user?.schoolId,
  });
  const branchesList = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.data ?? [];

  // Tizim metrikalari katalogi
  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ['kpi', 'catalog'],
    queryFn: () => kpiApi.getCatalog(),
    enabled: canManage,
  });
  const selectedItem: KpiCatalogItem | undefined = catalog?.find((c) => c.key === selectedKey);

  // Mas'ul xodim tanlovi uchun xodimlar ro'yxati (qo'lda metrika)
  const { data: staffData } = useQuery({
    queryKey: ['kpi', 'staff-options'],
    queryFn: () => usersApi.getAll({ limit: 200 }),
    enabled: canManage && mode === 'MANUAL',
  });
  const staffList = ((staffData as any)?.data ?? (Array.isArray(staffData) ? staffData : []))
    .filter((u: any) => OWNER_ROLES.has(u.role));

  const mutation = useMutation({
    mutationFn: kpiApi.createMetric,
    onSuccess: () => {
      toast({ title: ' KPI metrika yaratildi' });
      queryClient.invalidateQueries({ queryKey: ['kpi'] });
      router.push('/dashboard/kpi');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({
        variant: 'destructive',
        title: 'Xato',
        description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi',
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate({
      name: values.name,
      description: values.description?.trim() || undefined,
      category: values.category,
      targetValue: values.targetValue,
      unit: values.unit?.trim() || undefined,
      period: values.period,
      direction: (values.direction as any) || 'HIGHER_IS_BETTER',
      branchId: values.branchId || undefined,
      ownerId: values.ownerId || undefined,
      isActive: values.isActive,
    });
  };

  const onSubmitSystem = () => {
    if (!selectedItem) return;
    mutation.mutate({
      sourceType: 'SYSTEM',
      sourceKey: selectedItem.key,
      targetValue: systemTarget !== '' ? Number(systemTarget) : undefined,
      branchId: systemBranchId || undefined,
    });
  };

  // Show loading while auth store hydrates
  if (!mounted || !user) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!canManage) return null;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/kpi">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Orqaga
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yangi KPI metrika</h1>
          <p className="text-xedu-slate-500 dark:text-xedu-slate-400">Maktab uchun kalit ko&apos;rsatkich yaratish</p>
        </div>
      </div>

      {/* Metrika turi */}
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode('SYSTEM')}
          className={cn(
            'rounded-xl border p-4 text-left transition-all',
            mode === 'SYSTEM'
              ? 'border-xedu-primary bg-xedu-primary/5 ring-1 ring-xedu-primary/30'
              : 'border-xedu-border hover:border-xedu-border-hover',
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-xedu-violet-600" />
            <span className="text-sm font-semibold">Tizim metrikasi</span>
          </div>
          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
            Qiymati Xedu ma&apos;lumotidan avtomatik hisoblanadi — davomat, baholar, to&apos;lovlar, CRM
          </p>
        </button>
        <button
          type="button"
          onClick={() => setMode('MANUAL')}
          className={cn(
            'rounded-xl border p-4 text-left transition-all',
            mode === 'MANUAL'
              ? 'border-xedu-primary bg-xedu-primary/5 ring-1 ring-xedu-primary/30'
              : 'border-xedu-border hover:border-xedu-border-hover',
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <PencilLine className="h-4 w-4 text-xedu-slate-500" />
            <span className="text-sm font-semibold">Qo&apos;lda metrika</span>
          </div>
          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
            Qiymati har davrda mas&apos;ul xodim tomonidan kiritiladi — NPS, olimpiadalar va h.k.
          </p>
        </button>
      </div>

      {mode === 'SYSTEM' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-xedu-violet-600" />
                Katalogdan tanlang
              </CardTitle>
              <CardDescription>Har bir shablon qaysi ma&apos;lumotdan hisoblanishi tavsifda ko&apos;rsatilgan</CardDescription>
            </CardHeader>
            <CardContent>
              {catalogLoading ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl bg-black/5 dark:bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(catalog ?? []).map((item) => {
                    const selected = selectedKey === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        disabled={item.alreadyAdded}
                        onClick={() => {
                          setSelectedKey(item.key);
                          setSystemTarget(String(item.defaultTarget));
                        }}
                        className={cn(
                          'relative rounded-xl border p-3.5 text-left transition-all',
                          item.alreadyAdded && 'opacity-50 cursor-not-allowed',
                          selected
                            ? 'border-xedu-primary bg-xedu-primary/5 ring-1 ring-xedu-primary/30'
                            : 'border-xedu-border hover:border-xedu-border-hover',
                        )}
                      >
                        {selected && (
                          <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-xedu-primary">
                            <Check className="h-3 w-3 text-white" />
                          </span>
                        )}
                        <p className="text-sm font-semibold pr-6">{item.name}</p>
                        <p className="mt-1 text-xs text-xedu-slate-500 dark:text-xedu-slate-400 leading-relaxed">{item.description}</p>
                        <p className="mt-1.5 text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400">
                          {item.alreadyAdded
                            ? 'Allaqachon qo‘shilgan'
                            : `Standart maqsad: ${item.direction === 'LOWER_IS_BETTER' ? '≤ ' : ''}${item.defaultTarget.toLocaleString()}${item.unit}`}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedItem && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maqsad va qamrov</CardTitle>
                <CardDescription>
                  {selectedItem.direction === 'LOWER_IS_BETTER'
                    ? 'Bu metrikada qiymat maqsaddan PAST bo‘lsa yaxshi hisoblanadi'
                    : 'Bu metrikada qiymat maqsaddan YUQORI bo‘lsa yaxshi hisoblanadi'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="systemTarget">Maqsad qiymat ({selectedItem.unit})</Label>
                    <Input
                      id="systemTarget"
                      type="number"
                      min={0}
                      step="any"
                      value={systemTarget}
                      onChange={(e) => setSystemTarget(e.target.value)}
                    />
                  </div>
                  {branchesList.length > 0 && (
                    <div className="space-y-1.5">
                      <Label>Filial</Label>
                      <Select value={systemBranchId || undefined} onValueChange={setSystemBranchId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Maktab bo'yicha (ixtiyoriy)..." />
                        </SelectTrigger>
                        <SelectContent>
                          {branchesList.map((b: any) => (
                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Tanlanmasa, butun maktab bo&apos;yicha hisoblanadi</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center gap-3 justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/kpi">Bekor qilish</Link>
            </Button>
            <Button
              type="button"
              disabled={!selectedItem || mutation.isPending}
              onClick={onSubmitSystem}
              className="min-w-32"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saqlanmoqda...
                </span>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Qo&apos;shish
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {mode === 'MANUAL' && (
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Asosiy ma'lumotlar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Asosiy ma&apos;lumotlar
            </CardTitle>
            <CardDescription>KPI metrika nomi, kategoriyasi va maqsadi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nomi <span className="text-xedu-ruby">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Masalan: Davomat foizi"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-xs text-xedu-ruby">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Tavsif</Label>
              <Input
                id="description"
                placeholder="KPI maqsadi va tavsifi"
                {...register('description')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kategoriya <span className="text-xedu-ruby">*</span></Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Kategoriya tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.category && <p className="text-xs text-xedu-ruby">{errors.category.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Davr</Label>
                <Controller
                  name="period"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Davr tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maqsad va birlik */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Maqsad va birlik</CardTitle>
            <CardDescription>Ko&apos;rsatkichning maqsad qiymati va o&apos;lchov birligi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="targetValue">Maqsad qiymat</Label>
                <Input
                  id="targetValue"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="95"
                  {...register('targetValue')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Birlik</Label>
                <Input
                  id="unit"
                  placeholder="%, so'm, ta, ball"
                  {...register('unit')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Yo&apos;nalish</Label>
              <Controller
                name="direction"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || 'HIGHER_IS_BETTER'} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIRECTION_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                Bajarilish foizi shu yo&apos;nalishga qarab hisoblanadi
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filial va holat */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Qo'shimcha sozlamalar</CardTitle>
            <CardDescription>Filial biriktirish va holat</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {branchesList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <Controller
                  name="branchId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filial tanlang (ixtiyoriy)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesList.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Tanlanmasa, maktab bo&apos;yicha KPI hisoblanadi</p>
              </div>
            )}

            {staffList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Mas&apos;ul xodim</Label>
                <Controller
                  name="ownerId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Xodim tanlang (ixtiyoriy)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {staffList.map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.firstName} {u.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                  Oy yopilganda qiymat kiritilmagan bo&apos;lsa, mas&apos;ulga eslatma boradi
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm">Aktiv holat</Label>
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">KPI monitoring tizimida ko&apos;rinadi</p>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center gap-3 justify-end">
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/kpi">Bekor qilish</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending} className="min-w-32">
            {mutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saqlanmoqda...
              </span>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Yaratish
              </>
            )}
          </Button>
        </div>
      </form>
      )}
    </div>
  );
}
