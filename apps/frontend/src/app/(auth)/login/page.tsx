'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Eye, EyeOff, Loader2, AlertTriangle, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth.store';
import { authApi } from '@/lib/api/auth';
import { ROLE_HOME, type UserRole } from '@/config/permissions';
import { AuthShell } from '../_components/auth-shell';

const loginSchema = z.object({
  email:    z.string().email("Email noto'g'ri formatda"),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});
type LoginForm = z.infer<typeof loginSchema>;

type Banner = { variant: 'error' | 'success' | 'warning'; icon: React.ReactNode; title: string; message: string };

function getContextBanner(reason: string | null): Banner | null {
  switch (reason) {
    case 'session_expired':
      return { variant: 'warning', icon: <AlertTriangle className="h-4 w-4 shrink-0" />, title: 'Sessiya tugadi', message: 'Xavfsizlik maqsadida tizimdan avtomatik chiqdingiz.' };
    case 'logged_out':
      return { variant: 'success', icon: <CheckCircle2 className="h-4 w-4 shrink-0" />, title: 'Chiqish muvaffaqiyatli', message: 'Hisobingizdan muvaffaqiyatli chiqdingiz.' };
    case 'password_changed':
      return { variant: 'success', icon: <CheckCircle2 className="h-4 w-4 shrink-0" />, title: 'Parol yangilandi', message: 'Yangi parolingiz bilan tizimga kiring.' };
    case 'unauthorized':
      return { variant: 'error', icon: <AlertTriangle className="h-4 w-4 shrink-0" />, title: "Ruxsat yo'q", message: 'Bu sahifani ko\'rish uchun sizda yetarli huquq yo\'q.' };
    default:
      return null;
  }
}

const bannerCls: Record<Banner['variant'], string> = {
  error:   'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
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

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    (document.getElementById('email') as HTMLInputElement | null)?.focus();
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
        router.replace(ROLE_HOME[result.user.role as UserRole] ?? '/dashboard');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Tizimga kirishda xato yuz berdi";
      setLoginError(typeof msg === 'string' ? msg : "Email yoki parol noto'g'ri");
    }
  }, [router, setAuth]);

  const busy = isSubmitting || isRedirecting;

  return (
    <AuthShell>
      {/* ── Card ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.60) 100%)',
          backdropFilter: 'blur(24px) saturate(170%)',
          WebkitBackdropFilter: 'blur(24px) saturate(170%)',
          border: '1px solid rgba(255,255,255,0.85)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4), 0 20px 50px -20px rgba(30,69,50,0.28)',
          borderRadius: '1.5rem',
          padding: '2rem',
        }}
      >
        {/* Header */}
        <div className="mb-7">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-xs font-semibold"
            style={{ background: 'rgba(15,123,83,0.10)', color: '#0F7B53' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F7B53] animate-pulse" />
            Xavfsiz kirish
          </div>
          <h2
            className="text-[26px] font-black tracking-tight leading-tight"
            style={{ color: '#1a2e1f', fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: '-0.02em' }}
          >
            Xush kelibsiz
          </h2>
          <p className="text-sm mt-1.5" style={{ color: 'rgba(37,46,40,0.55)' }}>
            Hisobingizga kirish uchun ma'lumotlaringizni kiriting
          </p>
        </div>

        {/* Banners */}
        {banner && (
          <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm mb-5 ${bannerCls[banner.variant]}`}>
            {banner.icon}
            <div>
              <p className="font-semibold text-xs">{banner.title}</p>
              <p className="text-xs opacity-80 mt-0.5">{banner.message}</p>
            </div>
          </div>
        )}
        {loginError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 mb-5">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="text-xs">{loginError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-semibold"
              style={{ color: 'rgba(37,46,40,0.65)' }}
            >
              Email manzil
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="siz@maktab.uz"
              autoComplete="email"
              style={{
                height: '44px',
                background: 'rgba(255,255,255,0.70)',
                border: '1.5px solid rgba(15,123,83,0.15)',
                borderRadius: '0.75rem',
                color: '#1a2e1f',
                fontSize: '0.9rem',
              }}
              className="placeholder:text-[#252E28]/35 focus-visible:ring-2 focus-visible:ring-[#0F7B53]/25 focus-visible:border-[#0F7B53]/40 transition-all"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="password"
                className="text-xs font-semibold"
                style={{ color: 'rgba(37,46,40,0.65)' }}
              >
                Parol
              </Label>
              <a
                href="/forgot-password"
                className="text-xs transition-colors"
                style={{ color: 'rgba(37,46,40,0.40)' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0F7B53')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(37,46,40,0.40)')}
              >
                Parolni unutdingizmi?
              </a>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  height: '44px',
                  background: 'rgba(255,255,255,0.70)',
                  border: '1.5px solid rgba(15,123,83,0.15)',
                  borderRadius: '0.75rem',
                  color: '#1a2e1f',
                  fontSize: '0.9rem',
                  paddingRight: '2.75rem',
                }}
                className="placeholder:text-[#252E28]/35 focus-visible:ring-2 focus-visible:ring-[#0F7B53]/25 focus-visible:border-[#0F7B53]/40 transition-all"
                {...register('password')}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'rgba(37,46,40,0.35)' }}
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 font-bold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            style={{
              height: '46px',
              background: busy ? '#2D7A50' : 'linear-gradient(135deg, #0F7B53 0%, #1a9a6b 100%)',
              color: '#fff',
              borderRadius: '0.875rem',
              boxShadow: busy ? 'none' : '0 4px 16px rgba(15,123,83,0.30)',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => { if (!busy) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {isRedirecting ? 'Yo\'naltirilmoqda...' : 'Kirish...'}
              </>
            ) : (
              <>
                Kirish
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[11px] mt-5" style={{ color: 'rgba(37,46,40,0.32)' }}>
          © {new Date().getFullYear()} Xedu. Barcha huquqlar himoyalangan.
        </p>
      </div>
    </AuthShell>
  );
}
