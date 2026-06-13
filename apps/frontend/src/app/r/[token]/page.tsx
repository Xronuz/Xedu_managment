'use client';

/**
 * Public lead-capture forma — maktab Instagram/Telegram/Facebook targetda
 * ulashadigan ro'yxatdan o'tish sahifasi. Autentifikatsiya talab qilmaydi.
 * ?src= parametri lead manbasini avtomatik belgilaydi.
 */

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, GraduationCap } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

interface FormInfo {
  schoolName: string;
  logoUrl?: string | null;
  branches: { id: string; name: string }[];
}

export default function PublicLeadFormPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-xedu-primary" />
        </div>
      }
    >
      <PublicLeadFormInner />
    </Suspense>
  );
}

function PublicLeadFormInner() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const src = searchParams.get('src') ?? 'WEBSITE';

  const [info, setInfo] = useState<FormInfo | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', branchId: '', note: '', website: '' });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/public/lead-form/${token}`)
      .then(async (r) => {
        if (!r.ok) throw new Error();
        const body = await r.json();
        setInfo(body.data ?? body);
      })
      .catch(() => setLoadError(true));
  }, [token]);

  const set = (k: string) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`${API_BASE}/public/lead-form/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          phone: form.phone,
          branchId: form.branchId || undefined,
          note: form.note || undefined,
          source: src.toUpperCase(),
          website: form.website, // honeypot
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        const msg = body?.message;
        throw new Error(Array.isArray(msg) ? msg[0] : msg || "Yuborishda xatolik — qayta urinib ko'ring");
      }
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-xedu-border bg-xedu-bg-panel px-3.5 py-2.5 text-[15px] ' +
    'focus:outline-none focus:ring-2 focus:ring-xedu-primary/30 focus:border-xedu-primary/50 transition-shadow';

  return (
    <div className="landing-root min-h-screen bg-xedu-bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {loadError ? (
          <div className="rounded-2xl border border-xedu-border bg-xedu-bg-panel p-8 text-center shadow-md">
            <p className="text-lg font-bold">Forma topilmadi</p>
            <p className="text-sm text-xedu-slate-500 mt-2">
              Link eskirgan yoki noto&apos;g&apos;ri bo&apos;lishi mumkin. Maktab bilan bog&apos;laning.
            </p>
          </div>
        ) : !info ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-xedu-primary" />
          </div>
        ) : done ? (
          <div className="rounded-2xl border border-xedu-border bg-xedu-bg-panel p-8 text-center shadow-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-xedu-emerald-100">
              <CheckCircle2 className="h-7 w-7 text-xedu-primary" />
            </div>
            <p className="text-xl font-bold">Rahmat!</p>
            <p className="text-sm text-xedu-slate-500 mt-2">
              So&apos;rovingiz <b>{info.schoolName}</b>ga yetib bordi. Tez orada siz bilan bog&apos;lanamiz.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-xedu-border bg-xedu-bg-panel p-6 sm:p-8 shadow-md">
            {/* Sarlavha */}
            <div className="mb-6 text-center">
              {info.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={info.logoUrl} alt={info.schoolName} className="mx-auto mb-3 h-12 w-12 rounded-xl object-contain" />
              ) : (
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-xedu-primary/10">
                  <GraduationCap className="h-6 w-6 text-xedu-primary" />
                </div>
              )}
              <h1 className="text-xl font-bold tracking-tight">{info.schoolName}</h1>
              <p className="text-sm text-xedu-slate-500 mt-1">
                Ro&apos;yxatdan o&apos;ting — biz siz bilan bog&apos;lanamiz
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={inputCls}
                  placeholder="Ismingiz *"
                  value={form.firstName}
                  onChange={(e) => set('firstName')(e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder="Familiyangiz *"
                  value={form.lastName}
                  onChange={(e) => set('lastName')(e.target.value)}
                />
              </div>
              <input
                className={inputCls}
                placeholder="Telefon raqamingiz * (+998 ...)"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => set('phone')(e.target.value)}
              />
              {info.branches.length > 1 && (
                <select
                  className={inputCls}
                  value={form.branchId}
                  onChange={(e) => set('branchId')(e.target.value)}
                >
                  <option value="">Filialni tanlang (ixtiyoriy)</option>
                  {info.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              )}
              <textarea
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="Savolingiz yoki izoh (ixtiyoriy)"
                value={form.note}
                onChange={(e) => set('note')(e.target.value)}
              />
              {/* Honeypot — odam uchun ko'rinmas */}
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={(e) => set('website')(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              {error && <p className="text-sm text-xedu-ruby-600">{error}</p>}

              <button
                onClick={submit}
                disabled={submitting || !form.firstName.trim() || !form.lastName.trim() || form.phone.trim().length < 7}
                className="w-full rounded-xl bg-xedu-primary py-3 text-[15px] font-semibold text-white transition-colors hover:bg-xedu-primary-hover disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Yuborish
              </button>

              <p className="text-center text-[11px] text-xedu-slate-500">
                Ma&apos;lumotlaringiz faqat siz bilan bog&apos;lanish uchun ishlatiladi
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
