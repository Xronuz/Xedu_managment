'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { uz } from 'date-fns/locale';
import {
  ArrowLeft, GraduationCap, CalendarDays, Phone, Mail, MapPin, User2,
  ShieldAlert, ClipboardCheck, BookOpen, Coins, Users, HeartPulse,
  Pencil, Loader2, Cake, IdCard, Droplet, CheckCircle2, XCircle, Clock, AlertCircle, Trophy,
} from 'lucide-react';
import { PortfolioSection } from './portfolio-section';
import { studentsApi, type StudentProfile, type UpdateStudentPayload } from '@/lib/api/students';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { getInitials, cn } from '@/lib/utils';

const ATT_CFG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  present: { label: 'Keldi', color: 'text-green-600', icon: CheckCircle2 },
  absent: { label: 'Kelmadi', color: 'text-red-600', icon: XCircle },
  late: { label: 'Kechikdi', color: 'text-yellow-600', icon: Clock },
  excused: { label: 'Uzrli', color: 'text-blue-600', icon: AlertCircle },
};

const DISC_TYPE: Record<string, string> = {
  behavior: 'Xulq-atvor', absence: 'Davomat', academic: 'Akademik', dress_code: 'Kiyim-kechak', other: 'Boshqa',
};
const DISC_SEVERITY: Record<string, { label: string; color: string }> = {
  low: { label: 'Yengil', color: 'bg-yellow-100 text-yellow-700' },
  medium: { label: "O'rta", color: 'bg-orange-100 text-orange-700' },
  high: { label: 'Og‘ir', color: 'bg-red-100 text-red-700' },
};
const GRADE_TYPE: Record<string, string> = {
  classwork: 'Darsda', homework: 'Uy vazifa', test: 'Test', exam: 'Imtihon', quarterly: 'Choraklik', final: 'Yakuniy',
};

