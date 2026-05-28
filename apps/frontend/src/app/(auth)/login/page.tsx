'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2,
  ArrowRight, LogIn,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        title: 'Ruxsat yo\'q',
        message: 'Bu sahifani ko\'rish uchun sizda yetarli huquq yo\'q.',
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
  const router       = useRouter();
  const searchParams = useSearchParams();
  const reason       = searchParams.get('reason');
  const setAuth      = useAuthStore((s) => s.setAuth);

  const [showPassword,  setShowPassword]  = useState(false);
  const [loginError,    setLoginError]    = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const banner = getContextBanner(reason);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

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
      {/* card — ModuleItem uslubida */}
      <div className="group relative overflow-hidden card-glass-module" style={{ padding: '1.75rem', borderRadius: '1.25rem' }}>

        {/* header row */}
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display text-xs font-semibold text-leaf-deep">Xedu</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-[#252E28] dark:text-[#252E28]">Tizimga kirish</h2>
            <p className="mt-1 text-xs text-[#252E28]/60 dark:text-[#252E28]/60">Hisobingiz ma&apos;lumotlarini kiriting</p>
          </div>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-leaf/20 text-leaf-deep">
            <LogIn className="h-4 w-4" />
          </div>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">

          {/* contextual banner */}
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

          {/* login error */}
          {loginError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-xedu-ruby/20 bg-xedu-ruby/8 px-3.5 py-3 text-sm text-xedu-ruby"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          {/* email */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-[#252E28]/80 dark:text-[#252E28]/80">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="siz@maktab.uz"
              autoComplete="email"
              className="h-11 bg-white/60 border-white/80 dark:bg-white/60 dark:border-white/80 dark:text-[#252E28] dark:placeholder:text-[#252E28]/40 dark:hover:border-white focus:border-leaf/40 focus:ring-leaf/20"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-xedu-ruby mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* password */}
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-[#252E28]/80 dark:text-[#252E28]/80">Parol</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-11 pr-10 bg-white/60 border-white/80 dark:bg-white/60 dark:border-white/80 dark:text-[#252E28] dark:placeholder:text-[#252E28]/40 dark:hover:border-white focus:border-leaf/40 focus:ring-leaf/20"
                {...register('password')}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground/70 transition-colors"
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-xedu-ruby mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* forgot password */}
          <div className="flex justify-end">
            <a
              href="/forgot-password"
              className="text-xs text-[#252E28]/45 dark:text-[#252E28]/45 hover:text-leaf-deep transition-colors"
            >
              Parolni unutdingizmi?
            </a>
          </div>

          {/* submit */}
          <button
            type="submit"
            disabled={isSubmitting || isRedirecting}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-leaf text-primary-foreground font-semibold text-sm shadow-glow transition hover:bg-leaf-deep disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting || isRedirecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Kirish...
              </>
            ) : (
              <>
                Kirish
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* decorative blur — ModuleItem uslubida */}
        <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-leaf/20 blur-2xl transition group-hover:bg-leaf/35" />
      </div>
    </AuthShell>
  );
}
