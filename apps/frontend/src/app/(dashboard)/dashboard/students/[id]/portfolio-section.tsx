'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { subjectsApi } from '@/lib/api/subjects';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import {
  Trophy, Medal, Languages, Award, Palette, Star, Plus, CheckCircle2,
  FileText, Pencil, Trash2, ExternalLink, Loader2, Upload, Coins, ShieldCheck,
} from 'lucide-react';
import {
  portfolioApi, type PortfolioCategory, type PortfolioLevel,
  type CreatePortfolioPayload,
} from '@/lib/api/portfolio';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/store/confirm.store';
import { cn } from '@/lib/utils';

const CATEGORY: Record<PortfolioCategory, { label: string; icon: React.ElementType; color: string }> = {
  sport: { label: 'Sport', icon: Trophy, color: 'text-amber-600 bg-amber-100' },
  language_certificate: { label: 'Til sertifikati', icon: Languages, color: 'text-blue-600 bg-blue-100' },
  olympiad: { label: 'Olimpiada', icon: Medal, color: 'text-purple-600 bg-purple-100' },
  academic: { label: 'Akademik', icon: Award, color: 'text-green-600 bg-green-100' },
  arts: { label: "San'at", icon: Palette, color: 'text-pink-600 bg-pink-100' },
  other: { label: 'Boshqa', icon: Star, color: 'text-slate-600 bg-slate-100' },
};

const LEVEL: Record<PortfolioLevel, string> = {
  school: 'Maktab', district: 'Tuman', region: 'Viloyat', republic: 'Respublika', international: 'Xalqaro',
};

const CATEGORY_OPTS = Object.entries(CATEGORY).map(([v, c]) => ({ value: v as PortfolioCategory, label: c.label }));
const LEVEL_OPTS = Object.entries(LEVEL).map(([v, label]) => ({ value: v as PortfolioLevel, label }));

function fmt(d?: string | null) {
  if (!d) return '';
  try { return format(new Date(d), 'd MMM yyyy', { locale: uz }); } catch { return ''; }
}

type FormState = Partial<CreatePortfolioPayload> & { id?: string };

