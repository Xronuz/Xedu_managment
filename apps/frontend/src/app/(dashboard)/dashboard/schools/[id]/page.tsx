'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  Building2, ArrowLeft, Save, Layers, Users,
  Globe, Phone, Mail, MapPin, CheckCircle2, XCircle,
  BookOpen, CreditCard, Bell, Calendar, GraduationCap,
  Utensils, Library, Bus, Package, UserPlus, Loader2,
  BarChart2, FileText, ClipboardCheck, DollarSign,
  TrendingUp, MessageSquare, BookCopy, Trash2, AlertTriangle,
  KeyRound, Copy, Check,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { superAdminApi } from '@/lib/api/super-admin';
import { usersApi } from '@/lib/api/users';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const MODULE_META: Record<string, { icon: React.ElementType; label: string; description: string; category: string }> = {
  // 1. Strategiya va Boshqaruv
  reports:      { icon: BarChart2,    label: 'Hisobotlar',       description: 'KPI, davomat, moliya va akademik hisobotlar',     category: '1. Strategiya' },
  // 2. Akademik Tizim
  classes:      { icon: GraduationCap, label: 'Sinflar',         description: 'Sinf boshqaruvi va o‘quvchilar taqsimoti',       category: '2. Akademik' },
  schedule:     { icon: Calendar,     label: 'Dars jadvali',    description: 'Haftalik jadval va zal band qilish',              category: '2. Akademik' },
  subjects:     { icon: BookOpen,     label: 'Fanlar',          description: 'O‘quv fanlari va dasturlar',                     category: '2. Akademik' },
  exams:        { icon: FileText,     label: 'Imtihonlar',      description: 'Imtihon rejalashtirish va natijalar',             category: '2. Akademik' },
  homework:     { icon: ClipboardCheck, label: 'Uy vazifalari', description: 'Vazifalar berish va tekshirish',                  category: '2. Akademik' },
  grades:       { icon: BookOpen,     label: 'Baholar & Jurnal', description: 'Elektron jurnal, baholar va GPA',                category: '2. Akademik' },
  // 3. O‘qituvchi Tizimi
  users:        { icon: Users,        label: 'Xodimlar',        description: 'O‘qituvchi va xodimlar boshqaruvi',              category: '3. O‘qituvchi' },
  payroll:      { icon: DollarSign,   label: 'Ish haqi',        description: 'Maosh hisoblash va avanslar',                     category: '3. O‘qituvchi' },
  // 4. O‘quvchi Boshqaruvi
  attendance:   { icon: CheckCircle2, label: 'Davomat',         description: 'Kunlik davomat belgilash va hisobotlar',          category: '4. O‘quvchi' },
  // 5. Marketing & Sales
  // (leads CRM — hozircha alohida yo‘nalish sifatida ko‘rsatilmagan)
  // 6. Moliya Tizimi
  payments:     { icon: CreditCard,   label: 'To‘lovlar',      description: 'Payme/Click integratsiyasi, qarzdorlik',          category: '6. Moliya' },
  finance_dashboard: { icon: TrendingUp, label: 'Moliya Dashboard', description: 'Kirim-chiqim va g‘azna nazorati',           category: '6. Moliya' },
  // 7. Operatsiya Tizimi
  transport:    { icon: Bus,          label: 'Transport',       description: 'Avtobus marshrut va tracking',                    category: '7. Operatsiya' },
  canteen:      { icon: Utensils,     label: 'Oshxona',         description: 'Haftalik menyu va ovqatlanish',                   category: '7. Operatsiya' },
  // 8. AI & IT
  learning_center: { icon: Library,   label: 'O‘quv markazi',  description: 'Onlayn kurslar va materiallar',                   category: '8. AI & IT' },
  // Qo‘shimcha
  library:      { icon: BookCopy,     label: 'Kutubxona',       description: 'Kitob katalog, berib-olish',                      category: 'Qo‘shimcha' },
  notifications:{ icon: Bell,         label: 'Xabarnomalar',    description: 'SMS va push xabarnomalar',                        category: 'Qo‘shimcha' },
  messaging:    { icon: MessageSquare, label: 'Xabarlar',       description: 'Ichki xabar almashish',                           category: 'Qo‘shimcha' },
  display:      { icon: Globe,        label: 'Display',         description: 'Maktab ekranlarida ko‘rsatish',                  category: 'Qo‘shimcha' },
  clubs:        { icon: Users,        label: 'To‘garaklar',    description: 'Maktab to‘garaklari va ro‘yxatdan o‘tish',     category: 'Qo‘shimcha' },
};

