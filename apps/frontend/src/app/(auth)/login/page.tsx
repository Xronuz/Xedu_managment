'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/auth';
import { ROLE_HOME, type UserRole } from '@/config/permissions';
import { AuthShell } from '../_components/auth-shell';

const loginSchema = z.object({
  email: z.string().email("Email noto'g'ri formatda"),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});

type LoginForm = z.infer<typeof loginSchema>;

type ContextBanner = {
  variant: 'error' | 'success' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  message: string;
};

function getContextBanner(reason: string | null): ContextBanner | null {
  switch (reason) {
    case 'session_expired':
      return {
        variant: 'warning',
        icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
        title: 'Sessiya tugadi',
        message: 'Xavfsizlik maqsadida tizimdan avtomatik chiqdingiz. Iltimos, qayta kiring.',
      };
    case 'logged_out':
      return {
        variant: 'success',
        icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
        title: 'Tizimdan chiqdingiz',
        message: 'Hisobingizdan muvaffaqiyatli chiqdingiz.',
      };
    case 'password_changed':
      return {
        variant: 'success',
        icon: <CheckCircle2 className="h-4 w-4 shrink-0" />,
        title: 'Parol yangilandi',
        message: 'Yangi parolingiz bilan tizimga kirishingiz mumkin.',
      };
    case 'unauthorized':
      return {
        variant: 'error',
        icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
        title: 'Ruxsat yo‘q',
        message: 'Bu sahifani ko‘rish uchun sizda yetarli huquq yo‘q.',
      };
    default:
      return null;
  }
}

const bannerStyles: Record<ContextBanner['variant'], string> = {
  error:   'border-xedu-ruby/20 bg-xedu-ruby/8 text-xedu-ruby',
  success: 'border-xedu-primary/20 bg-xedu-primary-light/40 text-xedu-primary',
  warning: 'border-xedu-amber/20 bg-xedu-amber/10 text-xedu-amber',
  info:    'border-xedu-sky/20 bg-xedu-sky/10 text-xedu-sky',
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const banner = getContextBanner(reason);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  // Auto-focus email field on mount
  useEffect(() => {
    const el = document.getElementById('email') as HTMLInputElement | null;
    el?.focus();
  }, []);

  const onSubmit = useCallback(async (data: LoginForm) => {
    setLoginError('');
    try {
      const result = await authApi.login(data);
      setAuth(result.user, result.tokens);
      setIsRedirecting(true);
      // Birinchi kirish majburiyatini tekshirish
      if (result.user.isFirstLogin) {
        router.replace('/first-login');
      } else {
        const home = ROLE_HOME[result.user.role as UserRole] ?? '/dashboard';
        router.replace(home);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Tizimga kirishda xato yuz berdi";
      setLoginError(typeof msg === 'string' ? msg : "Email yoki parol noto'g'ri");
    }
  }, [router, setAuth]);

  return (
    <AuthShell>
      <Card className="border-xedu-slate-100 dark:border-xedu-slate-800 shadow-sm">
        <CardHeader className="pb-4 space-y-1">
          <CardTitle className="text-lg font-bold tracking-tight">Tizimga kirish</CardTitle>
          <CardDescription className="text-sm">
            Hisobingiz ma'lumotlarini kiriting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Contextual banner */}
            {banner && (
              <div
                role="alert"
                className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${bannerStyles[banner.variant]}`}
              >
                {banner.icon}
                <div className="min-w-0">
                  <p className="font-medium">{banner.title}</p>
                  <p className="text-xs opacity-90 mt-0.5">{banner.message}</p>
                </div>
              </div>
            )}

            {/* Login error */}
            {loginError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-xedu-ruby/20 bg-xedu-ruby/8 px-3.5 py-3 text-sm text-xedu-ruby"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="siz@maktab.uz"
                autoComplete="email"
                className="h-11"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-xedu-ruby mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Parol</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xedu-slate-400 hover:text-xedu-slate-600 dark:hover:text-xedu-slate-200 transition-colors"
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-xedu-ruby mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-xedu-primary transition-colors"
              >
                Parolni unutdingizmi?
              </a>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={isSubmitting || isRedirecting}
              size="lg"
            >
              {isSubmitting || isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kirish...
                </>
              ) : (
                <>
                  Kirish
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
