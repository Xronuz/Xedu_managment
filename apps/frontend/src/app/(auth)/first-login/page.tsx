'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Eye, EyeOff, Loader2, CheckCircle2, ArrowRight,
  AlertTriangle, XCircle, KeyRound, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { AuthShell } from '../_components/auth-shell';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════════
// FIRST-LOGIN / FORCED PASSWORD CHANGE PAGE
// ═══════════════════════════════════════════════════════════════════════════════
// Enforced by middleware.ts via JWT `isFirstLogin` flag.
// After successful password change, backend issues new token with isFirstLogin=false.
// ═══════════════════════════════════════════════════════════════════════════════

function checkPasswordStrength(password: string) {
  const checks = [
    { label: "Kamida 8 ta belgi", pass: password.length >= 8 },
    { label: "Kamida 1 ta katta harf", pass: /[A-Z]/.test(password) },
    { label: "Kamida 1 ta raqam", pass: /\d/.test(password) },
    { label: "Kamida 1 ta maxsus belgi", pass: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/;'`~]/.test(password) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  const labels = ['Juda zaif', 'Zaif', 'O\'rtacha', 'Yaxshi', 'Kuchli'];
  return { score: passed, label: labels[passed], checks };
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, checks } = checkPasswordStrength(password);
  const colors = ['bg-xedu-slate-200', 'bg-xedu-ruby', 'bg-xedu-amber', 'bg-xedu-primary', 'bg-xedu-primary'];
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((l) => (
          <div key={l} className={cn('h-1 flex-1 rounded-full transition-colors', l <= score ? colors[score] : 'bg-xedu-slate-100 dark:bg-xedu-slate-800')} />
        ))}
      </div>
      <p className={cn('text-xs font-medium', score <= 1 ? 'text-xedu-ruby' : score <= 2 ? 'text-xedu-amber' : 'text-xedu-primary')}>{label}</p>
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5 text-[11px] text-xedu-slate-500">
            {c.pass ? <CheckCircle2 className="h-3 w-3 text-xedu-primary shrink-0" /> : <XCircle className="h-3 w-3 text-xedu-slate-300 shrink-0" />}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function FirstLoginPage() {
  const router = useRouter();
  const { user, setAuth } = useAuthStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // First-login enforcement is handled by middleware.ts via JWT isFirstLogin flag

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const strength = checkPasswordStrength(password);
    if (strength.score < 2) e.password = "Parol yetarli darajada kuchli emas";
    if (password !== confirm) e.confirm = "Parollar mos kelmadi";
    if (!currentPassword.trim()) e.current = "Joriy parol kiritilishi shart";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const result = await authApi.firstLogin({ currentPassword, newPassword: password });
      // Auth store'dagi tokenlarni va user holatini yangilash
      // isFirstLogin=false qilish kerak — keyingi API chaqiruvlari
      // Authorization header'da yangi token bilan ketadi
      if (user) {
        setAuth({ ...user, isFirstLogin: false }, result.tokens);
      }
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Parolni o'zgartirishda xatolik yuz berdi";
      setErrors({ api: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthShell>
        <Card className="border-xedu-slate-100 dark:border-xedu-slate-800 shadow-sm">
          <CardContent className="text-center py-8 space-y-5">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-xedu-primary-light/60 dark:bg-xedu-primary/15">
              <CheckCircle2 className="h-8 w-8 text-xedu-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-sm">Parol muvaffaqiyatli yangilandi</p>
              <p className="text-sm text-xedu-slate-500">Hisobingiz xavfsizligi ta'minlandi. Endi tizimga kirishingiz mumkin.</p>
            </div>
            <Button className="w-full h-11 font-semibold" size="lg" onClick={() => router.replace('/dashboard')}>
              Bosh sahifaga o'tish
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="border-xedu-slate-100 dark:border-xedu-slate-800 shadow-sm">
        <CardHeader className="pb-4 space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-xedu-primary" />
            <CardTitle className="text-lg font-bold tracking-tight">Xavfsizlikni ta'minlash</CardTitle>
          </div>
          <CardDescription className="text-sm">
            Birinchi kirishda xavfsizlik maqsadida yangi parol o'rnatish tavsiya etiladi. Bu hisobingizni himoya qiladi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current password */}
            <div className="space-y-1.5">
              <Label htmlFor="current" className="text-sm font-medium">Joriy parol</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-xedu-slate-400" />
                <Input
                  id="current"
                  type={showPw ? 'text' : 'password'}
                  autoFocus
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setErrors((p) => { const n = { ...p }; delete n.current; delete n.api; return n; }); }}
                  placeholder="Admin tomonidan berilgan parol"
                  className="h-11 pl-10 pr-10"
                />
                <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xedu-slate-400 hover:text-xedu-slate-600 transition-colors" aria-label={showPw ? "Parolni yashirish" : "Parolni ko'rsatish"}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.current && <p className="text-xs text-xedu-ruby flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.current}</p>}
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Yangi parol</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors((p) => { const n = { ...p }; delete n.password; return n; }); }}
                  placeholder="Kamida 8 ta belgi"
                  className="h-11 pr-10"
                />
              </div>
              <PasswordStrength password={password} />
              {errors.password && <p className="text-xs text-xedu-ruby flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.password}</p>}
            </div>

            {/* Confirm */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-sm font-medium">Parolni tasdiqlang</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showCf ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setErrors((p) => { const n = { ...p }; delete n.confirm; return n; }); }}
                  placeholder="Parolni takrorlang"
                  className={cn('h-11 pr-10', confirm && password === confirm && password.length > 0 ? 'border-xedu-primary focus-visible:ring-xedu-primary/30' : '')}
                />
                <button type="button" tabIndex={-1} onClick={() => setShowCf((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xedu-slate-400 hover:text-xedu-slate-600 transition-colors" aria-label={showCf ? "Parolni yashirish" : "Parolni ko'rsatish"}>
                  {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirm && password === confirm && password.length > 0 && (
                <p className="text-xs text-xedu-primary flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Parollar mos keldi</p>
              )}
              {errors.confirm && <p className="text-xs text-xedu-ruby flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{errors.confirm}</p>}
            </div>

            {errors.api && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-xedu-ruby/20 bg-xedu-ruby/8 px-3.5 py-3 text-sm text-xedu-ruby">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{errors.api}
              </div>
            )}

            <Button type="submit" className="w-full h-11 font-semibold" disabled={submitting} size="lg">
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saqlanmoqda...</> : <><ShieldCheck className="mr-2 h-4 w-4" />Parolni yangilash</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