export function PortfolioSection({
  studentId,
  classId,
  items,
  summary,
  onChanged,
}: {
  studentId: string;
  classId?: string;
  items: any[];
  summary: { total: number; verified: number; byCategory: Record<string, number> };
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const ask = useConfirm();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({});
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sinf fanlari — KPI ballini fan o'qituvchisiga biriktirish uchun
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', 'by-class', classId],
    queryFn: () => subjectsApi.getAll(classId),
    enabled: !!classId,
  });

  const openCreate = () => {
    setForm({ studentId, category: 'olympiad', coinReward: 0 });
    setOpen(true);
  };
  const openEdit = (it: any) => {
    setForm({
      id: it.id, studentId, subjectId: it.subjectId ?? it.subject?.id ?? undefined,
      category: it.category, title: it.title,
      level: it.level ?? undefined, result: it.result ?? '', issuer: it.issuer ?? '',
      achievedAt: it.achievedAt?.slice(0, 10), expiresAt: it.expiresAt?.slice(0, 10) ?? '',
      fileUrl: it.fileUrl ?? '', description: it.description ?? '', coinReward: it.coinReward ?? 0,
    });
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: any = {
        category: form.category, title: form.title, level: form.level || undefined,
        subjectId: form.subjectId || undefined,
        result: form.result || undefined, issuer: form.issuer || undefined,
        achievedAt: form.achievedAt, expiresAt: form.expiresAt || undefined,
        fileUrl: form.fileUrl || undefined, description: form.description || undefined,
        coinReward: form.coinReward ?? 0,
      };
      return form.id
        ? portfolioApi.update(form.id, payload)
        : portfolioApi.create({ ...payload, studentId });
    },
    onSuccess: () => {
      toast({ title: form.id ? 'Yutuq yangilandi ' : "Yutuq qo'shildi " });
      setOpen(false);
      onChanged();
    },
    onError: () => toast({ title: 'Xatolik', description: 'Saqlanmadi', variant: 'destructive' }),
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => portfolioApi.verify(id),
    onSuccess: (res: any) => {
      const parts: string[] = [];
      if (res.coinAwarded > 0) parts.push(`${res.coinAwarded} coin`);
      if (res.teacherPointsAwarded > 0) parts.push(`o'qituvchiga ${res.teacherPointsAwarded} KPI ball`);
      toast({
        title: 'Tasdiqlandi ',
        description: parts.length ? parts.join(' · ') + ' berildi' : undefined,
      });
      onChanged();
    },
    onError: () => toast({ title: 'Xatolik', description: 'Tasdiqlanmadi', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => portfolioApi.remove(id),
    onSuccess: () => { toast({ title: "O'chirildi" }); onChanged(); },
    onError: () => toast({ title: 'Xatolik', variant: 'destructive' }),
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await portfolioApi.uploadFile(file);
      setForm((f) => ({ ...f, fileUrl: url }));
      toast({ title: 'Fayl yuklandi ' });
    } catch {
      toast({ title: 'Xatolik', description: 'Fayl yuklanmadi', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary + add */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">Jami: {summary.total}</Badge>
          <Badge variant="success">Tasdiqlangan: {summary.verified}</Badge>
          {Object.entries(summary.byCategory).map(([cat, n]) => (
            <Badge key={cat} variant="outline">{CATEGORY[cat as PortfolioCategory]?.label ?? cat}: {n}</Badge>
          ))}
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Yutuq qo'shish
        </Button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 gap-2">
            <Trophy className="h-8 w-8 text-xedu-slate-300" />
            <p className="text-sm text-xedu-slate-500">Hozircha yutuq kiritilmagan</p>
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Birinchi yutuqni qo'shish
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((it: any) => {
            const cat = CATEGORY[it.category as PortfolioCategory] ?? CATEGORY.other;
            const Icon = cat.icon;
            return (
              <Card key={it.id} className={cn(!it.verified && 'border-dashed')}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className={cn('rounded-lg p-2 shrink-0', cat.color)}><Icon className="h-5 w-5" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{it.title}</p>
                        {it.verified
                          ? <Badge variant="success" className="gap-1"><ShieldCheck className="h-3 w-3" /> Tasdiqlangan</Badge>
                          : <Badge variant="warning">Tasdiqlanmagan</Badge>}
                      </div>
                      <p className="text-xs text-xedu-slate-500 mt-0.5">
                        {cat.label}
                        {it.level && ` · ${LEVEL[it.level as PortfolioLevel]}`}
                        {it.result && ` · ${it.result}`}
                      </p>
                      {it.issuer && <p className="text-xs text-xedu-slate-400">{it.issuer}</p>}
                      {it.subject?.name && <p className="text-xs text-xedu-slate-400">Fan: {it.subject.name}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-xedu-slate-500 flex-wrap">
                    <span>{fmt(it.achievedAt)}</span>
                    {it.expiresAt && <span>· Muddat: {fmt(it.expiresAt)}</span>}
                    {it.coinReward > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-amber-600">
                        <Coins className="h-3 w-3" /> {it.coinReward}
                      </span>
                    )}
                    {it.fileUrl && (
                      <a href={it.fileUrl} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-0.5 text-xedu-primary hover:underline">
                        <FileText className="h-3 w-3" /> Sertifikat <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>

                  {it.description && <p className="text-xs text-xedu-slate-600 dark:text-xedu-slate-300">{it.description}</p>}

                  <div className="flex items-center gap-1 pt-1 border-t">
                    {!it.verified && (
                      <Button variant="ghost" size="sm" className="text-green-600"
                        onClick={() => verifyMutation.mutate(it.id)} disabled={verifyMutation.isPending}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Tasdiqlash
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => openEdit(it)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600"
                      onClick={async () => {
                        if (await ask({ title: "Yutuqni o'chirishni tasdiqlang", description: it.title, variant: 'destructive', confirmText: "O'chirish" })) {
                          deleteMutation.mutate(it.id);
                        }
                      }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Yutuqni tahrirlash' : "Yangi yutuq"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Kategoriya</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as PortfolioCategory }))}>
                  <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Daraja</Label>
                <Select value={form.level ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, level: v as PortfolioLevel }))}>
                  <SelectTrigger><SelectValue placeholder="Ixtiyoriy" /></SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Nomi *</Label>
              <Input value={form.title ?? ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Masalan: IELTS, Respublika matematika olimpiadasi" />
            </div>

            <div className="space-y-1">
              <Label>Mas'ul fan {subjects.length === 0 && <span className="text-xs text-xedu-slate-400">(sinf fanlari topilmadi)</span>}</Label>
              <Select value={form.subjectId ?? ''} onValueChange={(v) => setForm((f) => ({ ...f, subjectId: v }))}>
                <SelectTrigger><SelectValue placeholder="Ixtiyoriy — KPI balli fan o'qituvchisiga beriladi" /></SelectTrigger>
                <SelectContent>
                  {(subjects as any[]).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}{s.teacher ? ` — ${s.teacher.firstName} ${s.teacher.lastName}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Natija</Label>
                <Input value={form.result ?? ''} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}
                  placeholder="1-o'rin / 7.5 / B2" />
              </div>
              <div className="space-y-1">
                <Label>Tashkilot</Label>
                <Input value={form.issuer ?? ''} onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                  placeholder="British Council" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Erishilgan sana *</Label>
                <Input type="date" value={form.achievedAt ?? ''} onChange={(e) => setForm((f) => ({ ...f, achievedAt: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Amal muddati</Label>
                <Input type="date" value={form.expiresAt ?? ''} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Tasdiqlanganda coin</Label>
              <Input type="number" min={0} max={1000} value={form.coinReward ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, coinReward: Number(e.target.value) }))} />
            </div>

            {/* File upload */}
            <div className="space-y-1">
              <Label>Sertifikat / diplom fayli</Label>
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={handleFile} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  Fayl yuklash
                </Button>
                {form.fileUrl && (
                  <a href={form.fileUrl} target="_blank" rel="noopener noreferrer"
                     className="text-xs text-xedu-primary hover:underline inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Ko'rish
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Izoh</Label>
              <Textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Bekor qilish</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title || !form.achievedAt || !form.category}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
