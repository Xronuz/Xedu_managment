'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, ArrowLeft, Loader2, CheckCircle2, Send, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authApi } from '@/lib/api/auth';
import { AuthShell } from '../_components/auth-shell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const mutation = useMutation({
    mutationFn: () => authApi.forgotPassword(email.trim()),
    onSuccess: () => {
      setSent(true);
      setError('');
      setCooldown(60);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi');
    },
  });

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email manzil kiritilishi shart"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Email manzil noto'g'ri formatda"); return; }
    if (cooldown > 0) return;
    setError('');
    mutation.mutate();
  };

  const handleResend = () => {
    if (cooldown > 0) return;
    mutation.mutate();
  };

  return (
    <AuthShell>
      <Card className="border-xedu-slate-100 dark:border-xedu-slate-800 shadow-sm">
        <CardHeader className="pb-4 space-y-1">
          <CardTitle className="text-lg font-bold tracking-tight">Parolni tiklash</CardTitle>
          <CardDescription className="text-sm">
            Email manzilingizga xavfsiz tiklash havolasi yuboriladi
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            /* ── Success state ── */
            <div className="text-center py-4 space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-xedu-primary-light/60 dark:bg-xedu-primary/15">
                <CheckCircle2 className="h-8 w-8 text-xedu-primary" />
              </div>
              <div className="space-y-1.5">
                <p className="font-semibold text-sm">Xabar yuborildi</p>
                <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">
                  <span className="font-medium text-xedu-slate-700 dark:text-xedu-slate-300">{email}</span>{' '}
                  manziliga parol tiklash havolasi yuborildi. Iltimos, pochta qutingizni tekshiring.
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                  Xabar kelmadimi?{' '}
                  <button
                    type="button"
                    disabled={cooldown > 0 || mutation.isPending}
                    className="text-xedu-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline transition-opacity"
                    onClick={handleResend}
                  >
                    {cooldown > 0 ? `Qayta yuborish (${cooldown}s)` : 'Qayta yuborish'}
                  </button>
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-200 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Kirish sahifasiga qaytish
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form ── */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email manzil
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-xedu-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="siz@maktab.uz"
                    className="h-11 pl-10"
                  />
                </div>
                {error && (
                  <p className="text-xs text-xedu-ruby flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={mutation.isPending}
                size="lg"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Yuborilmoqda...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Tiklash havolasini yuborish
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-slate-700 dark:hover:text-xedu-slate-200 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Kirish sahifasiga qaytish
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
}