function fmtDate(d?: string | null) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy', { locale: uz }); } catch { return '—'; }
}

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['student-profile', id],
    queryFn: () => studentsApi.getProfile(id),
    enabled: !!id,
  });

  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-xedu-slate-400" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <User2 className="h-12 w-12 text-xedu-slate-300" />
        <p className="text-lg font-semibold">O'quvchi topilmadi</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Orqaga
        </Button>
      </div>
    );
  }

  const s = profile.student;
  const cls = s.studentClasses?.[0]?.class;

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Orqaga
        </Button>
        <Button size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" /> Tahrirlash
        </Button>
      </div>

      {/* Identity header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-xedu-primary-light flex items-center justify-center text-2xl font-bold text-xedu-primary shrink-0">
              {getInitials(s.firstName, s.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{s.firstName} {s.lastName}</h1>
                <Badge variant={s.isActive ? 'default' : 'destructive'}>
                  {s.isActive ? 'Faol' : 'Nofaol'}
                </Badge>
              </div>
              <p className="text-sm text-xedu-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                {cls && <span className="inline-flex items-center gap-1"><GraduationCap className="h-4 w-4" /> {cls.name}</span>}
                {s.branch && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {s.branch.name}</span>}
                {s.studentIdNumber && <span className="inline-flex items-center gap-1"><IdCard className="h-4 w-4" /> {s.studentIdNumber}</span>}
              </p>
            </div>
            {/* Headline metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <Metric label="O'rt. baho" value={profile.academic.gpa.toFixed(1)} tone="primary" />
              <Metric label="Davomat" value={`${profile.attendance.presentRate}%`} tone={profile.attendance.presentRate >= 90 ? 'success' : profile.attendance.presentRate >= 75 ? 'warning' : 'danger'} />
              <Metric label="Coin" value={profile.gamification.coins} tone="amber" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} color="purple" value={profile.academic.gradeCount} label="Baholar soni" />
        <StatCard icon={ClipboardCheck} color="green" value={`${profile.attendance.present}/${profile.attendance.total}`} label="Keldi / jami" />
        <StatCard icon={ShieldAlert} color="red" value={profile.discipline.unresolved} label="Hal etilmagan intizom" />
        <StatCard icon={BookOpen} color="blue" value={`${profile.homework.submitted}`} label="Topshirgan uy vazifa" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="overview"><User2 className="h-4 w-4 mr-1" /> Umumiy</TabsTrigger>
          <TabsTrigger value="academic"><BookOpen className="h-4 w-4 mr-1" /> Akademik</TabsTrigger>
          <TabsTrigger value="attendance"><ClipboardCheck className="h-4 w-4 mr-1" /> Davomat</TabsTrigger>
          <TabsTrigger value="portfolio"><Trophy className="h-4 w-4 mr-1" /> Portfolio</TabsTrigger>
          <TabsTrigger value="discipline"><ShieldAlert className="h-4 w-4 mr-1" /> Intizom</TabsTrigger>
          <TabsTrigger value="more"><Coins className="h-4 w-4 mr-1" /> Qo'shimcha</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Shaxsiy ma'lumotlar</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <Field icon={Cake} label="Tug'ilgan sana" value={fmtDate(s.dateOfBirth)} />
                <Field icon={User2} label="Jinsi" value={s.gender === 'male' ? "O'g'il bola" : s.gender === 'female' ? 'Qiz bola' : '—'} />
                <Field icon={CalendarDays} label="Qabul sanasi" value={fmtDate(s.enrollmentDate)} />
                <Field icon={MapPin} label="Manzil" value={s.address ?? '—'} />
                <Field icon={Phone} label="Telefon" value={s.phone ?? '—'} />
                <Field icon={Mail} label="Email" value={s.email} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><HeartPulse className="h-4 w-4 text-red-500" /> Tibbiy va favqulodda</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                <Field icon={Droplet} label="Qon guruhi" value={s.bloodType ?? '—'} />
                <Field icon={HeartPulse} label="Tibbiy eslatma" value={s.medicalNotes ?? '—'} />
                <Field icon={User2} label="Favqulodda aloqa" value={s.emergencyContactName ?? '—'} />
                <Field icon={Phone} label="Favqulodda tel." value={s.emergencyContactPhone ?? '—'} />
              </CardContent>
            </Card>
          </div>

          {/* Parents */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Ota-onalar</CardTitle></CardHeader>
            <CardContent>
              {(s.childParents?.length ?? 0) === 0 ? (
                <p className="text-sm text-xedu-slate-500 py-2">Biriktirilgan ota-ona yo'q</p>
              ) : (
                <div className="divide-y">
                  {s.childParents!.map((cp) => (
                    <div key={cp.parent.id} className="flex items-center gap-3 py-2.5">
                      <div className="h-9 w-9 rounded-full bg-xedu-slate-100 dark:bg-xedu-slate-800 flex items-center justify-center text-xs font-bold text-xedu-slate-500">
                        {getInitials(cp.parent.firstName, cp.parent.lastName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{cp.parent.firstName} {cp.parent.lastName}</p>
                        <p className="text-xs text-xedu-slate-500">{cp.parent.phone ?? cp.parent.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Teacher notes */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Pencil className="h-4 w-4" /> Pedagogik kuzatuvlar</CardTitle></CardHeader>
            <CardContent>
              {s.teacherNotes
                ? <p className="text-sm whitespace-pre-wrap text-xedu-slate-700 dark:text-xedu-slate-300">{s.teacherNotes}</p>
                : <p className="text-sm text-xedu-slate-400">Hozircha kuzatuv yozilmagan. "Tahrirlash" orqali qo'shing.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACADEMIC */}
        <TabsContent value="academic" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={GraduationCap} color="purple" value={profile.academic.gpa.toFixed(2)} label="O'rtacha baho (5)" />
            <StatCard icon={BookOpen} color="blue" value={`${profile.academic.gpaPct}%`} label="Foiz" />
            <StatCard icon={BookOpen} color="green" value={profile.academic.gradeCount} label="Jami baho" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">So'nggi baholar</CardTitle></CardHeader>
            <CardContent>
              {profile.academic.recentGrades.length === 0 ? (
                <p className="text-sm text-xedu-slate-500 py-4 text-center">Baholar yo'q</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xedu-slate-500">
                        <th className="text-left py-2 px-2 font-medium">Fan</th>
                        <th className="text-left py-2 px-2 font-medium">Turi</th>
                        <th className="text-center py-2 px-2 font-medium">Ball</th>
                        <th className="text-left py-2 px-2 font-medium">Sana</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {profile.academic.recentGrades.map((g: any) => (
                        <tr key={g.id}>
                          <td className="py-2 px-2 font-medium">{g.subject?.name ?? '—'}</td>
                          <td className="py-2 px-2 text-xedu-slate-500">{GRADE_TYPE[g.type] ?? g.type}</td>
                          <td className="py-2 px-2 text-center">
                            <span className="font-bold">{g.score}</span>
                            <span className="text-xedu-slate-400">/{g.maxScore}</span>
                          </td>
                          <td className="py-2 px-2 text-xedu-slate-500">{fmtDate(g.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATTENDANCE */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['present', 'absent', 'late', 'excused'] as const).map((k) => {
              const Icon = ATT_CFG[k].icon;
              return (
                <Card key={k}>
                  <CardContent className="pt-4 flex items-center gap-3">
                    <Icon className={cn('h-6 w-6', ATT_CFG[k].color)} />
                    <div>
                      <p className="text-2xl font-bold">{(profile.attendance as any)[k]}</p>
                      <p className="text-xs text-xedu-slate-500">{ATT_CFG[k].label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Davomat tarixi</CardTitle>
              <CardDescription>Kelish ko'rsatkichi: {profile.attendance.presentRate}% ({profile.attendance.total} yozuv)</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.attendance.recent.length === 0 ? (
                <p className="text-sm text-xedu-slate-500 py-4 text-center">Davomat yozuvlari yo'q</p>
              ) : (
                <div className="divide-y">
                  {profile.attendance.recent.map((a: any) => {
                    const cfg = ATT_CFG[a.status] ?? ATT_CFG.present;
                    const Icon = cfg.icon;
                    return (
                      <div key={a.id} className="flex items-center gap-3 py-2 text-sm">
                        <Icon className={cn('h-4 w-4', cfg.color)} />
                        <span className="w-28 text-xedu-slate-600">{fmtDate(a.date)}</span>
                        <span className={cn('font-medium', cfg.color)}>{cfg.label}</span>
                        {a.schedule?.subject?.name && <span className="text-xedu-slate-400 text-xs">· {a.schedule.subject.name}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PORTFOLIO */}
        <TabsContent value="portfolio" className="mt-4">
          <PortfolioSection
            studentId={id}
            classId={cls?.id}
            items={profile.portfolio.items}
            summary={{
              total: profile.portfolio.total,
              verified: profile.portfolio.verified,
              byCategory: profile.portfolio.byCategory,
            }}
            onChanged={() => qc.invalidateQueries({ queryKey: ['student-profile', id] })}
          />
        </TabsContent>

        {/* DISCIPLINE */}
        <TabsContent value="discipline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Intizom hodisalari</CardTitle>
              <CardDescription>Jami: {profile.discipline.total} · Hal etilmagan: {profile.discipline.unresolved}</CardDescription>
            </CardHeader>
            <CardContent>
              {profile.discipline.incidents.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <p className="text-sm text-xedu-slate-500">Intizom buzilishi qayd etilmagan</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.discipline.incidents.map((d: any) => {
                    const sev = DISC_SEVERITY[d.severity] ?? DISC_SEVERITY.low;
                    return (
                      <div key={d.id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{DISC_TYPE[d.type] ?? d.type}</Badge>
                            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', sev.color)}>{sev.label}</span>
                            {d.resolved
                              ? <span className="text-xs text-green-600 font-medium">Hal etilgan</span>
                              : <span className="text-xs text-red-600 font-medium">Ochiq</span>}
                          </div>
                          <span className="text-xs text-xedu-slate-400">{fmtDate(d.date)}</span>
                        </div>
                        <p className="text-sm mt-2">{d.description}</p>
                        {d.reportedBy && (
                          <p className="text-xs text-xedu-slate-400 mt-1">Qayd etdi: {d.reportedBy.firstName} {d.reportedBy.lastName}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MORE */}
        <TabsContent value="more" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Uy vazifa</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-xedu-slate-500">Topshirgan</span><span className="font-semibold">{profile.homework.submitted}</span></div>
                <div className="flex justify-between"><span className="text-xedu-slate-500">Baholangan</span><span className="font-semibold">{profile.homework.graded}</span></div>
                <div className="flex justify-between"><span className="text-xedu-slate-500">O'rtacha ball</span><span className="font-semibold">{profile.homework.avgScore ?? '—'}</span></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Coins className="h-4 w-4 text-amber-500" /> Coin tarixi</CardTitle></CardHeader>
              <CardContent>
                {profile.gamification.recentTransactions.length === 0 ? (
                  <p className="text-sm text-xedu-slate-500 py-2">Tranzaksiya yo'q · Balans: {profile.gamification.coins}</p>
                ) : (
                  <div className="divide-y">
                    {profile.gamification.recentTransactions.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                        <span className="text-xedu-slate-500 text-xs">{t.comment ?? t.reason}</span>
                        <span className={cn('font-bold', t.amount >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {t.amount >= 0 ? '+' : ''}{t.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> To'garaklar</CardTitle></CardHeader>
            <CardContent>
              {profile.clubs.length === 0 ? (
                <p className="text-sm text-xedu-slate-500 py-2">A'zo bo'lgan to'garak yo'q</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.clubs.map((c) => (
                    <Badge key={c.id} variant="secondary">{c.name}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        student={s}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['student-profile', id] });
          toast({ title: 'Profil yangilandi ' });
        }}
      />
    </div>
  );
}

// ─── Small presentational helpers ──────────────────────────────────────────────

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone: string }) {
  const colors: Record<string, string> = {
    primary: 'text-xedu-primary', success: 'text-green-600', warning: 'text-yellow-600',
    danger: 'text-red-600', amber: 'text-amber-500',
  };
  return (
    <div>
      <p className={cn('text-xl font-bold tabular-nums', colors[tone])}>{value}</p>
      <p className="text-2xs text-xedu-slate-500">{label}</p>
    </div>
  );
}

function StatCard({ icon: Icon, color, value, label }: { icon: React.ElementType; color: string; value: React.ReactNode; label: string }) {
  const bg: Record<string, string> = {
    purple: 'bg-purple-100 text-purple-600', green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600', blue: 'bg-blue-100 text-blue-600',
  };
  return (
    <Card>
      <CardContent className="pt-4 flex items-center gap-3">
        <div className={cn('rounded-lg p-2 shrink-0', bg[color])}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-xedu-slate-500 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5 text-sm">
      <Icon className="h-4 w-4 text-xedu-slate-400 mt-0.5 shrink-0" />
      <span className="text-xedu-slate-500 w-32 shrink-0">{label}</span>
      <span className="font-medium text-xedu-slate-800 dark:text-xedu-slate-200 break-words">{value}</span>
    </div>
  );
}

// ─── Edit dialog ───────────────────────────────────────────────────────────────

function EditProfileDialog({
  open, onClose, student, onSaved,
}: {
  open: boolean;
  onClose: () => void;
  student: StudentProfile['student'];
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<UpdateStudentPayload>({});

  // Seed form whenever the dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        phone: student.phone ?? '',
        dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
        gender: student.gender ?? undefined,
        address: student.address ?? '',
        studentIdNumber: student.studentIdNumber ?? '',
        enrollmentDate: student.enrollmentDate ? student.enrollmentDate.slice(0, 10) : '',
        emergencyContactName: student.emergencyContactName ?? '',
        emergencyContactPhone: student.emergencyContactPhone ?? '',
        bloodType: student.bloodType ?? '',
        medicalNotes: student.medicalNotes ?? '',
        teacherNotes: student.teacherNotes ?? '',
      });
    }
  }, [open, student]);

  const mutation = useMutation({
    mutationFn: () => {
      // Only send non-empty values; normalise empty date strings to null
      const payload: UpdateStudentPayload = { ...form };
      payload.dateOfBirth = form.dateOfBirth ? form.dateOfBirth : null;
      payload.enrollmentDate = form.enrollmentDate ? form.enrollmentDate : null;
      return studentsApi.update(student.id, payload);
    },
    onSuccess: () => { onSaved(); onClose(); },
    onError: () => toast({ title: 'Xatolik', description: 'Saqlanmadi', variant: 'destructive' }),
  });

  const set = (k: keyof UpdateStudentPayload, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Profilni tahrirlash</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tug'ilgan sana</Label>
              <Input type="date" value={form.dateOfBirth ?? ''} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Jinsi</Label>
              <Select value={form.gender ?? ''} onValueChange={(v) => set('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">O'g'il bola</SelectItem>
                  <SelectItem value="female">Qiz bola</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Jurnal / ID raqami</Label>
              <Input value={form.studentIdNumber ?? ''} onChange={(e) => set('studentIdNumber', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Qabul sanasi</Label>
              <Input type="date" value={form.enrollmentDate ?? ''} onChange={(e) => set('enrollmentDate', e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Telefon</Label>
            <Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="+998..." />
          </div>
          <div className="space-y-1">
            <Label>Manzil</Label>
            <Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Favqulodda aloqa (ism)</Label>
              <Input value={form.emergencyContactName ?? ''} onChange={(e) => set('emergencyContactName', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Favqulodda tel.</Label>
              <Input value={form.emergencyContactPhone ?? ''} onChange={(e) => set('emergencyContactPhone', e.target.value)} placeholder="+998..." />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Qon guruhi</Label>
            <Input value={form.bloodType ?? ''} onChange={(e) => set('bloodType', e.target.value)} placeholder="O(I) Rh+" />
          </div>
          <div className="space-y-1">
            <Label>Tibbiy eslatma</Label>
            <Textarea value={form.medicalNotes ?? ''} onChange={(e) => set('medicalNotes', e.target.value)} rows={2} placeholder="Allergiya, surunkali kasallik..." />
          </div>
          <div className="space-y-1">
            <Label>Pedagogik kuzatuvlar</Label>
            <Textarea value={form.teacherNotes ?? ''} onChange={(e) => set('teacherNotes', e.target.value)} rows={3} placeholder="Sinf rahbari kuzatuvlari..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Bekor qilish</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
