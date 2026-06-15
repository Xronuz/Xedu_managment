'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Plus, Search, MoreVertical, Settings,
  Users, CheckCircle2, XCircle, Globe, Layers, AlertTriangle,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { superAdminApi } from '@/lib/api/super-admin';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  basic: { label: 'Basic', color: 'bg-gray-500' },
  standard: { label: 'Standard', color: 'bg-blue-500' },
  premium: { label: 'Premium', color: 'bg-violet-500' },
  enterprise: { label: 'Enterprise', color: 'bg-amber-500' },
};

export default function SchoolsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [deleteMode, setDeleteMode] = useState<'soft' | 'hard'>('soft');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['schools', page, search],
    queryFn: () => superAdminApi.getSchools({ page, limit: 15, search: search || undefined }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: object }) =>
      superAdminApi.updateSchool(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['schools'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, mode }: { id: string; mode: 'soft' | 'hard' }) =>
      mode === 'hard' ? superAdminApi.hardDeleteSchool(id) : superAdminApi.deleteSchool(id),
    onSuccess: (res) => {
      toast({ title: 'Bajarildi', description: res?.message ?? 'Maktab o\'chirildi.' });
      setConfirmDelete(null);
      setDeleteConfirmText('');
      queryClient.invalidateQueries({ queryKey: ['schools'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || 'Maktabni o\'chirishda xatolik yuz berdi',
        variant: 'destructive',
      });
    },
  });

  const openDelete = (school: any, mode: 'soft' | 'hard') => {
    setDeleteMode(mode);
    setDeleteConfirmText('');
    setConfirmDelete(school);
  };

  const schools = data?.data ?? [];
  const meta = data?.meta;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const toggleStatus = (school: any) => {
    updateMutation.mutate({ id: school.id, payload: { isActive: !school.isActive } });
  };

  const requiredWord = deleteMode === 'hard' ? 'BUTUNLAY' : "O'CHIRISH";
  const canSubmitDelete = deleteConfirmText === requiredWord;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Maktablar boshqaruvi
          </h1>
          <p className="text-xedu-slate-500 dark:text-xedu-slate-400">
            Platformdagi barcha maktablar — jami: <span className="font-medium">{meta?.total ?? 0}</span> ta
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/schools/new">
            <Plus className="mr-2 h-4 w-4" />
            Yangi maktab
          </Link>
        </Button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-xedu-slate-500 dark:text-xedu-slate-400" />
          <Input
            placeholder="Maktab nomi yoki slug bo'yicha qidirish..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary">Qidirish</Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
          >
            Tozalash
          </Button>
        )}
      </form>

      {/* Schools list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-xedu-ruby/40" />
            <p className="text-xedu-slate-500 dark:text-xedu-slate-400">Ma‘lumotlarni yuklashda xatolik yuz berdi</p>
            <p className="text-sm text-xedu-ruby mt-1">{(error as any)?.response?.data?.message ?? (error as Error)?.message}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['schools'] })}
            >
              Qayta yuklash
            </Button>
          </CardContent>
        </Card>
      ) : schools.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto mb-3 h-12 w-12 text-xedu-slate-500 dark:text-xedu-slate-400/40" />
            <p className="text-xedu-slate-500 dark:text-xedu-slate-400">
              {search ? `"${search}" bo'yicha maktab topilmadi` : 'Hali maktab yo‘q'}
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/schools/new">
                <Plus className="mr-2 h-4 w-4" />
                Birinchi maktabni qo'shing
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {schools.map((school: any) => {
            const tier = TIER_LABELS[school.subscriptionTier] ?? TIER_LABELS.basic;
            return (
              <Card
                key={school.id}
                className={`transition-opacity ${!school.isActive ? 'opacity-60' : ''}`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  {/* School icon */}
                  <div className="flex-shrink-0 rounded-xl bg-primary/10 p-3">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-base">{school.name}</p>
                      <Badge variant={school.isActive ? 'success' : 'destructive'} className="text-xs">
                        {school.isActive ? 'Aktiv' : 'Bloklangan'}
                      </Badge>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white ${tier.color}`}
                      >
                        {tier.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-xedu-slate-500 dark:text-xedu-slate-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {school.slug}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {school._count?.users ?? 0} foydalanuvchi
                      </span>
                      {school.createdAt && (
                        <span>Qo'shilgan: {formatDate(school.createdAt)}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/schools/${school.id}`}>
                        <Layers className="mr-1.5 h-3.5 w-3.5" />
                        Modullar
                      </Link>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/schools/${school.id}`}>
                            <Settings className="mr-2 h-4 w-4" />
                            Sozlamalar
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => toggleStatus(school)}
                          className={school.isActive ? 'text-xedu-ruby' : 'text-green-600'}
                        >
                          {school.isActive ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Bloklash
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Faollashtirish
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDelete(school, 'soft')}
                          className="text-xedu-amber"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Arxivlash (vaqtincha)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => openDelete(school, 'hard')}
                          className="text-xedu-ruby"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Butunlay o'chirish
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Oldingi
          </Button>
          <span className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400 px-2">
            {page} / {meta.totalPages} sahifa
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page === meta.totalPages}
          >
            Keyingi →
          </Button>
        </div>
      )}

      {/* Delete confirmation modal */}
      <Dialog open={!!confirmDelete} onOpenChange={(v) => { if (!v) { setConfirmDelete(null); setDeleteConfirmText(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xedu-ruby">
              <AlertTriangle className="h-5 w-5" />
              {deleteMode === 'hard' ? "Maktabni butunlay o'chirish" : 'Maktabni arxivlash'}
            </DialogTitle>
            <DialogDescription className="pt-1">
              {deleteMode === 'hard'
                ? "Maktab va uning BARCHA ma'lumotlari (foydalanuvchilar, filiallar, baholar...) butunlay o'chiriladi. Tiklab bo'lmaydi."
                : "Maktab arxivlanadi va foydalanuvchilari tizimga kira olmaydi. Nom va email'lar bo'shatiladi — keyinroq xuddi shu nom bilan qayta yaratishingiz mumkin."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="rounded-md bg-xedu-ruby/10 border border-xedu-ruby/20 p-3 text-sm text-xedu-ruby">
              <strong>{confirmDelete?.name}</strong> uchun tasdiqlash maydoniga <code className="font-mono bg-white/50 px-1 rounded">{requiredWord}</code> so'zini yozing.
            </div>
            <Input
              placeholder={requiredWord}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setConfirmDelete(null); setDeleteConfirmText(''); }}>
              Bekor qilish
            </Button>
            <Button
              variant="destructive"
              disabled={!canSubmitDelete || deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: confirmDelete?.id, mode: deleteMode })}
            >
              {deleteMutation.isPending
                ? 'Bajarilmoqda...'
                : deleteMode === 'hard' ? "Butunlay o'chirish" : 'Arxivlash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
