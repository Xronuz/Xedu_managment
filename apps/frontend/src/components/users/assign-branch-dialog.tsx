'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, UserCheck, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usersApi } from '@/lib/api/users';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import { getRoleLabel, cn } from '@/lib/utils';
import { Btn } from '@/components/ui/page-ui';

interface ExistingUser {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  primaryBranchName: string | null;
  assignedBranches: { id: string; name: string }[];
}

interface AssignBranchDialogProps {
  existingUser: ExistingUser;
  targetBranchId: string;
  targetBranchName?: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ASSIGNABLE_ROLES = [
  { value: 'teacher', label: "O'qituvchi" },
  { value: 'class_teacher', label: 'Sinf rahbari' },
  { value: 'accountant', label: 'Buxgalter' },
  { value: 'librarian', label: 'Kutubxonachi' },
];

export function AssignBranchDialog({
  existingUser,
  targetBranchId,
  targetBranchName,
  open,
  onClose,
  onSuccess,
}: AssignBranchDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const [role, setRole] = useState(existingUser.role);

  const assignedNames = existingUser.assignedBranches.map((b) => b.name);
  if (existingUser.primaryBranchName) assignedNames.unshift(existingUser.primaryBranchName);
  const uniqueBranches = Array.from(new Set(assignedNames));

  const mutation = useMutation({
    mutationFn: () => usersApi.assignBranch(existingUser.id, targetBranchId, role),
    onSuccess: async () => {
      toast({ title: '✅ Foydalanuvchi filialga biriktirildi' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // Agar joriy foydalanuvchi o'zini assignment'ini o'zgartirsa, JWT refresh
      if (existingUser.id === currentUser?.id) {
        try {
          const tokens = await authApi.refresh();
          const updatedAssigned = Array.from(new Set([...(currentUser.assignedBranchIds ?? []), targetBranchId]));
          setAuth({ ...currentUser, assignedBranchIds: updatedAssigned }, tokens);
        } catch {
          // ignore refresh errors
        }
      }
      onSuccess();
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({
        variant: 'destructive',
        title: 'Xato',
        description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik yuz berdi',
      });
    },
  });

  const alreadyAssigned = existingUser.assignedBranches.some((b) => b.id === targetBranchId);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-500" />
            Bu xodim allaqachon mavjud
          </DialogTitle>
          <DialogDescription>
            {existingUser.firstName} {existingUser.lastName} ({getRoleLabel(existingUser.role)})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Biriktirilgan filiallar */}
          {uniqueBranches.length > 0 && (
            <div className="rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-800/60 p-2.5 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-xedu-slate-400">Hozirgi filiallar</p>
              <div className="flex flex-wrap gap-1">
                {uniqueBranches.map((name, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full bg-white dark:bg-xedu-slate-700 border border-xedu-slate-100 dark:border-xedu-slate-600 text-[11px] font-medium text-xedu-slate-600 dark:text-xedu-slate-300">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Target filial */}
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1">Qo'shiladigan filial</p>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">{targetBranchName ?? targetBranchId}</p>
          </div>

          {/* Role selection */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wide text-xedu-slate-400">Ushbu filial uchun rol</p>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Rol tanlang..." />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {alreadyAssigned && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-2.5 text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs font-medium">Bu xodim allaqachon ushbu filialga biriktirilgan. Qayta tasdiqlash faqat rolni yangilaydi.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Btn variant="secondary" onClick={onClose}>Bekor</Btn>
          <Btn
            variant="primary"
            icon={<UserCheck className="h-4 w-4" />}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Filialga qo&apos;shish
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
