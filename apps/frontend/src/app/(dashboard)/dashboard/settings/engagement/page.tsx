'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Check, Loader2, Trophy, ShieldAlert, BookOpen,
  GraduationCap, Store, Users, Zap, BarChart3, RotateCcw, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { engagementApi, EngagementConfig } from '@/lib/api/engagement';

const POSITIVE_RULES = [
  { key: 'grade_excellent', label: "A'lo baho", default: 10 },
  { key: 'attendance_weekly', label: 'Haftalik davomat', default: 20 },
  { key: 'attendance_monthly', label: 'Oylik davomat', default: 50 },
  { key: 'discipline_praise', label: 'Intizom maqtovi', default: 100 },
  { key: 'homework_consistency', label: "Uyga vazifa intizomi", default: 15 },
  { key: 'exam_high_score', label: "Yuqori imtihon natijasi", default: 20 },
  { key: 'improvement_milestone', label: "O'sish marraosi", default: 20 },
  { key: 'participation', label: 'Faol ishtirok', default: 15 },
  { key: 'recovery_bonus', label: 'Tiklanish mukofoti', default: 25 },
];

const ACCOUNTABILITY_RULES = [
  { key: 'repeated_absence', label: 'Takroriy dars qoldirish', default: -30 },
  { key: 'repeated_lateness', label: 'Takroriy kechikish', default: -15 },
  { key: 'exam_low_score', label: 'Past imtihon natijasi', default: -15 },
  { key: 'cheating_incident', label: 'Nopishtonlik holati', default: -100 },
  { key: 'severe_discipline', label: 'Jiddiy intizom buzilishi', default: -50 },
  { key: 'discipline_warning', label: 'Intizom ogohlantiruvi', default: -50 },
];

