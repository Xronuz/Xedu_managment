'use client';

import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

/**
 * Impersonation banner — super admin maktab rahbari sifatida kirganda
 * sahifa tepasida doimiy ogohlantirish ko'rsatadi. "Chiqish" to'liq logout
 * qiladi (impersonation sessiyasida refresh token yo'q — qaytish = qayta login).
 */
export function ImpersonationBanner() {
  const impersonation = useAuthStore((s) => s.impersonation);
  const logout = useAuthStore((s) => s.logout);

  if (!impersonation) return null;

  const handleExit = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <div className="flex items-center justify-between gap-3 bg-amber-500/95 px-4 py-2 text-amber-950">
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <p className="text-[13px] font-semibold truncate">
          Diqqat: Siz <span className="font-bold">{impersonation.schoolName}</span> maktabi
          foydalanuvchisi sifatida ishlayapsiz — sessiya vaqtinchalik (30 daqiqa).
        </p>
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 rounded-lg bg-amber-950/90 px-3 py-1 text-[12px] font-bold text-amber-50 hover:bg-amber-950 transition-colors shrink-0"
      >
        <LogOut className="h-3.5 w-3.5" />
        Chiqish
      </button>
    </div>
  );
}
