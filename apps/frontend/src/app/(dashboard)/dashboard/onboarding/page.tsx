'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  School, Users, BookOpen, Calendar, CheckCircle2,
  ChevronRight, ChevronLeft, Loader2, Plus, Trash2,
  GraduationCap, Clock, Rocket, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
import { usersApi } from '@/lib/api/users';
import { scheduleApi } from '@/lib/api/schedule';
import { systemConfigApi } from '@/lib/api/system-config';
import type { DayOfWeek } from '@eduplatform/types';
import { MAX_GRADE } from '@eduplatform/types';

// ── Step constants ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Maktab',      icon: School,        desc: 'Asosiy ma‘lumotlar' },
  { id: 2, label: 'Sinflar',     icon: GraduationCap, desc: 'Sinflar ro‘yxati' },
  { id: 3, label: 'Fanlar',      icon: BookOpen,      desc: 'O‘quv fanlari' },
  { id: 4, label: 'O‘qituvchi', icon: Users,         desc: 'Xodimlar qo‘shish' },
  { id: 5, label: 'Jadval',      icon: Calendar,      desc: 'Dars jadvali' },
] as const;

// Onboarding progress is now persisted to the backend via systemConfigApi.

const DAYS_UZ = [
  { value: 'monday',    label: 'Dushanba' },
  { value: 'tuesday',   label: 'Seshanba' },
  { value: 'wednesday', label: 'Chorshanba' },
  { value: 'thursday',  label: 'Payshanba' },
  { value: 'friday',    label: 'Juma' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function generateSecurePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let pw = '';
  for (let i = 0; i < 12; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pw;
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ current, completed }: { current: number; completed: number[] }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {STEPS.map((step, i) => {
        const isDone = completed.includes(step.id);
        const isActive = step.id === current;
        const Icon = step.icon;
        return (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive
                ? 'bg-xedu-primary text-white'
                : isDone
                ? 'bg-xedu-primary-light/60 text-xedu-primary dark:bg-xedu-primary/15 dark:text-xedu-primary'
                : 'bg-xedu-slate-100 text-xedu-slate-500 dark:bg-xedu-slate-800/60 dark:text-xedu-slate-400'
            }`}>
              {isDone && !isActive
                ? <CheckCircle2 className="h-3.5 w-3.5" />
                : <Icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-4 sm:w-8 mx-0.5 transition-colors ${isDone ? 'bg-xedu-primary/40' : 'bg-xedu-slate-100 dark:bg-xedu-slate-800/60'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: School info (read-only — already set during registration) ──────────
function Step1SchoolInfo({ user }: { user: any }) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-xedu-primary/10 flex items-center justify-center">
        <School className="h-8 w-8 text-xedu-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold tracking-tight">{user?.schoolName ?? 'Maktabingiz'}</h2>
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400 text-sm mt-1">Xedu ta'lim boshqaruv tizimiga xush kelibsiz</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
        <div className="bg-xedu-slate-50 dark:bg-xedu-slate-800/60 rounded-xl p-3">
          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Administrator</p>
          <p className="font-medium text-sm">{user?.firstName} {user?.lastName}</p>
        </div>
        <div className="bg-xedu-slate-50 dark:bg-xedu-slate-800/60 rounded-xl p-3">
          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Email</p>
          <p className="font-medium text-sm truncate">{user?.email}</p>
        </div>
      </div>
      <div className="bg-xedu-sky/5 dark:bg-xedu-sky/5 rounded-xl p-4 max-w-sm mx-auto text-sm text-xedu-sky dark:text-xedu-sky text-left border border-xedu-sky/10">
        <p className="font-semibold mb-1.5 flex items-center gap-1.5">
          <AlertCircle className="h-4 w-4" />
          Keyingi 4 qadamda nimalar qilasiz?
        </p>
        <ul className="space-y-1 text-xs list-disc list-inside opacity-90">
          <li>Maktab sinflarini yaratish</li>
          <li>O'quv fanlarini belgilash</li>
          <li>O'qituvchi va xodimlar qo'shish</li>
          <li>Dars jadvalini sozlash</li>
        </ul>
      </div>
    </div>
  );
}

// ── Step 2: Classes ────────────────────────────────────────────────────────────
function Step2Classes({ onDone }: { onDone: (classIds: string[]) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [academicYear, setAcademicYear] = useState(
    `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
  );
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  const { data: existingClasses = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
  });
  const classList: any[] = Array.isArray(existingClasses) ? existingClasses : [];

  const addMut = useMutation({
    mutationFn: () => classesApi.create({ name, gradeLevel: Number(gradeLevel) || undefined, academicYear }),
    onSuccess: (data) => {
      toast({ title: `"${name}" sinfi yaratildi` });
      setCreatedIds(p => [...p, data.id]);
      setName('');
      queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Xato' }),
  });

  const allIds = classList.map((c: any) => c.id);

  return (
    <div className="space-y-4">
      <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">Maktabdagi sinflarni qo'shing. Har bir sinf alohida yaratiladi.</p>

      {/* Quick add */}
      <div className="flex gap-2">
        <Input
          placeholder="Sinf nomi (masalan: 1A)"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && addMut.mutate()}
          className="flex-1"
        />
        <Input
          placeholder="Daraja"
          type="number"
          min={1} max={MAX_GRADE}
          value={gradeLevel}
          onChange={e => setGradeLevel(e.target.value)}
          className="w-24"
        />
        <Button onClick={() => addMut.mutate()} disabled={!name.trim() || addMut.isPending}>
          {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      <div className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">O'quv yili: <span className="font-medium">{academicYear}</span></div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : classList.length === 0 ? (
        <div className="text-center py-6 text-xedu-slate-500 dark:text-xedu-slate-400 text-sm">
          <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Hali sinflar qo'shilmagan
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {classList.map((c: any) => (
            <Badge key={c.id} variant="secondary" className="text-sm py-1 px-3">
              {c.name}
              {c.gradeLevel && <span className="ml-1 text-xedu-slate-500 dark:text-xedu-slate-400">({c.gradeLevel}-sinf)</span>}
            </Badge>
          ))}
        </div>
      )}

      <Button
        className="w-full"
        onClick={() => onDone(allIds)}
        disabled={classList.length === 0}
      >
        Davom etish ({classList.length} sinf) <ChevronRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Step 3: Subjects ───────────────────────────────────────────────────────────
function Step3Subjects({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const { data: existing = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll(),
  });
  const subjects: any[] = Array.isArray(existing) ? existing : [];

  const addMut = useMutation({
    mutationFn: () => subjectsApi.create({ name, code: code || undefined }),
    onSuccess: () => {
      toast({ title: `"${name}" fani qo'shildi` });
      setName('');
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Xato' }),
  });

  // Quick templates
  const TEMPLATES = [
    'Matematika', 'O‘zbek tili', 'Adabiyot', 'Ingliz tili', 'Fizika',
    'Kimyo', 'Biologiya', 'Tarix', 'Geografiya', 'Informatika',
    'Rus tili', 'Chizmachilik', 'Tarbiya', 'Musiqa', 'Jismoniy tarbiya',
  ];
  const alreadyAdded = new Set(subjects.map((s: any) => s.name));

  return (
    <div className="space-y-4">
      <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">O'tiladigan fanlarni qo'shing.</p>

      <div className="flex gap-2">
        <Input
          placeholder="Fan nomi"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && name.trim() && addMut.mutate()}
          className="flex-1"
        />
        <Input
          placeholder="Kod (ixtiyoriy)"
          value={code}
          onChange={e => setCode(e.target.value)}
          className="w-28"
        />
        <Button onClick={() => addMut.mutate()} disabled={!name.trim() || addMut.isPending}>
          {addMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Quick add chips */}
      <div>
        <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-2">Tezkor qo'shish:</p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map(t => (
            <button
              key={t}
              disabled={alreadyAdded.has(t)}
              onClick={() => { setName(t); }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                alreadyAdded.has(t)
                  ? 'border-xedu-primary/20 bg-xedu-primary-light/40 text-xedu-primary dark:border-xedu-primary/20 dark:bg-xedu-primary/10 cursor-default'
                  : 'border-xedu-slate-200 dark:border-xedu-slate-700 hover:border-xedu-primary hover:bg-xedu-primary-light/20 cursor-pointer'
              }`}
            >
              {alreadyAdded.has(t) ? <CheckCircle2 className="inline h-3 w-3 mr-0.5" /> : null}
              {t}
            </button>
          ))}
        </div>
      </div>

      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {subjects.map((s: any) => (
            <Badge key={s.id} variant="outline" className="text-xs">{s.name}</Badge>
          ))}
        </div>
      )}

      <Button className="w-full" onClick={onDone} disabled={subjects.length === 0}>
        Davom etish ({subjects.length} fan) <ChevronRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Step 4: Teachers ───────────────────────────────────────────────────────────
function Step4Teachers({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '' });

  const { data: existing } = useQuery({
    queryKey: ['users', 'teachers'],
    queryFn: () => usersApi.getAll({ role: 'teacher', limit: 50 }),
  });
  const teachers: any[] = existing?.data?.filter((u: any) => ['teacher', 'class_teacher'].includes(u.role)) ?? [];

  const addMut = useMutation({
    mutationFn: () => usersApi.create({
      ...form,
      role: 'teacher',
      password: generateSecurePassword(),
    }),
    onSuccess: () => {
      toast({ title: `${form.firstName} ${form.lastName} qo'shildi` });
      setForm({ firstName: '', lastName: '', email: '', phone: '' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.response?.data?.message ?? 'Xato' }),
  });

  return (
    <div className="space-y-4">
      <div className="bg-xedu-amber/5 border border-xedu-amber/10 rounded-xl p-3 text-xs text-xedu-amber dark:text-xedu-amber flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Yangi xodimlar qo'shilganda ularga avtomatik xavfsiz parol yaratiladi.
          Biroq, ularga alohida xabar yuborish va parolni o'zgartirishni tavsiya etamiz.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Ism"
          value={form.firstName}
          onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
        />
        <Input
          placeholder="Familiya"
          value={form.lastName}
          onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
        />
        <Input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
        />
        <Input
          placeholder="Telefon (ixtiyoriy)"
          value={form.phone}
          onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
        />
      </div>

      <Button
        className="w-full"
        onClick={() => addMut.mutate()}
        disabled={!form.firstName || !form.email || addMut.isPending}
        variant="outline"
      >
        {addMut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
        O'qituvchi qo'shish
      </Button>

      {teachers.length > 0 && (
        <div className="space-y-1.5">
          {teachers.slice(0, 5).map((t: any) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 p-2.5 text-sm">
              <div className="w-8 h-8 rounded-full bg-xedu-primary/10 flex items-center justify-center text-xs font-bold text-xedu-primary">
                {t.firstName[0]}{t.lastName[0]}
              </div>
              <div>
                <p className="font-medium">{t.firstName} {t.lastName}</p>
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{t.email}</p>
              </div>
              <CheckCircle2 className="ml-auto h-4 w-4 text-xedu-primary" />
            </div>
          ))}
          {teachers.length > 5 && (
            <p className="text-xs text-center text-xedu-slate-500 dark:text-xedu-slate-400">+{teachers.length - 5} ta yana</p>
          )}
        </div>
      )}

      <Button className="w-full" onClick={onDone}>
        {teachers.length === 0
          ? "Bu qadamni o'tkazib yuborish"
          : `Davom etish (${teachers.length} o'qituvchi)`}
        <ChevronRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}

// ── Step 5: Sample schedule ────────────────────────────────────────────────────
function Step5Schedule({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const { data: classesData = [] } = useQuery({ queryKey: ['classes'], queryFn: classesApi.getAll });
  const { data: subjectsData = [] } = useQuery({ queryKey: ['subjects'], queryFn: () => subjectsApi.getAll() });

  const classes: any[] = Array.isArray(classesData) ? classesData : [];
  const subjects: any[] = Array.isArray(subjectsData) ? subjectsData : [];

  const [entries, setEntries] = useState<{ dayOfWeek: DayOfWeek; classId: string; subjectId: string; teacherId?: string; timeSlot: number; startTime: string; endTime: string }[]>([
    { dayOfWeek: 'monday' as DayOfWeek, classId: '', subjectId: '', timeSlot: 1, startTime: '08:00', endTime: '08:45' },
  ]);

  const addEntry = () => setEntries(p => [
    ...p,
    { dayOfWeek: 'monday' as DayOfWeek, classId: '', subjectId: '', teacherId: undefined, timeSlot: p.length + 1, startTime: '08:00', endTime: '08:45' },
  ]);

  const removeEntry = (i: number) => setEntries(p => p.filter((_, j) => j !== i));

  const addMut = useMutation({
    mutationFn: async () => {
      const valid = entries.filter(e => e.classId && e.subjectId);
      if (valid.length === 0) throw new Error('Kamida 1 ta dars kiriting');
      for (const e of valid) {
        await scheduleApi.create(e);
      }
      return valid.length;
    },
    onSuccess: (count) => {
      toast({ title: `${count} ta dars jadvalga qo'shildi` });
      onDone();
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e?.message ?? e?.response?.data?.message ?? 'Xato' }),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
        Bir necha namunaviy dars qo'shing. Keyinroq to'liq jadval tuzishingiz mumkin.
      </p>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {entries.map((e, i) => (
          <div key={i} className="grid grid-cols-6 gap-1.5 items-center">
            <select
              className="col-span-2 h-8 rounded-md border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-950 px-2 text-xs"
              value={e.dayOfWeek}
              onChange={ev => setEntries(p => p.map((r, j) => j === i ? { ...r, dayOfWeek: ev.target.value as DayOfWeek } : r))}
            >
              {DAYS_UZ.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <select
              className="col-span-2 h-8 rounded-md border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-950 px-2 text-xs"
              value={e.classId}
              onChange={ev => setEntries(p => p.map((r, j) => j === i ? { ...r, classId: ev.target.value } : r))}
            >
              <option value="">Sinf</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select
              className="col-span-1 h-8 rounded-md border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-950 px-2 text-xs"
              value={e.subjectId}
              onChange={ev => setEntries(p => p.map((r, j) => j === i ? { ...r, subjectId: ev.target.value } : r))}
            >
              <option value="">Fan</option>
              {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button
              variant="ghost" size="icon"
              className="h-8 w-8 text-xedu-ruby hover:text-xedu-ruby hover:bg-xedu-ruby/5"
              onClick={() => removeEntry(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={addEntry} className="w-full">
        <Plus className="mr-1.5 h-3.5 w-3.5" /> Dars qo'shish
      </Button>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="flex-1"
          onClick={onDone}
        >
          O'tkazib yuborish
        </Button>
        <Button
          className="flex-1"
          onClick={() => addMut.mutate()}
          disabled={addMut.isPending}
        >
          {addMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Saqlash va yakunlash
        </Button>
      </div>
    </div>
  );
}

// ── Completion screen ──────────────────────────────────────────────────────────
function CompletionScreen({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div className="text-center space-y-5 py-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-xedu-primary-light/60 dark:bg-xedu-primary/15 flex items-center justify-center">
        <Rocket className="h-10 w-10 text-xedu-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Maktabingiz tayyor</h2>
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400 mt-1">Barcha asosiy sozlamalar muvaffaqiyatli amalga oshirildi.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-sm">
        {[
          { label: 'Sinflar', href: '/dashboard/classes', icon: GraduationCap },
          { label: 'Foydalanuvchilar', href: '/dashboard/users', icon: Users },
          { label: 'Dars jadvali', href: '/dashboard/schedule', icon: Calendar },
          { label: 'Hisobotlar', href: '/dashboard/reports', icon: BookOpen },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 p-3 hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800/60 transition-colors"
          >
            <Icon className="h-5 w-5 text-xedu-primary" />
            <span className="font-medium">{label}</span>
          </Link>
        ))}
      </div>
      <Button size="lg" className="w-full max-w-sm mx-auto" onClick={onGoToDashboard}>
        Bosh sahifaga o'tish
      </Button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  // Restore progress from backend on mount
  const { data: onboardingStatus } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: systemConfigApi.getOnboardingStatus,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (onboardingStatus) {
      const backendStep = onboardingStatus.onboardingStep || 1;
      setStep(Math.min(backendStep, STEPS.length));
      const completedSteps = Array.from({ length: backendStep - 1 }, (_, i) => i + 1);
      setCompleted(completedSteps);
      if (onboardingStatus.onboardingCompleted) {
        setDone(true);
      }
    }
  }, [onboardingStatus]);

  const updateOnboarding = useMutation({
    mutationFn: systemConfigApi.updateOnboardingStatus,
  });

  const markDone = (s: number) => {
    const nextCompleted = Array.from(new Set([...completed, s]));
    setCompleted(nextCompleted);
    const nextStep = s < STEPS.length ? s + 1 : s;
    setStep(nextStep);
    updateOnboarding.mutate({ onboardingStep: nextStep });
    if (s >= STEPS.length) {
      setDone(true);
      updateOnboarding.mutate({ onboardingStep: STEPS.length, onboardingCompleted: true });
    }
  };

  const progress = ((completed.length) / STEPS.length) * 100;

  if (done) {
    return (
      <div className="max-w-lg mx-auto pt-8">
        <CompletionScreen onGoToDashboard={() => router.push('/dashboard')} />
      </div>
    );
  }

  const currentStep = STEPS.find(s => s.id === step)!;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Maktabni sozlash</h1>
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400 text-sm">
          {currentStep.label}: {currentStep.desc}
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} completed={completed} />

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
          <span>Qadam {completed.length} / {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step content */}
      <Card className="border-xedu-slate-100 dark:border-xedu-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-xedu-primary/10">
              {(() => { const Icon = currentStep.icon; return <Icon className="h-5 w-5 text-xedu-primary" />; })()}
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{currentStep.label}</CardTitle>
              <CardDescription className="text-xs">{currentStep.desc}</CardDescription>
            </div>
            <Badge variant="outline" className="ml-auto text-xs">
              {step} / {STEPS.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <Step1SchoolInfo user={user} />
              <Button className="w-full" onClick={() => markDone(1)}>
                Davom etish <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          )}
          {step === 2 && <Step2Classes onDone={(ids) => markDone(2)} />}
          {step === 3 && <Step3Subjects onDone={() => markDone(3)} />}
          {step === 4 && <Step4Teachers onDone={() => markDone(4)} />}
          {step === 5 && <Step5Schedule onDone={() => markDone(5)} />}
        </CardContent>
      </Card>

      {/* Navigation */}
      {step > 1 && (
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)}>
            <ChevronLeft className="mr-1.5 h-4 w-4" /> Orqaga
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
            Keyinroq sozlash
          </Button>
        </div>
      )}
    </div>
  );
}