const CATEGORIES = ['1. Strategiya', '2. Akademik', '3. O‘qituvchi', '4. O‘quvchi', '6. Moliya', '7. Operatsiya', '8. AI & IT', 'Qo‘shimcha'];

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'modules'>('info');
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [confirmReset, setConfirmReset] = useState<any>(null);
  const [resetResult, setResetResult] = useState<{ temporaryPassword: string; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [adminForm, setAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'director',
  });

  const { data: school, isLoading } = useQuery({
    queryKey: ['school', id],
    queryFn: () => superAdminApi.getSchool(id),
  });

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['school-modules', id],
    queryFn: () => superAdminApi.getModules(id),
  });

  const { data: schoolUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['school-users', id],
    queryFn: () => superAdminApi.getSchoolUsers(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: object) => superAdminApi.updateSchool(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school', id] });
      queryClient.invalidateQueries({ queryKey: ['school-users', id] });
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      setEditMode(false);
    },
  });

  const toggleModule = useMutation({
    mutationFn: ({ moduleName, isEnabled }: { moduleName: string; isEnabled: boolean }) =>
      superAdminApi.toggleModule(id, moduleName, isEnabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-modules', id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => superAdminApi.deleteSchool(id),
    onSuccess: () => {
      toast({ title: "Maktab o'chirildi", description: "Maktab muvaffaqiyatli o'chirildi." });
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      router.push('/dashboard/schools');
    },
    onError: (err: any) => {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || "Maktabni o'chirishda xatolik yuz berdi",
        variant: 'destructive',
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => usersApi.resetPassword(userId),
    onSuccess: (data) => {
      setConfirmReset(null);
      setResetResult(data);
      setCopied(false);
    },
    onError: (err: any) => {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || 'Parolni tiklashda xatolik yuz berdi',
        variant: 'destructive',
      });
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: () =>
      usersApi.create({
        firstName: adminForm.firstName,
        lastName: adminForm.lastName,
        email: adminForm.email,
        phone: adminForm.phone || undefined,
        password: adminForm.password,
        role: 'director',
        schoolId: id,
      }),
    onSuccess: () => {
      toast({
        title: 'Foydalanuvchi muvaffaqiyatli yaratildi',
        description: `${adminForm.firstName} ${adminForm.lastName} maktabga qo'shildi.`,
      });
      setShowAdminDialog(false);
      setAdminForm({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'director' });
      queryClient.invalidateQueries({ queryKey: ['school', id] });
    },
    onError: (err: any) => {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || err?.message || 'Noma‘lum xatolik yuz berdi',
        variant: 'destructive',
      });
    },
  });

  const startEdit = () => {
    setEditForm({
      name: school.name,
      address: school.address ?? '',
      phone: school.phone ?? '',
      email: school.email ?? '',
    });
    setEditMode(true);
  };

  const modulesMap = Array.isArray(modules)
    ? modules.reduce((acc: any, m: any) => ({ ...acc, [m.moduleName]: m }), {})
    : {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="py-16 text-center">
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400">Maktab topilmadi</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/schools">← Orqaga</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/schools">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Orqaga
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{school.name}</h1>
              <Badge variant={school.isActive ? 'success' : 'destructive'}>
                {school.isActive ? 'Aktiv' : 'Bloklangan'}
              </Badge>
            </div>
            <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400 flex items-center gap-1 mt-0.5">
              <Globe className="h-3 w-3" />
              {school.slug}
              {school.createdAt && ` · Qo'shilgan: ${formatDate(school.createdAt)}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => setShowAdminDialog(true)}
          >
            <UserPlus className="mr-1.5 h-3.5 w-3.5" />
            Foydalanuvchi qo‘shish
          </Button>
          <Button
            variant={school.isActive ? 'destructive' : 'default'}
            size="sm"
            onClick={() => updateMutation.mutate({ isActive: !school.isActive })}
            disabled={updateMutation.isPending}
          >
            {school.isActive ? (
              <><XCircle className="mr-1.5 h-3.5 w-3.5" />Bloklash</>
            ) : (
              <><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Faollashtirish</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xedu-ruby border-xedu-ruby/30 hover:bg-xedu-ruby/10"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            O'chirish
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-violet-500/10 p-2">
              <Users className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{school._count?.users ?? 0}</p>
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Foydalanuvchilar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {Array.isArray(modules) ? modules.filter((m: any) => m.isEnabled).length : '—'}
              </p>
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Aktiv modullar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold capitalize">{school.subscriptionTier ?? 'basic'}</p>
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Obuna tarifi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['info', 'modules'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-foreground'
            }`}
          >
            {tab === 'info' ? 'Ma‘lumotlar' : 'Modullar'}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {activeTab === 'info' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Maktab ma‘lumotlari</CardTitle>
              <CardDescription>Asosiy kontakt va manzil ma‘lumotlari</CardDescription>
            </div>
            {!editMode ? (
              <Button variant="outline" size="sm" onClick={startEdit}>
                Tahrirlash
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditMode(false)}
                  disabled={updateMutation.isPending}
                >
                  Bekor
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate(editForm)}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <><Save className="mr-1.5 h-3.5 w-3.5" />Saqlash</>
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {editMode && editForm ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Maktab nomi</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefon</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, phone: e.target.value }))}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, email: e.target.value }))}
                    placeholder="info@school.uz"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Manzil</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) => setEditForm((f: any) => ({ ...f, address: e.target.value }))}
                    placeholder="Toshkent sh., Yunusobod t."
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Building2, label: 'Maktab nomi', value: school.name },
                  { icon: Globe, label: 'Slug', value: school.slug },
                  { icon: Phone, label: 'Telefon', value: school.phone || '—' },
                  { icon: Mail, label: 'Email', value: school.email || '—' },
                  { icon: MapPin, label: 'Manzil', value: school.address || '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                    <Icon className="h-4 w-4 text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{label}</p>
                      <p className="text-sm font-medium">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Directors section */}
      {activeTab === 'info' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Direktorlar</CardTitle>
              <CardDescription>Maktab direktorlari va ularning parolini boshqarish</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
              </div>
            ) : !schoolUsers || schoolUsers.filter((u: any) => u.role === 'director').length === 0 ? (
              <div className="text-center py-8 text-xedu-slate-500 dark:text-xedu-slate-400">
                <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                <p>Hali direktor qo'shilmagan</p>
                <Button size="sm" className="mt-3" onClick={() => setShowAdminDialog(true)}>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Direktor qo'shish
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {schoolUsers.filter((u: any) => u.role === 'director').map((director: any) => (
                  <div
                    key={director.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {director.firstName} {director.lastName}
                        </p>
                        <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                          {director.email} {director.phone && `· ${director.phone}`}
                        </p>
                      </div>
                      <Badge variant={director.isActive ? 'success' : 'destructive'} className="text-[10px]">
                        {director.isActive ? 'Aktiv' : 'Bloklangan'}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmReset(director)}
                    >
                      <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                      Parolni tiklash
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab: Modules */}
      {activeTab === 'modules' && (
        <div className="space-y-4">
          {modulesLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            CATEGORIES.map((category) => {
              const catModules = Object.entries(MODULE_META).filter(
                ([, meta]) => meta.category === category,
              );
              return (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-xedu-slate-500 dark:text-xedu-slate-400 uppercase tracking-wider">
                      {category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 pt-0">
                    {catModules.map(([name, meta]) => {
                      const mod = modulesMap[name];
                      const isEnabled = mod?.isEnabled ?? false;
                      const Icon = meta.icon;
                      return (
                        <div
                          key={name}
                          className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                              <Icon className={`h-4 w-4 ${isEnabled ? 'text-primary' : 'text-xedu-slate-500 dark:text-xedu-slate-400'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{meta.label}</p>
                              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{meta.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs ${isEnabled ? 'text-green-600 dark:text-green-400' : 'text-xedu-slate-500 dark:text-xedu-slate-400'}`}>
                              {isEnabled ? 'Yoqilgan' : 'O‘chirilgan'}
                            </span>
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) =>
                                toggleModule.mutate({ moduleName: name, isEnabled: checked })
                              }
                              disabled={toggleModule.isPending}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Password reset confirmation */}
      <Dialog open={!!confirmReset} onOpenChange={(v) => { if (!v) setConfirmReset(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Parolni tiklashni tasdiqlang
            </DialogTitle>
            <DialogDescription className="pt-1">
              <span className="font-semibold text-foreground">
                {confirmReset?.firstName} {confirmReset?.lastName}
              </span>{' '}
              uchun yangi vaqtinchalik parol yaratiladi. U keyingi kirishda parolni yangilashi kerak.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setConfirmReset(null)}>Bekor qilish</Button>
            <Button
              variant="default"
              disabled={resetPasswordMutation.isPending}
              onClick={() => resetPasswordMutation.mutate(confirmReset?.id)}
            >
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              Parolni tiklash
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password reset success — temporary password display */}
      <Dialog open={!!resetResult} onOpenChange={(v) => { if (!v) { setResetResult(null); setCopied(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-xedu-emerald" />
              Parol tiklandi
            </DialogTitle>
            <DialogDescription className="pt-1">
              Vaqtinchalik parol faqat bir marta ko'rsatiladi. Foydalanuvchiga yuboring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={resetResult?.temporaryPassword ?? ''}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(resetResult?.temporaryPassword ?? '');
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="h-4 w-4 text-xedu-emerald" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-xedu-ruby">
              Diqqat: Bu parolni hech qayerda saqlamang. Foydalanuvchi keyingi kirishda yangi parol o'rnatishi kerak.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>Tushundim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(v) => { if (!v) { setShowDeleteDialog(false); setDeleteConfirmText(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xedu-ruby">
              <AlertTriangle className="h-5 w-5" />
              Maktabni o'chirishni tasdiqlang
            </DialogTitle>
            <DialogDescription className="pt-1">
              Bu maktab tizimdan o'chiriladi va uning foydalanuvchilari tizimga kira olmaydi. Bu amalni ehtiyotkorlik bilan bajaring.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="rounded-md bg-xedu-ruby/10 border border-xedu-ruby/20 p-3 text-sm text-xedu-ruby">
              <strong>{school.name}</strong> maktabini o'chirish uchun quyidagi maydonga <code className="font-mono bg-white/50 px-1 rounded">O'CHIRISH</code> so'zini yozing.
            </div>
            <Input
              placeholder="O'CHIRISH"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setShowDeleteDialog(false); setDeleteConfirmText(''); }}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "O'CHIRISH" || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? "O'chirilmoqda..." : "O'chirish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin qo'shish dialogi */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Foydalanuvchi qo‘shish</DialogTitle>
            <DialogDescription>
              {school.name} maktabiga yangi foydalanuvchi qo‘shing. Parol tizimga kirish uchun ishlatiladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-role">Rol</Label>
              <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground items-center">
                Direktor
              </div>
              <p className="text-xs text-xedu-slate-500">
                Super Admin faqat Direktor yaratishi mumkin. Boshqa rollarni maktab direktori qo‘shadi.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="admin-firstName">Ism</Label>
                <Input
                  id="admin-firstName"
                  value={adminForm.firstName}
                  onChange={(e) => setAdminForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Ali"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-lastName">Familiya</Label>
                <Input
                  id="admin-lastName"
                  value={adminForm.lastName}
                  onChange={(e) => setAdminForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Valiyev"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminForm.email}
                onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="admin@school.uz"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-phone">Telefon</Label>
              <Input
                id="admin-phone"
                value={adminForm.phone}
                onChange={(e) => setAdminForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+998 90 123 45 67"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Parol</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Kamida 8 ta belgi"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowAdminDialog(false)}
              disabled={createAdminMutation.isPending}
            >
              Bekor
            </Button>
            <Button
              onClick={() => createAdminMutation.mutate()}
              disabled={
                createAdminMutation.isPending ||
                !adminForm.firstName ||
                !adminForm.lastName ||
                !adminForm.email ||
                !adminForm.password
              }
            >
              {createAdminMutation.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-1.5 h-4 w-4" />
              )}
              Qo'shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