export default function EngagementSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['engagement', 'config'],
    queryFn: () => engagementApi.getConfig(),
  });

  const [form, setForm] = useState<Partial<EngagementConfig>>({});

  // Form ni config dan to'ldirish
  const current = { ...config, ...form } as EngagementConfig;

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<EngagementConfig>) => engagementApi.updateConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['engagement', 'config'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      toast({ title: 'Sozlamalar saqlandi' });
    },
    onError: () => {
      toast({ variant: 'destructive', title: 'Xatolik yuz berdi' });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(form);
  };

  const toggle = (key: keyof EngagementConfig) => {
    setForm((f) => ({ ...f, [key]: !((f[key] ?? config?.[key]) as boolean) }));
  };

  const setRule = (type: 'positive' | 'accountability', key: string, value: number) => {
    const rulesKey = type === 'positive' ? 'coin_rules_positive' : 'coin_rules_accountability';
    const existing = (form[rulesKey] ?? config?.[rulesKey] ?? {}) as Record<string, number>;
    setForm((f) => ({ ...f, [rulesKey]: { ...existing, [key]: value } }));
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-xedu-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/settings')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Orqaga
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Faoliyat tizimi sozlamalari</h1>
          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
            Engagement tizimini yoqish, xususiyatlarni boshqarish va qoidalarni sozlash
          </p>
        </div>
      </div>

      {/* Master Toggle */}
      <Card className={current.engagement_enabled ? 'border-xedu-primary/30' : 'border-xedu-slate-200'}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${current.engagement_enabled ? 'bg-xedu-primary/10 text-xedu-primary' : 'bg-xedu-slate-100 text-xedu-slate-400'}`}>
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Faoliyat tizimi</p>
                <p className="text-xs text-xedu-slate-500">
                  {current.engagement_enabled
                    ? 'Tizim faol — o\'quvchilar mukofot va tiklanishni ko\'radi'
                    : 'Tizim o\'chirilgan — hech kim engagement ko\'ra olmaydi'}
                </p>
              </div>
            </div>
            <Switch
              checked={!!current.engagement_enabled}
              onCheckedChange={() => toggle('engagement_enabled')}
            />
          </div>
        </CardContent>
      </Card>

      {!current.engagement_enabled && (
        <div className="rounded-xl bg-xedu-slate-50 dark:bg-xedu-slate-800/50 p-4 text-center">
          <p className="text-sm text-xedu-slate-500">
            Faoliyat tizimini yoqish uchun yuqoridagi tugmani bosing. Keyin quyidagi sozlamalar ko\'rinadi.
          </p>
        </div>
      )}

      {current.engagement_enabled && (
        <>
          {/* Feature Toggles */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Xususiyatlar</CardTitle>
              <CardDescription>Har bir xususiyatni alohida yoqish/o\'chirish</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleRow
                icon={Trophy}
                label="Mukofotlar"
                description="O\'quvchilar mukofotlarni olishi mumkin"
                checked={!!current.engagement_positive}
                onChange={() => toggle('engagement_positive')}
              />
              <ToggleRow
                icon={BookOpen}
                label="Mukofot tizimi"
                description="Erishilgan mukofotlarni ko\'rish"
                checked={!!current.engagement_achievements}
                onChange={() => toggle('engagement_achievements')}
              />
              <ToggleRow
                icon={ShieldAlert}
                label="Hisobdorlik"
                description="Takroriy salbiy holatlar uchun ogohlantirish"
                checked={!!current.engagement_accountability}
                onChange={() => toggle('engagement_accountability')}
                warning
              />
              <ToggleRow
                icon={RotateCcw}
                label="Tiklanish"
                description="O\'quvchilar salbiy holatdan keyin tiklanishi"
                checked={!!current.engagement_recovery_enabled}
                onChange={() => toggle('engagement_recovery_enabled')}
              />
              <ToggleRow
                icon={Store}
                label="Mukofotlar do\'koni"
                description="O\'quvchilar coinlarni sarflashi mumkin"
                checked={!!current.engagement_shop}
                onChange={() => toggle('engagement_shop')}
              />
              <ToggleRow
                icon={Users}
                label="O\'qituvchi mukofoti"
                description="O\'qituvchilar o\'quvchilarga coin bersin"
                checked={!!current.engagement_teacher_award}
                onChange={() => toggle('engagement_teacher_award')}
              />
              <ToggleRow
                icon={ShieldAlert}
                label="O\'qituvchi ogohlantiruvi"
                description="O\'qituvchilar hisobdorlik qo\'llasin"
                checked={!!current.engagement_teacher_deduct}
                onChange={() => toggle('engagement_teacher_deduct')}
                warning
              />
              <ToggleRow
                icon={BarChart3}
                label="Oylik imtihon integratsiyasi"
                description="Imtihon natijalari avtomatik engagement\'ga ta\'sir qilsin"
                checked={!!current.engagement_monthly_exam}
                onChange={() => toggle('engagement_monthly_exam')}
              />
            </CardContent>
          </Card>

          {/* Positive Rules */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-emerald-500" />
                Musbat qoidalar (coin mukofotlari)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {POSITIVE_RULES.map((rule) => (
                  <div key={rule.key} className="space-y-1">
                    <Label className="text-xs">{rule.label}</Label>
                    <Input
                      type="number"
                      value={((form.coin_rules_positive ?? config?.coin_rules_positive ?? {}) as Record<string, number>)[rule.key] ?? rule.default}
                      onChange={(e) => setRule('positive', rule.key, Number(e.target.value))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Accountability Rules */}
          {current.engagement_accountability && (
            <Card className="border-xedu-ruby/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-xedu-ruby" />
                  Hisobdorlik qoidalari (coin ayirish)
                </CardTitle>
                <CardDescription className="text-xedu-ruby/70">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Bu qoidalar o\'quvchining coinlarini kamaytiradi. Foydalanishdan oldin ota-onalarga xabar bering.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ACCOUNTABILITY_RULES.map((rule) => (
                    <div key={rule.key} className="space-y-1">
                      <Label className="text-xs">{rule.label}</Label>
                      <Input
                        type="number"
                        value={((form.coin_rules_accountability ?? config?.coin_rules_accountability ?? {}) as Record<string, number>)[rule.key] ?? rule.default}
                        onChange={(e) => setRule('accountability', rule.key, Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thresholds */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-xedu-primary" />
                Chegara qiymatlar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: 'exam_high', label: "Yuqori imtihon foizi (mukofot)", default: 90 },
                  { key: 'exam_low', label: "Past imtihon foizi (ogohlantirish)", default: 50 },
                  { key: 'absence_limit', label: 'Dars qoldirish chegarasi', default: 3 },
                  { key: 'lateness_limit', label: 'Kechikish chegarasi', default: 5 },
                ].map((t) => (
                  <div key={t.key} className="space-y-1">
                    <Label className="text-xs">{t.label}</Label>
                    <Input
                      type="number"
                      value={((form.coin_thresholds ?? config?.coin_thresholds ?? {}) as Record<string, number>)[t.key] ?? t.default}
                      onChange={(e) => {
                        const existing = (form.coin_thresholds ?? config?.coin_thresholds ?? {}) as Record<string, number>;
                        setForm((f) => ({ ...f, coin_thresholds: { ...existing, [t.key]: Number(e.target.value) } }));
                      }}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || Object.keys(form).length === 0}
          className="min-w-[140px]"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : saved ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {updateMutation.isPending ? 'Saqlanmoqda...' : saved ? 'Saqlandi' : 'Saqlash'}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  checked,
  onChange,
  warning,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${warning ? 'bg-xedu-ruby/10 text-xedu-ruby' : 'bg-xedu-slate-100 text-xedu-slate-500'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-xedu-slate-500">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
