'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, GraduationCap, Loader2, Eye, EyeOff } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { studentsApi } from '@/lib/api/students';
import { classesApi } from '@/lib/api/classes';
import { useQuery } from '@tanstack/react-query';

const schema = z.object({
  firstName: z.string().min(1, 'Ism kiritilishi shart').trim(),
  lastName: z.string().min(1, 'Familiya kiritilishi shart').trim(),
  email: z.string().email("To'g'ri email kiriting"),
  password: z.string().min(8, 'Parol kamida 8 ta belgi'),
  phone: z.string().optional(),
  classId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function StudentCreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', phone: '', classId: '' },
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes', user?.branchId],
    queryFn: () => classesApi.getAll(),
    enabled: open,
  });
  const classList = (classesData as any)?.data ?? (Array.isArray(classesData) ? classesData : []);

  const createMutation = useMutation({
    mutationFn: studentsApi.create,
    onSuccess: () => {
      toast({ title: "O'quvchi muvaffaqiyatli qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      reset();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  const onSubmit = (values: FormValues) => {
    createMutation.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      phone: values.phone?.trim() || undefined,
      classId: values.classId || undefined,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-xedu-slate-900 shadow-premium-lg border border-xedu-slate-200 dark:border-xedu-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-xedu-slate-100 dark:border-xedu-slate-800">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-xedu-primary-light flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-xedu-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">Yangi o'quvchi</h3>
              <p className="text-2xs text-xedu-slate-400">Maktab o'quvchisini ro'yxatdan o'tkazing</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-xedu-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Ism <span className="text-xedu-ruby">*</span></label>
              <input {...register('firstName')} placeholder="Ali" className="w-full h-9 px-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
              {errors.firstName && <p className="text-2xs text-xedu-ruby">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Familiya <span className="text-xedu-ruby">*</span></label>
              <input {...register('lastName')} placeholder="Valiyev" className="w-full h-9 px-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
              {errors.lastName && <p className="text-2xs text-xedu-ruby">{errors.lastName.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Email <span className="text-xedu-ruby">*</span></label>
            <input {...register('email')} type="email" placeholder="ali@school.uz" className="w-full h-9 px-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
            {errors.email && <p className="text-2xs text-xedu-ruby">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Parol <span className="text-xedu-ruby">*</span></label>
            <div className="relative">
              <input {...register('password')} type={showPass ? 'text' : 'password'} placeholder="Kamida 8 ta belgi" className="w-full h-9 px-3 pr-9 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xedu-slate-400 hover:text-xedu-slate-600">
                {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {errors.password && <p className="text-2xs text-xedu-ruby">{errors.password.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Telefon</label>
            <input {...register('phone')} placeholder="+998 90 123 45 67" className="w-full h-9 px-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Sinf (ixtiyoriy)</label>
            <select {...register('classId')} className="w-full h-9 px-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary">
              <option value="">Sinf tanlang...</option>
              {classList.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-xs font-semibold text-xedu-slate-500 hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors">
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createMutation.isPending}
              className="h-9 px-4 rounded-lg text-xs font-semibold text-white bg-xedu-primary hover:bg-xedu-primary-dark disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {(isSubmitting || createMutation.isPending) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Qo'shish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
