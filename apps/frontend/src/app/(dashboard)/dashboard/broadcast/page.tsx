'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Megaphone, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { superAdminApi } from '@/lib/api/super-admin';
import { useToast } from '@/components/ui/use-toast';

const ALL_SCHOOLS = '__all__';

export default function BroadcastPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    schoolId: ALL_SCHOOLS,
    title: '',
    body: '',
    priority: 'normal',
  });
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: schoolsData } = useQuery({
    queryKey: ['schools', 'broadcast-list'],
    queryFn: () => superAdminApi.getSchools({ page: 1, limit: 100 }),
  });
  const schools: any[] = schoolsData?.data ?? [];

  const mutation = useMutation({
    mutationFn: () =>
      superAdminApi.broadcast({
        title: form.title.trim(),
        body: form.body.trim(),
        priority: form.priority,
        ...(form.schoolId !== ALL_SCHOOLS ? { schoolId: form.schoolId } : {}),
      }),
    onSuccess: (data) => {
      setShowConfirm(false);
      setForm((f) => ({ ...f, title: '', body: '' }));
      toast({
        title: "E'lon yuborildi",
        description: data.message + (data.skipped ? ` (${data.skipped} ta o'tkazib yuborildi)` : ''),
      });
    },
    onError: (err: any) => {
      setShowConfirm(false);
      toast({
        title: 'Xatolik',
        description: err?.response?.data?.message || "E'lon yuborishda xatolik",
        variant: 'destructive',
      });
    },
  });

  const canSubmit = form.title.trim().length >= 3 && form.body.trim().length >= 3;
  const targetLabel =
    form.schoolId === ALL_SCHOOLS
      ? 'barcha faol maktablar direktorlariga'
      : `"${schools.find((s) => s.id === form.schoolId)?.name ?? ''}" maktabi direktorlariga`;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Platforma e&apos;loni
        </h1>
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400 mt-1">
          Maktab direktorlariga in-app bildirishnoma yuborish
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Yangi e&apos;lon</CardTitle>
          <CardDescription>
            E&apos;lon tanlangan maktab(lar)ning faol direktorlariga qo&apos;ng&apos;iroqcha
            bildirishnomasi sifatida boradi
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Qabul qiluvchi</Label>
              <Select
                value={form.schoolId}
                onValueChange={(v) => setForm((f) => ({ ...f, schoolId: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SCHOOLS}>Barcha maktablar</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Muhimlik</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Past</SelectItem>
                  <SelectItem value="normal">Oddiy</SelectItem>
                  <SelectItem value="urgent">Shoshilinch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="broadcast-title">Sarlavha</Label>
            <Input
              id="broadcast-title"
              placeholder="Masalan: Yangi funksiya — Obuna boshqaruvi"
              maxLength={200}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="broadcast-body">Matn</Label>
            <Textarea
              id="broadcast-body"
              rows={6}
              maxLength={5000}
              placeholder="E'lon matnini kiriting..."
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            />
            <p className="text-xs text-xedu-slate-500 text-right">{form.body.length}/5000</p>
          </div>

          <div className="flex justify-end">
            <Button disabled={!canSubmit || mutation.isPending} onClick={() => setShowConfirm(true)}>
              <Send className="mr-1.5 h-4 w-4" />
              Yuborish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={(v) => { if (!v) setShowConfirm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              E&apos;lonni yuborishni tasdiqlang
            </DialogTitle>
            <DialogDescription className="pt-1">
              &quot;<span className="font-semibold text-foreground">{form.title}</span>&quot; e&apos;loni{' '}
              {targetLabel} yuboriladi. Yuborilgach qaytarib bo&apos;lmaydi.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} disabled={mutation.isPending}>
              Bekor qilish
            </Button>
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending
                ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                : <Send className="mr-1.5 h-4 w-4" />}
              Yuborish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
