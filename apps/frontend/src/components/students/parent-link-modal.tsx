'use client';

import { useState } from 'react';
import { getInitials } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Users, Loader2, Eye, EyeOff, Search, Plus, Link2 } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { studentsApi } from '@/lib/api/students';
import { usersApi } from '@/lib/api/users';

const searchSchema = z.object({
  search: z.string().optional(),
});

const createSchema = z.object({
  firstName: z.string().min(1, 'Ism kiritilishi shart').trim(),
  lastName: z.string().min(1, 'Familiya kiritilishi shart').trim(),
  email: z.string().email("To'g'ri email kiriting"),
  password: z.string().min(8, 'Parol kamida 8 ta belgi'),
  phone: z.string().optional(),
});

type SearchValues = z.infer<typeof searchSchema>;
type CreateValues = z.infer<typeof createSchema>;

export function ParentLinkModal({
  open,
  onClose,
  studentId,
  studentName,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
}) {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'search' | 'create'>('search');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const searchForm = useForm<SearchValues>({ resolver: zodResolver(searchSchema), defaultValues: { search: '' } });
  const createForm = useForm<CreateValues>({ resolver: zodResolver(createSchema), defaultValues: { firstName: '', lastName: '', email: '', password: '', phone: '' } });

  const { data: parentsData } = useQuery({
    queryKey: ['parents-search', searchForm.watch('search')],
    queryFn: () => usersApi.getAll({ role: 'parent', search: searchForm.watch('search') || undefined, limit: 20 }),
    enabled: open && mode === 'search',
  });
  const parents = (parentsData as any)?.data ?? [];

  const linkMutation = useMutation({
    mutationFn: (payload: { parentId?: string; firstName?: string; lastName?: string; email?: string; password?: string; phone?: string }) =>
      studentsApi.linkParent(studentId, payload),
    onSuccess: () => {
      toast({ title: "Ota-ona muvaffaqiyatli biriktirildi" });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['students', studentId] });
      onClose();
      setSelectedParentId(null);
      createForm.reset();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    },
  });

  const onLinkExisting = () => {
    if (!selectedParentId) {
      toast({ variant: 'destructive', title: 'Ota-ona tanlanmagan', description: 'Iltimos, roʻyxatdan ota-onani tanlang' });
      return;
    }
    linkMutation.mutate({ parentId: selectedParentId });
  };

  const onCreateAndLink = (values: CreateValues) => {
    linkMutation.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      phone: values.phone?.trim() || undefined,
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
              <Users className="h-4 w-4 text-xedu-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-xedu-slate-900 dark:text-xedu-slate-100">Ota-ona biriktirish</h3>
              <p className="text-2xs text-xedu-slate-400">{studentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-xedu-slate-400" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-5 pt-4">
          <div className="flex rounded-lg bg-xedu-slate-100 dark:bg-xedu-slate-800 p-0.5">
            <button
              type="button"
              onClick={() => setMode('search')}
              className={`flex-1 h-8 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${mode === 'search' ? 'bg-white dark:bg-xedu-slate-700 text-xedu-slate-900 dark:text-xedu-slate-100 shadow-sm' : 'text-xedu-slate-500'}`}
            >
              <Search className="h-3 w-3" /> Mavjud ota-ona
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex-1 h-8 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${mode === 'create' ? 'bg-white dark:bg-xedu-slate-700 text-xedu-slate-900 dark:text-xedu-slate-100 shadow-sm' : 'text-xedu-slate-500'}`}
            >
              <Plus className="h-3 w-3" /> Yangi ota-ona
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {mode === 'search' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-xedu-slate-400" />
                <input
                  {...searchForm.register('search')}
                  placeholder="Ism, familiya yoki email..."
                  className="w-full h-9 pl-8 pr-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {parents.length === 0 && (
                  <div className="py-6 text-center text-xs text-xedu-slate-400">Ota-ona topilmadi</div>
                )}
                {parents.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedParentId(p.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${selectedParentId === p.id ? 'bg-xedu-primary-light border border-xedu-primary' : 'hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 border border-transparent'}`}
                  >
                    <div className="h-7 w-7 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-2xs font-bold text-xedu-slate-500">
                      {getInitials(p.firstName, p.lastName)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-xedu-slate-800 dark:text-xedu-slate-200 truncate">{p.firstName} {p.lastName}</p>
                      <p className="text-2xs text-xedu-slate-400 truncate">{p.email}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-xs font-semibold text-xedu-slate-500 hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors">
                  Bekor qilish
                </button>
                <button
                  onClick={onLinkExisting}
                  disabled={!selectedParentId || linkMutation.isPending}
                  className="h-9 px-4 rounded-lg text-xs font-semibold text-white bg-xedu-primary hover:bg-xedu-primary-dark disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {linkMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <Link2 className="h-3.5 w-3.5" /> Biriktirish
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={createForm.handleSubmit(onCreateAndLink)} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Ism <span className="text-xedu-ruby">*</span></label>
                  <input {...createForm.register('firstName')} placeholder="Vali" className="w-full h-9 px-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
                  {createForm.formState.errors.firstName && <p className="text-2xs text-xedu-ruby">{createForm.formState.errors.firstName.message}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Familiya <span className="text-xedu-ruby">*</span></label>
                  <input {...createForm.register('lastName')} placeholder="Aliyev" className="w-full h-9 px-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
                  {createForm.formState.errors.lastName && <p className="text-2xs text-xedu-ruby">{createForm.formState.errors.lastName.message}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Email <span className="text-xedu-ruby">*</span></label>
                <input {...createForm.register('email')} type="email" placeholder="vali@school.uz" className="w-full h-9 px-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
                {createForm.formState.errors.email && <p className="text-2xs text-xedu-ruby">{createForm.formState.errors.email.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Parol <span className="text-xedu-ruby">*</span></label>
                <div className="relative">
                  <input {...createForm.register('password')} type={showPass ? 'text' : 'password'} placeholder="Kamida 8 ta belgi" className="w-full h-9 px-3 pr-9 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xedu-slate-400 hover:text-xedu-slate-600">
                    {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {createForm.formState.errors.password && <p className="text-2xs text-xedu-ruby">{createForm.formState.errors.password.message}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-xedu-slate-600 dark:text-xedu-slate-300">Telefon</label>
                <input {...createForm.register('phone')} placeholder="+998 90 123 45 67" className="w-full h-9 px-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-xedu-bg-elevated text-xs outline-none focus:ring-1 focus:ring-xedu-primary" />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="h-9 px-4 rounded-lg text-xs font-semibold text-xedu-slate-500 hover:bg-xedu-slate-100 dark:hover:bg-xedu-slate-800 transition-colors">
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={linkMutation.isPending}
                  className="h-9 px-4 rounded-lg text-xs font-semibold text-white bg-xedu-primary hover:bg-xedu-primary-dark disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {linkMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <Plus className="h-3.5 w-3.5" /> Yaratish va biriktirish
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
