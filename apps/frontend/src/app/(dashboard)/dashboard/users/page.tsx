'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Users, Loader2, Eye, EyeOff, UserCheck, GraduationCap, Heart, Ban, RotateCcw, Link2, Upload, FileText, AlertTriangle, BookOpen, Trash2, SlidersHorizontal, X, ChevronDown, Mail, KeyRound, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { PageShell, PageHeader, FilterBar, TableShell, THead, TH, TBody, TR, TD, AvatarCell, StatusBadge, EmptyCard, Pagination, Btn, DS } from '@/components/ui/page-ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usersApi } from '@/lib/api/users';
import { classesApi } from '@/lib/api/classes';
import { branchesApi } from '@/lib/api/branches';
import { subjectsApi } from '@/lib/api/subjects';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, getRoleLabel, cn } from '@/lib/utils';
import { ImportDialog } from '@/components/import/import-dialog';
import { AssignBranchDialog } from '@/components/users/assign-branch-dialog';
import { InviteUserDialog } from '@/components/invitation/invite-user-dialog';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';

// ── Zod schema ────────────────────────────────────────────────────────────────
const userSchema = z.object({
  firstName: z.string().min(1, 'Ism kiritilishi shart').trim(),
  lastName:  z.string().min(1, 'Familiya kiritilishi shart').trim(),
  email:     z.string().email("To'g'ri email kiriting"),
  password:  z.string().min(8, 'Parol kamida 8 ta belgi'),
  phone:     z.string().optional(),
  role:      z.string().min(1, 'Rol tanlanishi shart'),
  classId:   z.string().optional(),
  studentId: z.string().optional(),
  branchId:  z.string().optional(),
});
type UserFormValues = z.infer<typeof userSchema>;

// Guard: super_admin bu sahifani ko'rmasligi kerak
function useSuperAdminGuard() {
  const router = useRouter();
  const { user, activeBranchId } = useAuthStore();
  useEffect(() => {
    if (user?.role === 'super_admin') router.replace('/dashboard/schools');
  }, [user, router]);
  return user?.role === 'super_admin';
}

const ALL_ROLES = [
  { value: 'director',       label: 'Direktor' },
  { value: 'vice_principal', label: "O'quv ishlari bo'yicha direktor" },
  { value: 'branch_admin',   label: 'Filial admin' },
  { value: 'teacher',        label: "O'qituvchi" },
  { value: 'class_teacher',  label: 'Sinf rahbari' },
  { value: 'accountant',     label: 'Buxgalter' },
  { value: 'librarian',      label: 'Kutubxonachi' },
  { value: 'student',        label: "O'quvchi" },
  { value: 'parent',         label: 'Ota-ona' },
];

/** Role dropdown filter by creator role */
function getCreatableRoles(actorRole?: string) {
  switch (actorRole) {
    case 'director':
      return ALL_ROLES.filter((r) => !['director', 'super_admin'].includes(r.value));
    case 'vice_principal':
      return ALL_ROLES.filter((r) => !['director', 'super_admin', 'vice_principal', 'branch_admin'].includes(r.value));
    case 'branch_admin':
      // Branch Admin can ONLY create lower operational roles in their own branch
      return ALL_ROLES.filter((r) => ['teacher', 'class_teacher', 'accountant', 'librarian', 'student', 'parent'].includes(r.value));
    default:
      return [];
  }
}

