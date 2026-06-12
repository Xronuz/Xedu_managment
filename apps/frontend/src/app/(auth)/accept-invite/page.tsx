'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Mail, Loader2, AlertTriangle, CheckCircle2, ShieldCheck,
  Eye, EyeOff, ArrowRight, Clock, XCircle, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { invitationsApi, type ValidateTokenResult } from '@/lib/api/invitations';
import { AuthShell } from '../_components/auth-shell';
import { cn } from '@/lib/utils';

// ── Password strength (same as reset-password) ─────────────────────────────────
interface StrengthResult {
  score: number;
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

// ── Inner component (uses useSearchParams) ─────────────────────────────────────
function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [validation, setValidation] = useState<ValidateTokenResult | null>(null);
  const [validating, setValidating] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }
    invitationsApi.validateToken(token)
      .then((res) => setValidation(res))
      .catch(() => setValidation({ valid: false, reason: 'invalid' }))
      .finally(() => setValidating(false));
  }, [token]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const strength = checkPasswordStrength(password);
    if (strength.score < 2) e.password = "Parol yetarli darajada kuchli emas";
    if (password !== confirm) e.confirm = "Parollar mos kelmadi";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await invitationsApi.accept({ token, password });
      setDone(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Taklifni qabul qilishda xatolik yuz berdi";
      setErrors({ api: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="text-center py-8 space-y-3">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-xedu-slate-400" />
        <p className="text-sm text-xedu-slate-500">Taklif tekshirilmoqda...</p>
      </div>
    );
  }

  if (!token) {
    return <InvalidState reason="missing" />;
  }

  if (!validation?.valid) {
    return <InvalidState reason={validation?.reason ?? 'invalid'} />;
  }

  if (done) {
    return (
      <div className="text-center py-4 space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-xedu-primary-light/60 dark:bg-xedu-primary/15">
          <CheckCircle2 className="h-8 w-8 text-xedu-primary" />
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold text-sm">Hisob faollashtirildi</p>
          <p className="text-sm text-xedu-slate-500">
            Endi tizimga kirishingiz mumkin.
          </p>
        </div>
        <Button className="w-full h-11 font-semibold" size="lg" onClick={() => window.location.href = '/login'}>
          Tizimga kirish
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  const inv = validation.invitation!;

  return (
    <div className="space-y-4">
      {/* Invitation context */}
      <div className="rounded-xl border border-xedu-slate-100 dark:border-xedu-slate-800 bg-xedu-slate-50/50 dark:bg-xedu-slate-800/40 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-xedu-primary shrink-0" />
          <span className="font-medium">{inv.email}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-xedu-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span>Rol: {inv.role}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-xedu-slate-500">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Muddati: {new Date(inv.expiresAt).toLocaleDateString('uz-UZ')}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">Yangi parol</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoFocus
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => { const n = { ...p }; delete n.password; delete n.api; return n; }); }}
              placeholder="Kamida 8 ta belgi"
              className="h-11 pr-10"
            />
            <button type="button" tabIndex={-1} onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xedu-slate-400 hover:text-xedu-slate-600 transition-colors" aria-label={showPw ? "Parolni yashirish" : "Parolni ko'rsatish"}>
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
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
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saqlanmoqda...</> : <><ShieldCheck className="mr-2 h-4 w-4" />Hisobni faollashtirish</>}
        </Button>
      </form>
    </div>
  );
}

// ── Invalid states ─────────────────────────────────────────────────────────────
function InvalidState({ reason }: { reason: 'missing' | 'invalid' | 'expired' | 'accepted' | 'revoked' }) {
  const config: Record<string, { icon: React.ReactNode; title: string; desc: string; action?: React.ReactNode }> = {
    missing: {
      icon: <XCircle className="h-7 w-7 text-xedu-ruby" />,
      title: "Taklif havolasi topilmadi",
      desc: "Hisob faollashtirish uchun to'g'ri havola kerak. Administratoringizga murojaat qiling.",
    },
    invalid: {
      icon: <XCircle className="h-7 w-7 text-xedu-ruby" />,
      title: "Taklif havolasi noto'g'ri",
      desc: "Bu havola yaroqsiz yoki noto'g'ri formatda. Iltimos, administratoringizdan yangi taklif so'rang.",
    },
    expired: {
      icon: <Clock className="h-7 w-7 text-xedu-amber" />,
      title: "Taklif muddati o'tgan",
      desc: "Bu taklifning amal qilish muddati tugagan. Administratoringizdan taklifni qayta yuborishni so'rang.",
    },
    accepted: {
      icon: <CheckCircle2 className="h-7 w-7 text-xedu-primary" />,
      title: "Taklif allaqachon qabul qilingan",
      desc: "Bu taklif oldinroq qabul qilingan. Tizimga kirish sahifasidan kiring.",
      action: (
        <Button className="w-full h-11 font-semibold mt-4" size="lg" onClick={() => window.location.href = '/login'}>
          Tizimga kirish <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    revoked: {
      icon: <XCircle className="h-7 w-7 text-xedu-ruby" />,
      title: "Taklif bekor qilingan",
      desc: "Bu taklif administrator tomonidan bekor qilingan. Yangi taklif so'rash uchun administratoringizga murojaat qiling.",
    },
  };

  const c = config[reason] ?? config.invalid;

  return (
    <div className="text-center py-4 space-y-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800">
        {c.icon}
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-sm">{c.title}</p>
        <p className="text-sm text-xedu-slate-500">{c.desc}</p>
      </div>
      {c.action}
      {!c.action && (
        <Button variant="outline" className="w-full h-11" size="lg" onClick={() => window.location.href = '/login'}>
          Kirish sahifasiga qaytish
        </Button>
      )}
    </div>
  );
}

// ── Page wrapper ───────────────────────────────────────────────────────────────
export default function AcceptInvitePage() {
  return (
    <AuthShell>
      <Card className="border-xedu-slate-100 dark:border-xedu-slate-800 shadow-sm">
        <CardHeader className="pb-4 space-y-1">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-xedu-primary" />
            <CardTitle className="text-lg font-bold tracking-tight">Taklifni qabul qilish</CardTitle>
          </div>
          <CardDescription className="text-sm">Xedu platformasiga xush kelibsiz. Hisobingizni faollashtirish uchun parol o'rnatishni davom ettiring.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="text-center py-8 text-xedu-slate-500 text-sm">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Yuklanmoqda...
            </div>
          }>
            <AcceptInviteForm />
          </Suspense>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
