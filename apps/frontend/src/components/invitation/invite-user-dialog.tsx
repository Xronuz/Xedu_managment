'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Send, Loader2, AlertTriangle, CheckCircle2, Users, GraduationCap } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { invitationsApi } from '@/lib/api/invitations';
import { useToast } from '@/components/ui/use-toast';
import { ROLES, type UserRole } from '@/config/permissions';

const inviteSchema = z.object({
  email: z.string().email("Email noto'g'ri formatda"),
  firstName: z.string().min(1, 'Ism kiritilishi shart'),
  lastName: z.string().min(1, 'Familiya kiritilishi shart'),
  role: z.string().min(1, 'Rol tanlanishi shart'),
});

type InviteForm = z.infer<typeof inviteSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultRole?: UserRole;
}

export function InviteUserDialog({ open, onOpenChange, defaultRole }: InviteUserDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InviteForm>({
    email: '', firstName: '', lastName: '', role: defaultRole ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: () => invitationsApi.create(form),
    onSuccess: () => {
      toast({ title: 'Taklif yuborildi', description: `${form.email} manziliga taklif xabari yuborildi.` });
      setSent(true);
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Xatolik yuz berdi';
      setErrors({ api: msg });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = inviteSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.errors.forEach((err) => { if (err.path[0]) fieldErrors[err.path[0]] = err.message; });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    mutation.mutate();
  };

  const reset = () => {
    setForm({ email: '', firstName: '', lastName: '', role: defaultRole ?? '' });
    setErrors({});
    setSent(false);
  };

  const roleOptions = ROLES.filter((r) => r.value !== 'super_admin');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-xedu-primary" />
            Xodimni taklif qilish
          </DialogTitle>
          <DialogDescription>
            Foydalanuvchi elektron pochtasiga taklif havolasi yuboriladi. U havola orqali o'z parolini o'rnatadi.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-4 space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-xedu-primary-light/60">
              <CheckCircle2 className="h-7 w-7 text-xedu-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">Taklif yuborildi</p>
              <p className="text-sm text-xedu-slate-500">
                <span className="font-medium">{form.email}</span> manziliga taklif xabari yuborildi.
                Foydalanuvchi havolani ochib, hisobini faollashtirishi mumkin.
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={reset}>
                <Send className="mr-1.5 h-4 w-4" />
                Yana yuborish
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Yopish
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-firstName" className="text-sm font-medium">Ism</Label>
                <Input id="inv-firstName" value={form.firstName} onChange={(e) => { setForm(p => ({ ...p, firstName: e.target.value })); setErrors((p) => { const n = { ...p }; delete n.firstName; return n; }); }} placeholder="Ism" />
                {errors.firstName && <p className="text-xs text-xedu-ruby">{errors.firstName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-lastName" className="text-sm font-medium">Familiya</Label>
                <Input id="inv-lastName" value={form.lastName} onChange={(e) => { setForm(p => ({ ...p, lastName: e.target.value })); setErrors((p) => { const n = { ...p }; delete n.lastName; return n; }); }} placeholder="Familiya" />
                {errors.lastName && <p className="text-xs text-xedu-ruby">{errors.lastName}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-xedu-slate-400" />
                <Input id="inv-email" type="email" value={form.email} onChange={(e) => { setForm(p => ({ ...p, email: e.target.value })); setErrors((p) => { const n = { ...p }; delete n.email; return n; }); }} placeholder="siz@maktab.uz" className="pl-10" />
              </div>
              {errors.email && <p className="text-xs text-xedu-ruby">{errors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="inv-role" className="text-sm font-medium">Rol</Label>
              <Select value={form.role} onValueChange={(v) => { setForm(p => ({ ...p, role: v })); setErrors((p) => { const n = { ...p }; delete n.role; return n; }); }}>
                <SelectTrigger id="inv-role" className="w-full">
                  <SelectValue placeholder="Rol tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-xedu-ruby">{errors.role}</p>}
            </div>

            {errors.api && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-xedu-ruby/20 bg-xedu-ruby/8 px-3 py-2.5 text-sm text-xedu-ruby">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{errors.api}
              </div>
            )}

            <div className="bg-xedu-sky/5 border border-xedu-sky/10 rounded-xl p-3 text-xs text-xedu-sky flex items-start gap-2">
              <GraduationCap className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Taklif qilingan foydalanuvchi elektron pochtasiga xavfsiz havola yuboriladi.
                U havolani ochib, o'z parolini o'rnatadi va tizimga kiradi.
              </p>
            </div>

            <Button type="submit" className="w-full h-11 font-semibold" disabled={mutation.isPending} size="lg">
              {mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Yuborilmoqda...</> : <><Send className="mr-2 h-4 w-4" />Taklif yuborish</>}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
