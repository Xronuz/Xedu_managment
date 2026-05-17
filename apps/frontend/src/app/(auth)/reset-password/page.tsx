'use client';

import { useState, Suspense } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  KeyRound, Eye, EyeOff, Loader2, CheckCircle2,
  ArrowLeft, ShieldCheck, AlertTriangle, XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { AuthShell } from '../_components/auth-shell';
import { cn } from '@/lib/utils';

// ── Password strength indicator (rules-based) ─────────────────────────────────
interface StrengthResult {
  score: number; // 0–4
  label: string;
  checks: { label: string; pass: boolean }[];
}

function checkPasswordStrength(password: string): StrengthResult {
  const checks = [
    { label: "Kamida 8 ta belgi", pass: password.length >= 8 },
    { label: "Kamida 1 ta katta harf", pass: /[A-Z]/.test(password) },
    { label: "Kamida 1 ta raqam", pass: /\d/.test(password) },
    { label: "Kamida 1 ta maxsus belgi", pass: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/;'`~]/.test(password) },
  ];
  const passed = checks.filter((c) => c.pass).length;
  const labels = ['Juda zaif', 'Zaif', 'O‘rtacha', 'Yaxshi', 'Kuchli'];
  return {
    score: passed,
    label: labels[passed],
    checks,
  };
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const { score, label, checks } = checkPasswordStrength(password);
  const colors = [
    'bg-xedu-slate-200',
    'bg-xedu-ruby',
    'bg-xedu-amber',
    'bg-xedu-primary',
    'bg-xedu-primary',
  ];
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((l) => (
          <div
            key={l}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-[var(--xedu-duration)]',
              l <= score ? colors[score] : 'bg-xedu-slate-100 dark:bg-xedu-slate-800'
            )}
          />
        ))}
      </div>
      <p
        className={cn(
          'text-xs font-medium',
          score <= 1 ? 'text-xedu-ruby' : score <= 2 ? 'text-xedu-amber' : 'text-xedu-primary'
        )}
      >
        {label}
      </p>
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-1.5 text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400">
            {c.pass ? (
              <CheckCircle2 className="h-3 w-3 text-xedu-primary shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-xedu-slate-300 dark:text-xedu-slate-600 shrink-0" />
            )}
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Inner component (uses useSearchParams inside Suspense) ────────────────────
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => authApi.resetPassword(token, password),
    onSuccess: () => {
      setDone(true);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setErrors({ api: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const strength = checkPasswordStrength(password);
    if (strength.score < 2) e.password = "Parol yetarli darajada kuchli emas";
    if (password !== confirm) e.confirm = "Parollar mos kelmadi";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) { setErrors({ api: "Havola noto'g'ri yoki muddati o'tgan. Iltimos, qayta so'rang." }); return; }
    if (!validate()) return;
    mutation.mutate();
  };

  if (!token) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-xedu-ruby/10">
          <KeyRound className="h-7 w-7 text-xedu-ruby" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-sm">Havola noto'g'ri</p>
          <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
            Parol tiklash havolasi noto'g'ri yoki muddati o'tgan.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-sm text-xedu-primary hover:underline font-medium"
        >
          Yangi havola so'rash
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-5 py-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-xedu-primary-light/60 dark:bg-xedu-primary/15">
          <CheckCircle2 className="h-8 w-8 text-xedu-primary" />
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold text-sm">Parol muvaffaqiyatli yangilandi</p>
          <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
            Endi yangi parolingiz bilan tizimga kirishingiz mumkin.
          </p>
        </div>
        <Button
          className="w-full h-11 font-semibold"
          onClick={() => router.replace('/login?reason=password_changed')}
          size="lg"
        >
          Tizimga kirish
          <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* New password */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium">
          Yangi parol
        </Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-xedu-slate-400" />
          <Input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoFocus
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((p) => { const n = { ...p }; delete n.password; delete n.api; return n; });
            }}
            placeholder="Kamida 8 ta belgi"
            className="h-11 pl-10 pr-10"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xedu-slate-400 hover:text-xedu-slate-600 dark:hover:text-xedu-slate-200 transition-colors"
            aria-label={showPw ? "Parolni yashirish" : "Parolni ko'rsatish"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <PasswordStrength password={password} />
        {errors.password && (
          <p className="text-xs text-xedu-ruby flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {errors.password}
          </p>
        )}
      </div>

      {/* Confirm password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirm" className="text-sm font-medium">
          Parolni tasdiqlang
        </Label>
        <div className="relative">
          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-xedu-slate-400" />
          <Input
            id="confirm"
            type={showCf ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErrors((p) => { const n = { ...p }; delete n.confirm; return n; });
            }}
            placeholder="Parolni takrorlang"
            className={cn(
              'h-11 pl-10 pr-10',
              confirm && password === confirm && password.length > 0
                ? 'border-xedu-primary focus-visible:ring-xedu-primary/30'
                : ''
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowCf((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xedu-slate-400 hover:text-xedu-slate-600 dark:hover:text-xedu-slate-200 transition-colors"
            aria-label={showCf ? "Parolni yashirish" : "Parolni ko'rsatish"}
          >
            {showCf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {confirm && password === confirm && password.length > 0 && (
          <p className="text-xs text-xedu-primary flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Parollar mos keldi
          </p>
        )}
        {errors.confirm && (
          <p className="text-xs text-xedu-ruby flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {errors.confirm}
          </p>
        )}
      </div>

      {errors.api && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-xedu-ruby/20 bg-xedu-ruby/8 px-3.5 py-3 text-sm text-xedu-ruby"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {errors.api}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-11 font-semibold"
        disabled={mutation.isPending}
        size="lg"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saqlanmoqda...
          </>
        ) : (
          <>
            <ShieldCheck className="mr-2 h-4 w-4" />
            Parolni yangilash
          </>
        )}
      </Button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Card className="border-xedu-slate-100 dark:border-xedu-slate-800 shadow-sm">
        <CardHeader className="pb-4 space-y-1">
          <CardTitle className="text-lg font-bold tracking-tight">Yangi parol o'rnatish</CardTitle>
          <CardDescription className="text-sm">
            Hisob xavfsizligi uchun kuchli parol tanlang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="text-center text-xedu-slate-500 dark:text-xedu-slate-400 text-sm py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                Yuklanmoqda...
              </div>
            }
          >
            <ResetPasswordForm />
          </Suspense>

          <div className="text-center mt-5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-200 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Kirish sahifasiga qaytish
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