export default function UsersPage() {
  const isSuperAdmin = useSuperAdminGuard();
  const { user, activeBranchId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [confirmDelete, setConfirmDelete]     = useState<any>(null);
  const [confirmHardDelete, setConfirmHardDelete] = useState<any>(null);
  const [confirmReset, setConfirmReset] = useState<any>(null);
  const [resetResult, setResetResult] = useState<{ temporaryPassword: string; userName: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const isDirector = user?.role === 'director';
  const [csvResult, setCsvResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<{ name: string; classId: string }[]>([]);
  const [subjectWarning, setSubjectWarning] = useState<string>('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [checkEmailResult, setCheckEmailResult] = useState<any>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // ── React Hook Form ──────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', phone: '', role: '', classId: '', studentId: '', branchId: activeBranchId ?? '' },
  });

  const watchedRole = watch('role');
  const watchedBranchId = watch('branchId');

  // Load branches — always (for filter) when eligible role, also used in create modal
  const canSeeBranches = ['super_admin', 'director', 'vice_principal'].includes(user?.role ?? '');
  const { data: branchesData } = useQuery({
    queryKey: ['branches', user?.schoolId],
    queryFn: () => branchesApi.getAll(),
    enabled: !!user?.schoolId && canSeeBranches,
  });
  const branchesList = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.data ?? [];

  const csvMutation = useMutation({
    mutationFn: (file: File) => usersApi.importCsv(file),
    onSuccess: (result) => {
      setCsvResult(result);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: ` Import bajarildi: ${result.created} ta qo'shildi`,
        description: result.skipped > 0 ? `${result.skipped} ta o'tkazib yuborildi` : undefined,
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Import xatosi', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  // Debounce search — 400ms
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch, activeBranchId, filterRole, filterStatus, filterBranch],
    queryFn: () => usersApi.getAll({ page, limit: 20, search: debouncedSearch || undefined, role: filterRole || undefined, branchId: filterBranch || undefined }),
  });

  // close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen]);

  // Load classes when modal opens
  const { data: classesData } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn: () => classesApi.getAll(),
    enabled: open,
  });

  // Load students list when parent role selected
  const { data: allStudentsData } = useQuery({
    queryKey: ['users-students', activeBranchId],
    queryFn: () => usersApi.getAll({ page: 1, limit: 200 }),
    enabled: open && watchedRole === 'parent',
  });
  const studentsList = (allStudentsData?.data ?? []).filter((u: any) => u.role === 'student');

  // Load existing subjects catalog when teacher role selected (deduplicated)
  const { data: existingCatalogData } = useQuery({
    queryKey: ['subjects', 'catalog', activeBranchId],
    queryFn: () => subjectsApi.getCatalog(activeBranchId ?? undefined),
    enabled: open && watchedRole === 'teacher',
  });
  const existingCatalog = Array.isArray(existingCatalogData) ? existingCatalogData : (existingCatalogData as any)?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: ({ id, restore }: { id: string; restore?: boolean }) =>
      restore ? usersApi.restore(id) : usersApi.remove(id),
    onSuccess: (_, vars) => {
      toast({ title: vars.restore ? ' Foydalanuvchi faollashtirildi' : "Foydalanuvchi bloklandi" });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmDelete(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.hardDelete(id),
    onSuccess: () => {
      toast({ title: ' Foydalanuvchi butunlay o‘chirildi' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setConfirmHardDelete(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => usersApi.resetPassword(id),
    onSuccess: (data) => {
      setResetResult({ temporaryPassword: data.temporaryPassword, userName: '' });
      setConfirmReset(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "Parol muvaffaqiyatli tiklandi", description: data.message });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Parolni tiklashda xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
      setConfirmReset(null);
    },
  });

  const onSubmit = async (values: UserFormValues) => {
    try {
      // Enforce branch scope for Branch Admin in API payload
      const isBranchAdmin = user?.role === 'branch_admin';
      const branchId = isBranchAdmin
        ? (user?.branchId ?? '')
        : (values.branchId?.trim() || undefined);

      // 1. Create user
      const created = await usersApi.create({
        firstName: values.firstName,
        lastName:  values.lastName,
        email:     values.email,
        password:  values.password,
        phone:     values.phone?.trim() || undefined,
        role:      values.role,
        branchId:  branchId || undefined,
      } as any);

      // 2. Student → enroll in class if selected
      if (values.role === 'student' && values.classId) {
        try {
          await classesApi.addStudent(values.classId, created.id);
        } catch {
          toast({ variant: 'destructive', title: "Sinfga qo'shishda xato", description: "Foydalanuvchi yaratildi, lekin sinfga qo'shilmadi" });
        }
      }

      // 3. Class teacher → assign to class if selected
      if (values.role === 'class_teacher' && values.classId) {
        try {
          await classesApi.update(values.classId, { classTeacherId: created.id });
        } catch {
          toast({ variant: 'destructive', title: "Sinfga biriktirishda xato", description: "Sinf rahbari yaratildi, lekin sinfga biriktirilmadi" });
        }
      }

      // 4. Parent → link to student if selected
      if (values.role === 'parent' && values.studentId) {
        try {
          await usersApi.linkParentStudent(created.id, values.studentId);
        } catch {
          toast({ variant: 'destructive', title: "Bog'lashda xato", description: "Ota-ona yaratildi, lekin o'quvchiga bog'lanmadi" });
        }
      }

      // 4. Teacher → create subjects if specified
      if (values.role === 'teacher' && teacherSubjects.length > 0) {
        try {
          for (const subj of teacherSubjects) {
            if (subj.name.trim() && subj.classId) {
              await subjectsApi.create({
                name: subj.name.trim(),
                classIds: [subj.classId],
                teacherId: created.id,
              });
            }
          }
          toast({ title: ` Foydalanuvchi va ${teacherSubjects.length} ta fan qo'shildi` });
        } catch {
          toast({ variant: 'destructive', title: "Fan qo'shishda xato", description: "O'qituvchi yaratildi, lekin ba'zi fanlar qo'shilmadi" });
        }
      } else {
        toast({ title: " Foydalanuvchi qo'shildi" });
      }

      queryClient.invalidateQueries({ queryKey: ['users'] });
      setTeacherSubjects([]);
      setOpen(false);
      reset();
    } catch (err: any) {
      const response = err?.response?.data;
      // Structured error from backend: USER_EXISTS_IN_SCHOOL
      if (response?.code === 'USER_EXISTS_IN_SCHOOL') {
        setCheckEmailResult({
          id: response.existingUserId,
          firstName: response.existingName?.split(' ')[0] ?? '',
          lastName: response.existingName?.split(' ').slice(1).join(' ') ?? '',
          role: response.existingRole,
          primaryBranchName: null,
          assignedBranches: [],
        });
        return;
      }
      const msg = response?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi' });
    }
  };

  // Server-side search — filterlash backend da amalga oshiriladi
  const users = data?.data ?? [];
  const meta = data?.meta;
  const filtered = filterStatus
    ? users.filter((u: any) => filterStatus === 'active' ? u.isActive : !u.isActive)
    : users;
  const activeCount = users.filter((u: any) => u.isActive).length;
  const blockedCount = users.filter((u: any) => !u.isActive).length;
  const hasFilter = !!(filterRole || filterStatus || filterBranch);

  if (isSuperAdmin) return null;

  return (
    <PageShell>
      {/* CSV import natija dialogi */}
      {csvResult && (
        <Dialog open={!!csvResult} onOpenChange={() => setCsvResult(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" style={{ color: DS.primary }} /> CSV Import natijalari
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl p-4 text-center" style={{ background: '#DDF5EA' }}>
                  <p className="text-2xl font-black" style={{ color: DS.primary }}>{csvResult.created}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: DS.muted }}>Qo&apos;shildi</p>
                </div>
                <div className="rounded-2xl p-4 text-center" style={{ background: '#FEF3C7' }}>
                  <p className="text-2xl font-black text-xedu-amber">{csvResult.skipped}</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: DS.muted }}>O&apos;tkazildi</p>
                </div>
              </div>
              {csvResult.errors.length > 0 && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-red-600 mb-2">
                    <AlertTriangle className="h-4 w-4" /> Xatolar ({csvResult.errors.length} ta)
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {csvResult.errors.map((e, i) => (
                      <p key={i} className="text-xs" style={{ color: DS.muted }}>{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <Btn variant="primary" onClick={() => setCsvResult(null)}>Yopish</Btn>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* hidden CSV input */}
      <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) { csvMutation.mutate(f); e.target.value = ''; } }} />

      {/* ── Toolbar: search + filter + stats + actions — one row ────────────── */}
      <div className="flex items-center gap-2 flex-nowrap">
        {/* Search */}
        <div className="relative min-w-[160px] max-w-[272px] w-[272px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Ism, email bo'yicha qidirish..."
            className="w-full h-9 pl-10 pr-4 text-[12px] rounded-[12px] outline-none transition-all
              bg-slate-50 dark:bg-slate-800
              border border-black/[0.06] dark:border-white/[0.08]
              text-slate-900 dark:text-slate-100
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              focus:border-xedu-primary/40 focus:ring-2 focus:ring-xedu-primary/10"
          />
        </div>

        {/* Filter dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setFilterOpen(v => !v)}
            className={cn(
              'inline-flex items-center gap-2 h-9 px-3.5 text-[12px] font-semibold rounded-[12px] transition-all border',
              hasFilter
                ? 'bg-xedu-primary-light dark:bg-xedu-primary/30 border-xedu-primary/25 dark:border-xedu-primary/50 text-xedu-primary dark:text-xedu-primary'
                : 'bg-slate-50 dark:bg-slate-800 border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-200'
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtr
            {hasFilter && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: DS.primary, color: '#fff' }}>
                {(filterRole ? 1 : 0) + (filterStatus ? 1 : 0) + (filterBranch ? 1 : 0)}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
          </button>

          {filterOpen && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[220px] rounded-[16px] bg-xedu-bg-elevated dark:bg-xedu-slate-800 p-3 space-y-3 border border-xedu-border dark:border-xedu-border shadow-premium-lg">
              {/* Role filter */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Rol</p>
                <div className="space-y-0.5">
                  {[{ value: '', label: 'Barchasi' }, ...ALL_ROLES].map(r => (
                    <button key={r.value}
                      onClick={() => { setFilterRole(r.value); setPage(1); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors"
                      style={{
                        background: filterRole === r.value ? DS.primaryLight : 'transparent',
                        color: filterRole === r.value ? DS.primary : '#374151',
                      }}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Status filter */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Holat</p>
                <div className="space-y-0.5">
                  {[{ value: '', label: 'Barchasi' }, { value: 'active', label: 'Aktiv' }, { value: 'blocked', label: 'Bloklangan' }].map(s => (
                    <button key={s.value}
                      onClick={() => { setFilterStatus(s.value); setPage(1); }}
                      className="w-full text-left px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors"
                      style={{
                        background: filterStatus === s.value ? DS.primaryLight : 'transparent',
                        color: filterStatus === s.value ? DS.primary : '#374151',
                      }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Branch filter */}
              {branchesList.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Filial</p>
                  <div className="space-y-0.5 max-h-[140px] overflow-y-auto">
                    {[{ id: '', name: 'Barchasi' }, ...branchesList].map((b: any) => (
                      <button key={b.id}
                        onClick={() => { setFilterBranch(b.id); setPage(1); }}
                        className="w-full text-left px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors truncate"
                        style={{
                          background: filterBranch === b.id ? DS.primaryLight : 'transparent',
                          color: filterBranch === b.id ? DS.primary : '#374151',
                        }}>
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Reset */}
              {hasFilter && (
                <button onClick={() => { setFilterRole(''); setFilterStatus(''); setFilterBranch(''); setPage(1); }}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-[8px] text-[12px] font-semibold text-red-500 hover:bg-red-50 transition-colors">
                  <X className="h-3.5 w-3.5" /> Tozalash
                </button>
              )}
            </div>
          )}
        </div>

        {/* Stats — compact single chip */}
        <div className="flex items-center gap-2 rounded-[12px] px-3 h-9 text-[12px] font-semibold shrink-0 bg-slate-50 dark:bg-slate-800 border border-black/[0.06] dark:border-white/[0.08] text-slate-700 dark:text-slate-200">
          <Users className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
          <span className="text-xedu-primary dark:text-xedu-primary">{meta?.total ?? 0}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="h-1.5 w-1.5 rounded-full bg-xedu-primary inline-block" />
          <span className="text-xedu-primary dark:text-xedu-primary">{activeCount}</span>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block" />
          <span className="text-red-600 dark:text-red-400">{blockedCount}</span>
        </div>

        {/* Actions pushed to right */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className="h-9 w-px bg-slate-200 dark:bg-slate-700" />
          <Btn variant="secondary" size="sm" className="h-9 rounded-[12px]" icon={csvMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            onClick={() => csvInputRef.current?.click()} loading={csvMutation.isPending}>
            CSV
          </Btn>
          <Btn variant="secondary" size="sm" className="h-9 rounded-[12px]" icon={<Link2 className="h-4 w-4" />} onClick={() => window.location.href = '/dashboard/users/link-parent'}>
            Bog&apos;lash
          </Btn>
          <Btn variant="secondary" size="sm" className="h-9 rounded-[12px]" icon={<Upload className="h-4 w-4" />} onClick={() => setImportOpen(true)}>
            Import
          </Btn>
          <Btn variant="secondary" size="sm" className="h-9 rounded-[12px]" icon={<Mail className="h-4 w-4" />} onClick={() => setInviteOpen(true)}>
            Taklif
          </Btn>
          <Btn variant="primary" size="sm" className="h-9 rounded-[12px]" icon={<Plus className="h-4 w-4" />} onClick={() => { setOpen(true); reset(); }}>
            Qo&apos;shish
          </Btn>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyCard icon={<Users className="h-6 w-6" />} title="Foydalanuvchilar topilmadi" description="Qidiruv natijasida hech narsa topilmadi" />
      ) : (
        <>
        {selectedUserIds.length > 0 && (
          <BulkActionBar
            selected={filtered.filter((u: any) => selectedUserIds.includes(u.id))}
            itemLabel="ta foydalanuvchi"
            onClearSelection={() => setSelectedUserIds([])}
            actions={[
              {
                label: 'Faollashtirish',
                icon: RotateCcw,
                variant: 'default',
                onClick: async (items) => {
                  const inactive = items.filter((u: any) => !u.isActive);
                  for (const u of inactive) {
                    await usersApi.restore(u.id);
                  }
                  toast({ title: `${inactive.length} ta foydalanuvchi faollashtirildi` });
                  queryClient.invalidateQueries({ queryKey: ['users'] });
                  setSelectedUserIds([]);
                },
                disabled: (items) => !items.some((u: any) => !u.isActive),
              },
              {
                label: 'Bloklash',
                icon: Ban,
                variant: 'destructive',
                onClick: async (items) => {
                  const active = items.filter((u: any) => u.isActive);
                  for (const u of active) {
                    await usersApi.remove(u.id);
                  }
                  toast({ title: `${active.length} ta foydalanuvchi bloklandi` });
                  queryClient.invalidateQueries({ queryKey: ['users'] });
                  setSelectedUserIds([]);
                },
                disabled: (items) => !items.some((u: any) => u.isActive),
              },
            ]}
          />
        )}

        <TableShell>
          <THead>
            <TH>
              <input
                type="checkbox"
                checked={selectedUserIds.length > 0 && selectedUserIds.length === filtered.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedUserIds(filtered.map((u: any) => u.id));
                  } else {
                    setSelectedUserIds([]);
                  }
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
            </TH>
            <TH>Foydalanuvchi</TH>
            <TH center>Rol</TH>
            <TH center>Telefon</TH>
            <TH center>Filial</TH>
            <TH center>Holat</TH>
            <TH right>Amal</TH>
          </THead>
          <TBody>
            {filtered.map((u: any) => {
              const isSelf = u.id === user?.id;
              const isUntouchable = u.role === 'super_admin' || u.role === 'director' || isSelf;
              return (
              <TR key={u.id}>
                <TD>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUserIds((prev) => [...prev, u.id]);
                      } else {
                        setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                      }
                    }}
                    className={cn(
                      "h-4 w-4 rounded border-gray-300 transition-opacity duration-150",
                      selectedUserIds.includes(u.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
                  />
                </TD>
                <TD><AvatarCell name={`${u.firstName} ${u.lastName}`} subtitle={u.email} /></TD>
                <TD center><span className="text-[12px] font-semibold" style={{ color: DS.muted }}>{getRoleLabel(u.role)}</span></TD>
                <TD center><span className="text-[13px]" style={{ color: DS.muted }}>{u.phone || '—'}</span></TD>
                <TD>
                  <div className="flex flex-wrap gap-1 max-w-[140px]">
                    {u.branch?.name && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                        {u.branch.name}
                      </span>
                    )}
                    {u.branchAssignments?.map((a: any, i: number) => (
                      <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-xedu-primary-light dark:bg-xedu-primary/20 border border-xedu-primary-light dark:border-xedu-primary/50 text-[10px] font-medium text-xedu-primary dark:text-xedu-primary">
                        {a.branch?.name}
                      </span>
                    ))}
                  </div>
                </TD>
                <TD center>
                  <StatusBadge variant={u.isActive ? 'success' : 'danger'}>
                    {u.isActive ? 'Aktiv' : 'Bloklangan'}
                  </StatusBadge>
                </TD>
                <TD right>
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Parolni tiklash */}
                    {(() => {
                      const actorRole = user?.role;
                      const targetRole = u.role;
                      const sameSchool = u.schoolId === user?.schoolId;
                      const sameBranch = u.branchId === user?.branchId || u.branchAssignments?.some((a: any) => a.branchId === user?.branchId);
                      let canReset = false;
                      if (isSelf) canReset = false;
                      else if (actorRole === 'super_admin') canReset = targetRole === 'director';
                      else if (actorRole === 'director' || actorRole === 'vice_principal') {
                        canReset = sameSchool && targetRole !== 'super_admin' && targetRole !== 'director' && targetRole !== 'director';
                      } else if (actorRole === 'branch_admin') {
                        canReset = sameSchool && sameBranch && targetRole !== 'super_admin' && targetRole !== 'director' && targetRole !== 'vice_principal' && targetRole !== 'branch_admin';
                      }
                      return canReset ? (
                        <Btn variant="primary" size="sm" icon={<KeyRound className="h-3.5 w-3.5" />} onClick={() => setConfirmReset(u)} title="Parolni tiklash">
                          Parol
                        </Btn>
                      ) : null;
                    })()}
                    {isUntouchable ? (
                      <span className="text-[12px]" style={{ color: DS.muted }}>—</span>
                    ) : u.isActive ? (
                      <Btn variant="danger" size="sm" icon={<Ban className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete(u)}>
                        Bloklash
                      </Btn>
                    ) : (
                      <Btn variant="soft" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setConfirmDelete({ ...u, restore: true })}>
                        Faollashtirish
                      </Btn>
                    )}
                    {isDirector && !isUntouchable && (
                      <Btn variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => setConfirmHardDelete(u)}
                        title="Butunlay o'chirish"
                      />
                    )}
                  </div>
                </TD>
              </TR>
              );
            })}
          </TBody>
          {meta && meta.totalPages > 1 && (
            <Pagination page={page} total={meta.total} perPage={20} onPage={setPage} />
          )}
        </TableShell>
        </>
      )}

      {/* Delete/Block confirm dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={v => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {confirmDelete?.restore ? 'Foydalanuvchini faollashtirish' : 'Foydalanuvchini bloklash'}
            </DialogTitle>
            <DialogDescription>
              {confirmDelete?.restore
                ? `${confirmDelete?.firstName} ${confirmDelete?.lastName} ni qayta faollashtirasizmi?`
                : `${confirmDelete?.firstName} ${confirmDelete?.lastName} ni bloklashni tasdiqlaysizmi?`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setConfirmDelete(null)}>Bekor</Btn>
            <Btn
              variant={confirmDelete?.restore ? 'soft' : 'danger'}
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: confirmDelete?.id, restore: confirmDelete?.restore })}
            >
              {confirmDelete?.restore ? 'Faollashtirish' : 'Bloklash'}
            </Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hard delete confirm dialog — faqat director */}
      <Dialog open={!!confirmHardDelete} onOpenChange={v => { if (!v) setConfirmHardDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xedu-ruby">
              <Trash2 className="h-5 w-5" />
              Foydalanuvchini butunlay o'chirish
            </DialogTitle>
            <DialogDescription className="pt-1">
              <span className="font-semibold text-foreground">
                {confirmHardDelete?.firstName} {confirmHardDelete?.lastName}
              </span>{' '}
              ({confirmHardDelete?.email}) foydalanuvchisi tizimdan <span className="font-semibold text-xedu-ruby">butunlay va qaytarib bo'lmasdan</span> o'chiriladi.
              Barcha ma'lumotlari ham o'chadi.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-xedu-ruby/10 border border-xedu-ruby/20 px-3 py-2.5 text-xs text-xedu-ruby font-medium flex items-start gap-2 mt-1">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Bu amalni bekor qilib bo'lmaydi. Davom etishdan oldin ishonch hosil qiling.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setConfirmHardDelete(null)}>Bekor</Btn>
            <Btn
              variant="danger"
              loading={hardDeleteMutation.isPending}
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => hardDeleteMutation.mutate(confirmHardDelete?.id)}
            >
              Ha, o'chirish
            </Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password reset confirm dialog */}
      <Dialog open={!!confirmReset} onOpenChange={v => { if (!v) setConfirmReset(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-xedu-amber" />
              Parolni tiklashni tasdiqlang
            </DialogTitle>
            <DialogDescription className="pt-1">
              <span className="font-semibold text-foreground">
                {confirmReset?.firstName} {confirmReset?.lastName}
              </span>{' '}
              uchun yangi vaqtinchalik parol yaratiladi. U keyingi kirishda parolni yangilashi kerak.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="secondary" onClick={() => setConfirmReset(null)}>Bekor qilish</Btn>
            <Btn
              variant="primary"
              loading={resetPasswordMutation.isPending}
              icon={<KeyRound className="h-3.5 w-3.5" />}
              onClick={() => resetPasswordMutation.mutate(confirmReset?.id)}
            >
              Parolni tiklash
            </Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password reset success — temporary password display */}
      <Dialog open={!!resetResult} onOpenChange={v => { if (!v) { setResetResult(null); setCopied(false); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-xedu-emerald" />
              Parol tiklandi
            </DialogTitle>
            <DialogDescription className="pt-1">
              Quyidagi vaqtinchalik parolni xavfsiz tarzda foydalanuvchiga yetkazing. Bu parol faqat bir marta ko&apos;rsatiladi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Input
                readOnly
                value={resetResult?.temporaryPassword ?? ''}
                className="pr-24 font-mono text-base tracking-wider bg-xedu-slate-50 dark:bg-xedu-slate-800"
              />
              <Button
                size="sm"
                variant="outline"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 gap-1"
                onClick={() => {
                  if (resetResult?.temporaryPassword) {
                    navigator.clipboard.writeText(resetResult.temporaryPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Nusxa olindi' : 'Nusxa olish'}
              </Button>
            </div>
            <div className="rounded-lg bg-xedu-amber/10 border border-xedu-amber/20 px-3 py-2.5 text-xs text-xedu-amber font-medium flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Foydalanuvchi keyingi kirishda yangi parol o&apos;rnatishi shart.
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="primary" onClick={() => { setResetResult(null); setCopied(false); }}>
              Yopish
            </Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create user modal */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setTeacherSubjects([]); setSubjectWarning(''); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yangi foydalanuvchi qo'shish</DialogTitle>
            <DialogDescription>Maktab tizimiga yangi a'zo kiriting</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Asosiy ma'lumotlar */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ism <span className="text-xedu-ruby">*</span></Label>
                <Input placeholder="Ali" {...register('firstName')} />
                {errors.firstName && <p className="text-xs text-xedu-ruby">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Familiya <span className="text-xedu-ruby">*</span></Label>
                <Input placeholder="Valiyev" {...register('lastName')} />
                {errors.lastName && <p className="text-xs text-xedu-ruby">{errors.lastName.message}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-xedu-ruby">*</span></Label>
              <Input
                type="email"
                placeholder="ali@maktab.uz"
                {...register('email')}
                onBlur={async (e) => {
                  const email = e.target.value.trim();
                  if (!email || errors.email) return;
                  setCheckingEmail(true);
                  try {
                    const result = await usersApi.checkEmail(email);
                    if (result.exists && result.user) {
                      setCheckEmailResult(result.user);
                    }
                  } catch {
                    // ignore network errors
                  } finally {
                    setCheckingEmail(false);
                  }
                }}
              />
              {checkingEmail && <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Tekshirilmoqda...</p>}
              {errors.email && <p className="text-xs text-xedu-ruby">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Parol <span className="text-xedu-ruby">*</span></Label>
              <div className="relative">
                <Input type={showPass ? 'text' : 'password'} placeholder="Kamida 8 ta belgi" className="pr-10" {...register('password')} />
                <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-xedu-ruby">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Telefon</Label>
              <Input placeholder="+998 90 123 45 67" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Rol <span className="text-xedu-ruby">*</span></Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Rol tanlang..." /></SelectTrigger>
                    <SelectContent>{getCreatableRoles(user?.role).map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-xs text-xedu-ruby">{errors.role.message}</p>}
            </div>

            {/* Branch selector — locked for Branch Admin */}
            {user?.role === 'branch_admin' ? (
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground items-center">
                  {branchesList.find((b: any) => b.id === user?.branchId)?.name ?? 'Joriy filial'}
                </div>
                <p className="text-xs text-xedu-slate-500">
                  Filial admin faqat o'z filialiga foydalanuvchi qo'sha oladi
                </p>
              </div>
            ) : branchesList.length > 0 && (
              <div className="space-y-1.5">
                <Label>Filial</Label>
                <Controller
                  name="branchId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filial tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesList.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">Agar tanlanmasa, foydalanuvchi joriy filialga biriktiriladi</p>
              </div>
            )}

            {/* O'qituvchi → Fan yaratish */}
            {watchedRole === 'teacher' && (
              <div className="rounded-lg border border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-800 p-3 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-400">
                  <BookOpen className="h-4 w-4" /> O'qituvchi fanlari
                </div>

                {/* Mavjud fanlar ro'yxati (takrorlanishlarsiz) */}
                {existingCatalog.length > 0 && (
                  <div>
                    <p className="text-xs text-violet-600 dark:text-violet-400 mb-1.5 font-medium">Mavjud fanlar:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {existingCatalog.map((s: any) => (
                        <span key={s.normalizedName} className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-xedu-slate-950 border px-2 py-0.5 text-xs" title={s.classes.map((c: any) => c.name).join(', ')}>
                          <span className="font-medium">{s.name}</span>
                          <span className="text-xedu-slate-500 dark:text-xedu-slate-400">{s.count > 1 ? `(${s.count} ta sinf)` : `(${s.classes[0]?.name ?? ''})`}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Yangi qo'shilayotgan fanlar */}
                {teacherSubjects.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Yangi qo'shiladi:</p>
                    {teacherSubjects.map((subj, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white dark:bg-white dark:bg-xedu-slate-950 rounded-md p-2 border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{subj.name}</p>
                          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                            {(classesData ?? []).find((c: any) => c.id === subj.classId)?.name ?? subj.classId}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setTeacherSubjects(prev => prev.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-xedu-ruby" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Yangi fan qo'shish */}
                <div className="space-y-2">
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Yangi fan qo'shish:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      id="subject-name"
                      placeholder="Fan nomi"
                      className="bg-white dark:bg-white dark:bg-xedu-slate-950"
                      onChange={(e) => {
                        const name = e.target.value.trim();
                        if (!name) { setSubjectWarning(''); return; }
                        const dup = existingCatalog.find((s: any) => s.normalizedName === name.toLowerCase());
                        if (dup) {
                          const classHint = dup.count > 1 ? `${dup.count} ta sinf` : (dup.classes[0]?.name ?? '');
                          setSubjectWarning(`"${dup.name}" fani allaqachon mavjud (${classHint})`);
                        } else {
                          setSubjectWarning('');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                    />
                    <Select
                      value=""
                      onValueChange={(v) => {
                        const nameInput = document.getElementById('subject-name') as HTMLInputElement;
                        const name = nameInput?.value.trim();
                        if (name && v) {
                          const className = (classesData ?? []).find((c: any) => c.id === v)?.name ?? v;
                          const alreadyInList = teacherSubjects.some(
                            (s) => s.name.toLowerCase() === name.toLowerCase() && s.classId === v
                          );
                          if (alreadyInList) {
                            toast({ variant: 'destructive', title: 'Bu fan allaqachon ro‘yxatda' });
                            return;
                          }
                          setTeacherSubjects(prev => [...prev, { name, classId: v }]);
                          nameInput.value = '';
                          setSubjectWarning('');
                        }
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-white dark:bg-xedu-slate-950">
                        <SelectValue placeholder="Sinf tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {(classesData ?? []).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {subjectWarning && (
                    <p className="text-xs text-xedu-amber dark:text-amber-400 font-medium"> {subjectWarning}</p>
                  )}
                  <p className="text-xs text-violet-600 dark:text-violet-400 opacity-70">
                    Fan nomini yozib, sinf tanlang. Har bir fan alohida sinfga biriktiriladi.
                  </p>
                </div>
              </div>
            )}

            {/* Sinf rahbari → Sinf tanlash */}
            {watchedRole === 'class_teacher' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <GraduationCap className="h-4 w-4" /> Sinf rahbari sinfi
                </div>
                <Controller
                  name="classId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-white dark:bg-xedu-slate-950">
                        <SelectValue placeholder="Sinf tanlang..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(classesData ?? []).length === 0 ? (
                          <div className="px-3 py-2 text-sm text-xedu-slate-500">Sinflar topilmadi</div>
                        ) : (
                          (classesData ?? []).map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-emerald-600 dark:text-emerald-400 opacity-70">Sinf rahbari tanlangan sinfga avtomatik biriktiriladi</p>
              </div>
            )}

            {/* O'quvchi → Sinf tanlash */}
            {watchedRole === 'student' && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                  <GraduationCap className="h-4 w-4" /> O'quvchi uchun sinf
                </div>
                <Controller
                  name="classId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-white dark:bg-white dark:bg-xedu-slate-950">
                        <SelectValue placeholder="Sinf tanlang (ixtiyoriy)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(classesData ?? []).map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-blue-600 dark:text-blue-400 opacity-70">O'quvchi tanlangan sinfga avtomatik qo'shiladi</p>
              </div>
            )}

            {/* Ota-ona → O'quvchi bog'lash */}
            {watchedRole === 'parent' && (
              <div className="rounded-lg border border-pink-200 bg-pink-50 dark:bg-pink-950/20 dark:border-pink-800 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-pink-700 dark:text-pink-400">
                  <Heart className="h-4 w-4" /> Farzand (o'quvchi)
                </div>
                <Controller
                  name="studentId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger className="bg-white dark:bg-white dark:bg-xedu-slate-950">
                        <SelectValue placeholder="O'quvchi tanlang (ixtiyoriy)..." />
                      </SelectTrigger>
                      <SelectContent>
                        {studentsList.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-xedu-slate-500 dark:text-xedu-slate-400">O'quvchilar topilmadi</div>
                        ) : (
                          studentsList.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-pink-600 dark:text-pink-400 opacity-70">Ota-ona o'quvchi bilan avtomatik bog'lanadi</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Btn type="button" variant="secondary" onClick={() => setOpen(false)}>Bekor qilish</Btn>
              <Btn type="submit" variant="primary" loading={isSubmitting} icon={<UserCheck className="h-4 w-4" />}>
                Qo&apos;shish
              </Btn>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign existing user to branch dialog */}
      {checkEmailResult && (
        <AssignBranchDialog
          existingUser={checkEmailResult}
          targetBranchId={watchedBranchId || activeBranchId || ''}
          targetBranchName={branchesList.find((b: any) => b.id === (watchedBranchId || activeBranchId))?.name}
          open={!!checkEmailResult}
          onClose={() => setCheckEmailResult(null)}
          onSuccess={() => {
            setOpen(false);
            reset();
          }}
        />
      )}

      {/* Excel import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type="users"
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </PageShell>
  );
}
