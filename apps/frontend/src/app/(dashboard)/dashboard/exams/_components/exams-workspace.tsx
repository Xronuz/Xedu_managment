'use client';

import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from '@/components/workspace-system/use-debounced-value';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useConfirm } from '@/store/confirm.store';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { examsApi } from '@/lib/api/exams';
import { onlineExamApi, ExamQuestion } from '@/lib/api/online-exam';
import { classesApi } from '@/lib/api/classes';
import { subjectsApi } from '@/lib/api/subjects';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';

import {
  FileText, Plus, Calendar, CheckCircle, Clock, Loader2,
  Layers, Check, BarChart2, BookOpen, Trash2, HelpCircle,
  Users, Star, ChevronDown, ChevronUp, Search, X, Filter,
  Eye, ArrowRight, School, Trophy, BarChart3, TrendingUp,
  MonitorPlay, AlertTriangle, GraduationCap, FileQuestion,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import {
  WorkspaceShell, WorkspaceHeader, WorkspaceToolbar, WorkspaceMain, WorkspaceSidebar, WorkspaceSection,
  StatPill, QuickLink, InfoItem
} from '@/components/workspace-system';
import { OpTable } from '@/components/workspace-system/op-table';
import {
  PrimaryAction, SecondaryAction, IconAction, ActionBar,
} from '@/components/workspace-system/action-bar';
import { EntityPanel, EntityPanelProps } from '@/components/workspace-system/entity-panel';
import { FloatingBulkToolbar } from '@/components/director-workspace/floating-bulk-toolbar';

/* ═══════════════════════════════════════════════════════════════════════════════
   EXAMS WORKSPACE
   Institutional academic assessment operations workspace.
   ═══════════════════════════════════════════════════════════════════════════════ */

interface Exam {
  id: string;
  title: string;
  frequency: string;
  maxScore: number;
  duration?: number;
  scheduledAt: string;
  isPublished: boolean;
  classId: string;
  subjectId: string;
  class?: { id: string; name: string };
  subject?: { id: string; name: string };
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Haftalik', monthly: 'Oylik', quarterly: 'Choraklik', final: 'Yakuniy', on_demand: "Belgilangan",
};

const QTYPE_LABELS: Record<string, string> = {
  multiple_choice: "Ko'p variantli",
  true_false: "To'g'ri/Noto'g'ri",
  short_answer: 'Qisqa javob',
  essay: 'Insho',
};

const SINGLE_EMPTY = { classId: '', subjectId: '', title: '', frequency: '', maxScore: '100', scheduledAt: '', duration: '' };
const BULK_EMPTY = { title: '', frequency: '', maxScore: '100', scheduledAt: '', duration: '', classIds: [] as string[], subjectIds: [] as string[] };

// ── Exam Detail Dialog (Questions + Sessions) ─────────────────────────────────

function ExamDetailDialog({ exam, open, onClose, canManage }: {
  exam: any;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
}) {
  const ask = useConfirm();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [addingQ, setAddingQ] = useState(false);
  const [qForm, setQForm] = useState({
    type: 'multiple_choice',
    text: '',
    points: '1',
    explanation: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ],
  });

  const { data: questions = [], isLoading: qLoading } = useQuery({
    queryKey: ['online-exam', exam.id, 'questions'],
    queryFn: () => onlineExamApi.getQuestions(exam.id),
    enabled: open,
  });

  const { data: sessions = [], isLoading: sLoading } = useQuery({
    queryKey: ['online-exam', exam.id, 'sessions'],
    queryFn: () => onlineExamApi.getExamSessions(exam.id),
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: (payload: Parameters<typeof onlineExamApi.addQuestion>[1]) =>
      onlineExamApi.addQuestion(exam.id, payload),
    onSuccess: () => {
      toast({ title: "Savol qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['online-exam', exam.id, 'questions'] });
      setAddingQ(false);
      setQForm({ type: 'multiple_choice', text: '', points: '1', explanation: '', options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }] });
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (qId: string) => onlineExamApi.deleteQuestion(exam.id, qId),
    onSuccess: () => {
      toast({ title: "Savol o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['online-exam', exam.id, 'questions'] });
    },
  });

  const handleAddQ = () => {
    if (!qForm.text.trim()) { toast({ variant: 'destructive', title: 'Savol matnini kiriting' }); return; }
    const needsOptions = ['multiple_choice', 'true_false'].includes(qForm.type);
    const validOptions = qForm.options.filter(o => o.text.trim());
    if (needsOptions && validOptions.length < 2) {
      toast({ variant: 'destructive', title: 'Kamida 2 ta variant kiriting' }); return;
    }
    if (needsOptions && !validOptions.some(o => o.isCorrect)) {
      toast({ variant: 'destructive', title: "To'g'ri javobni belgilang" }); return;
    }
    addMutation.mutate({
      type: qForm.type,
      text: qForm.text.trim(),
      points: Number(qForm.points) || 1,
      explanation: qForm.explanation || undefined,
      options: needsOptions ? validOptions.map((o, i) => ({ text: o.text.trim(), isCorrect: o.isCorrect, order: i })) : undefined,
    });
  };

  const isTrueFalse = qForm.type === 'true_false';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" /> {exam.title}
          </DialogTitle>
          <DialogDescription>
            {exam.subject?.name && <span>{exam.subject.name} · </span>}
            {exam.class?.name && <span>{exam.class.name} · </span>}
            Max: {exam.maxScore} ball
            {exam.duration && <span> · {exam.duration} daqiqa</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="questions">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="questions">
              <HelpCircle className="mr-1.5 h-4 w-4" />
              Savollar {(questions as ExamQuestion[]).length > 0 && `(${(questions as ExamQuestion[]).length})`}
            </TabsTrigger>
            <TabsTrigger value="sessions">
              <Users className="mr-1.5 h-4 w-4" />
              Natijalar {(sessions as any[]).length > 0 && `(${(sessions as any[]).length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="space-y-3 mt-4">
            {qLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (questions as ExamQuestion[]).length === 0 && !addingQ ? (
              <div className="py-8 text-center text-xedu-slate-500 dark:text-xedu-slate-400">
                <HelpCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Hali savollar yo&apos;q</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(questions as ExamQuestion[]).map((q, i) => (
                  <div key={q.id} className="rounded-lg border bg-white dark:bg-xedu-slate-900">
                    <div className="flex items-start gap-3 p-3">
                      <span className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{q.text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-2xs px-1.5 py-0">{QTYPE_LABELS[q.type]}</Badge>
                          <span className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{q.points} ball</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}>
                          {expandedQ === q.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                        {canManage && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-xedu-ruby"
                            onClick={async () => { if (await ask({ title: "Savolni o'chirasizmi?", variant: 'destructive', confirmText: "O'chirish" })) deleteMutation.mutate(q.id); }}
                            disabled={deleteMutation.isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {expandedQ === q.id && q.options.length > 0 && (
                      <div className="px-3 pb-3 pt-0 space-y-1 border-t mt-1">
                        {q.options.map((opt, oi) => (
                          <div key={opt.id} className={`flex items-center gap-2 text-xs rounded px-2 py-1 ${opt.isCorrect ? 'bg-xedu-emerald-50 dark:bg-xedu-emerald-950/30 text-xedu-emerald-700 dark:text-xedu-emerald-400' : 'text-xedu-slate-500 dark:text-xedu-slate-400'}`}>
                            <span className="font-bold">{String.fromCharCode(65 + oi)}.</span>
                            <span>{opt.text}</span>
                            {opt.isCorrect && <CheckCircle className="ml-auto h-3.5 w-3.5 text-xedu-emerald-600 shrink-0" />}
                          </div>
                        ))}
                        {q.explanation && <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 italic mt-2 px-2">Izoh: {q.explanation}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canManage && addingQ && (
              <div className="rounded-lg border p-4 space-y-3 bg-xedu-slate-50 dark:bg-xedu-slate-800/60">
                <p className="text-sm font-medium">Yangi savol</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tur</Label>
                    <Select value={qForm.type} onValueChange={v => setQForm(f => ({
                      ...f, type: v,
                      options: v === 'true_false'
                        ? [{ text: "To'g'ri", isCorrect: false }, { text: "Noto'g'ri", isCorrect: false }]
                        : f.options,
                    }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(QTYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ball</Label>
                    <Input type="number" min="0.5" step="0.5" value={qForm.points}
                      onChange={e => setQForm(f => ({ ...f, points: e.target.value }))}
                      className="h-8 text-xs" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Savol matni</Label>
                  <Textarea rows={2} placeholder="Savol matnini kiriting..." value={qForm.text}
                    onChange={e => setQForm(f => ({ ...f, text: e.target.value }))}
                    className="text-sm resize-none" />
                </div>
                {['multiple_choice', 'true_false'].includes(qForm.type) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Variantlar (to&apos;g&apos;ri javobni belgilang)</Label>
                    <div className="space-y-1.5">
                      {(isTrueFalse ? qForm.options.slice(0, 2) : qForm.options).map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Checkbox
                            checked={opt.isCorrect}
                            onCheckedChange={checked => {
                              setQForm(f => ({
                                ...f,
                                options: f.options.map((o, idx) => ({ ...o, isCorrect: idx === i ? !!checked : false })),
                              }));
                            }}
                          />
                          <Input
                            value={opt.text}
                            onChange={e => setQForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, text: e.target.value } : o) }))}
                            placeholder={isTrueFalse ? (i === 0 ? "To'g'ri" : "Noto'g'ri") : `Variant ${String.fromCharCode(65 + i)}`}
                            className="h-7 text-xs flex-1"
                            readOnly={isTrueFalse}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Izoh (ixtiyoriy)</Label>
                  <Input placeholder="To'g'ri javob izohi..." value={qForm.explanation}
                    onChange={e => setQForm(f => ({ ...f, explanation: e.target.value }))}
                    className="h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddQ} disabled={addMutation.isPending}>
                    {addMutation.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                    Qo&apos;shish
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingQ(false)}>Bekor</Button>
                </div>
              </div>
            )}

            {canManage && !addingQ && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setAddingQ(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Savol qo&apos;shish
              </Button>
            )}
          </TabsContent>

          <TabsContent value="sessions" className="mt-4">
            {sLoading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
            ) : (sessions as any[]).length === 0 ? (
              <div className="py-8 text-center text-xedu-slate-500 dark:text-xedu-slate-400">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>Hali hech kim imtihon topshirmagan</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(sessions as any[]).map((s: any) => {
                  const statusColor = s.status === 'submitted' || s.status === 'graded' ? 'text-xedu-emerald-600' : s.status === 'timed_out' ? 'text-xedu-ruby-500' : 'text-xedu-sky-500';
                  const statusLabel = { in_progress: 'Jarayonda', submitted: 'Topshirildi', timed_out: 'Vaqt tugadi', graded: 'Baholandi', not_started: 'Boshlanmagan' }[s.status as string] ?? s.status;
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-white dark:bg-xedu-slate-900">
                      <div>
                        <p className="text-sm font-medium">{s.student?.firstName} {s.student?.lastName}</p>
                        <p className={`text-xs ${statusColor}`}>{statusLabel}</p>
                      </div>
                      <div className="text-right">
                        {s.score !== null && s.score !== undefined ? (
                          <p className="text-sm font-bold flex items-center gap-1 justify-end">
                            <Star className="h-3.5 w-3.5 text-xedu-amber-500" /> {s.score} / {exam.maxScore}
                          </p>
                        ) : <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">—</p>}
                        {s.percentage !== null && s.percentage !== undefined && (
                          <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{s.percentage}%</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Yopish</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Exam Entity Panel ─────────────────────────────────────────────────────────

function ExamPanel({ exam, open, onClose, canManage, onPublish }: {
  exam: Exam | null;
  open: boolean;
  onClose: () => void;
  canManage: boolean;
  onPublish?: (id: string) => void;
}) {
  const router = useRouter();
  if (!exam) return null;

  const isPast = new Date(exam.scheduledAt) < new Date();
  const status: EntityPanelProps['status'] = exam.isPublished ? (isPast ? 'resolved' : 'active') : 'pending';

  const tabs = [
    {
      id: 'overview',
      label: 'Umumiy',
      content: (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <InfoItem icon={School} label="Sinf" value={exam.class?.name ?? '—'} />
            <InfoItem icon={BookOpen} label="Fan" value={exam.subject?.name ?? '—'} />
            <InfoItem icon={Calendar} label="Sana" value={formatDate(exam.scheduledAt)} />
            <InfoItem icon={Clock} label="Davomiylik" value={exam.duration ? `${exam.duration} daq.` : '—'} />
            <InfoItem icon={Trophy} label="Max ball" value={String(exam.maxScore)} />
            <InfoItem icon={BarChart3} label="Tur" value={FREQUENCY_LABELS[exam.frequency] ?? exam.frequency} />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {canManage && !exam.isPublished && onPublish && (
              <PrimaryAction icon={<CheckCircle className="h-3.5 w-3.5" />} onClick={() => onPublish(exam.id)}>
                E&apos;lon qilish
              </PrimaryAction>
            )}
            <SecondaryAction icon={<BarChart2 className="h-3.5 w-3.5" />} onClick={() => router.push(`/dashboard/exams/${exam.id}`)}>
              Batafsil
            </SecondaryAction>
            {canManage && (
              <SecondaryAction icon={<BookOpen className="h-3.5 w-3.5" />} onClick={() => router.push(`/dashboard/exams/${exam.id}`)}>
                Savollar
              </SecondaryAction>
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <EntityPanel
      open={open}
      onClose={onClose}
      entityType="default"
      title={exam.title}
      subtitle={`${exam.class?.name ?? ''} · ${exam.subject?.name ?? ''}`}
      status={status}
      metrics={[
        { label: 'Max ball', value: exam.maxScore, tone: 'calm' },
        { label: 'Davomiylik', value: exam.duration ? `${exam.duration} daq.` : '—', tone: 'calm' },
        { label: 'Holat', value: exam.isPublished ? "E'lon qilingan" : 'Kutilmoqda', tone: exam.isPublished ? 'success' : 'attention' },
      ]}
      tabs={tabs}
    />
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────




// ── Main Workspace ────────────────────────────────────────────────────────────

export function ExamsWorkspace() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const ask = useConfirm();
  const canManage = ['director', 'vice_principal', 'teacher', 'class_teacher', 'branch_admin'].includes(user?.role ?? '');
  const isAdmin = ['director', 'vice_principal', 'branch_admin'].includes(user?.role ?? '');
  const isStudent = user?.role === 'student';

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('');
  const [filterTimeRange, setFilterTimeRange] = useState(''); // 'upcoming' | 'past' | ''
  const [filterPublished, setFilterPublished] = useState(''); // 'published' | 'draft' | ''
  const [showFilters, setShowFilters] = useState(false);


  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ['exams', filterClass, filterSubject],
    queryFn: () => examsApi.getAll({
      classId: filterClass || undefined,
      subjectId: filterSubject || undefined,
    }),
  });

  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
    enabled: canManage,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll(),
    enabled: canManage,
  });

  const classes: any[] = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? [];
  const subjects: any[] = Array.isArray(subjectsData) ? subjectsData : (subjectsData as any)?.data ?? [];

  // ── Filtered exams ───────────────────────────────────────────────────────────
  const now = new Date();
  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        if (!e.title.toLowerCase().includes(q)) return false;
      }
      if (filterClass && e.classId !== filterClass) return false;
      if (filterSubject && e.subjectId !== filterSubject) return false;
      if (filterFrequency && e.frequency !== filterFrequency) return false;
      if (filterTimeRange === 'upcoming' && new Date(e.scheduledAt) < now) return false;
      if (filterTimeRange === 'past' && new Date(e.scheduledAt) >= now) return false;
      if (filterPublished === 'published' && !e.isPublished) return false;
      if (filterPublished === 'draft' && e.isPublished) return false;
      return true;
    });
  }, [exams, debouncedSearch, filterClass, filterSubject, filterFrequency, filterTimeRange, filterPublished]);

  // ── Selection + Panel ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [panelExam, setPanelExam] = useState<Exam | null>(null);
  const [detailExam, setDetailExam] = useState<any | null>(null);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.length === filteredExams.length && filteredExams.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExams.map((e) => e.id));
    }
  }, [selectedIds.length, filteredExams]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── Create modals ────────────────────────────────────────────────────────────
  const [singleOpen, setSingleOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [sForm, setSForm] = useState(SINGLE_EMPTY);
  const [sErrors, setSErrors] = useState<Record<string, string>>({});
  const [bForm, setBForm] = useState(BULK_EMPTY);
  const [bErrors, setBErrors] = useState<Record<string, string>>({});

  const anyOpen = singleOpen || bulkOpen;

  const { data: modalClasses = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: classesApi.getAll,
    enabled: anyOpen,
  });

  const { data: modalSubjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectsApi.getAll(),
    enabled: anyOpen,
  });

  const openCreate = () => {
    setSForm(SINGLE_EMPTY);
    setSErrors({});
    setSingleOpen(true);
  };

  // ── Mutations ────────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: examsApi.create,
    onSuccess: () => {
      toast({ title: "Imtihon qo'shildi" });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setSingleOpen(false);
      setSForm(SINGLE_EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const handleSingleSubmit = () => {
    const e: Record<string, string> = {};
    if (!sForm.classId) e.classId = 'Sinf tanlang';
    if (!sForm.subjectId) e.subjectId = 'Fan tanlang';
    if (!sForm.title.trim()) e.title = 'Sarlavha kiriting';
    if (!sForm.frequency) e.frequency = 'Tur tanlang';
    if (!sForm.scheduledAt) e.scheduledAt = 'Sana kiriting';
    setSErrors(e);
    if (Object.keys(e).length) return;
    createMutation.mutate({
      classId: sForm.classId,
      subjectId: sForm.subjectId,
      title: sForm.title.trim(),
      frequency: sForm.frequency,
      maxScore: Number(sForm.maxScore) || 100,
      scheduledAt: new Date(sForm.scheduledAt).toISOString(),
      duration: sForm.duration ? Number(sForm.duration) : undefined,
    });
  };

  const bulkMutation = useMutation({
    mutationFn: examsApi.bulkCreate,
    onSuccess: (res: any) => {
      toast({ title: `${res.count ?? ''} ta imtihon yaratildi` });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      setBulkOpen(false);
      setBForm(BULK_EMPTY);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const toggleClass = (id: string) => setBForm(f => ({
    ...f, classIds: f.classIds.includes(id) ? f.classIds.filter(c => c !== id) : [...f.classIds, id],
  }));
  const toggleSubject = (id: string) => setBForm(f => ({
    ...f, subjectIds: f.subjectIds.includes(id) ? f.subjectIds.filter(s => s !== id) : [...f.subjectIds, id],
  }));

  const handleBulkSubmit = () => {
    const e: Record<string, string> = {};
    if (!bForm.title.trim()) e.title = 'Sarlavha kiriting';
    if (!bForm.frequency) e.frequency = 'Tur tanlang';
    if (!bForm.scheduledAt) e.scheduledAt = 'Sana kiriting';
    if (bForm.classIds.length === 0) e.classIds = 'Kamida 1 ta sinf tanlang';
    if (bForm.subjectIds.length === 0) e.subjectIds = 'Kamida 1 ta fan tanlang';
    setBErrors(e);
    if (Object.keys(e).length) return;
    bulkMutation.mutate({
      title: bForm.title.trim(),
      frequency: bForm.frequency,
      maxScore: Number(bForm.maxScore) || 100,
      scheduledAt: new Date(bForm.scheduledAt).toISOString(),
      duration: bForm.duration ? Number(bForm.duration) : undefined,
      classIds: bForm.classIds,
      subjectIds: bForm.subjectIds,
    });
  };

  const publishMutation = useMutation({
    mutationFn: (id: string) => examsApi.publish(id),
    onSuccess: () => {
      toast({ title: "E'lon qilindi" });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast({ variant: 'destructive', title: 'Xato', description: Array.isArray(msg) ? msg.join(', ') : msg ?? 'Xatolik' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => examsApi.remove(id),
    onSuccess: () => {
      toast({ title: "Imtihon o'chirildi" });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
  });

  // ── Active filter chips ──────────────────────────────────────────────────────
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (filterClass) {
      const c = classes.find((x: any) => x.id === filterClass);
      chips.push({ key: 'class', label: c?.name ?? 'Sinf', onClear: () => setFilterClass('') });
    }
    if (filterSubject) {
      const s = subjects.find((x: any) => x.id === filterSubject);
      chips.push({ key: 'subject', label: s?.name ?? 'Fan', onClear: () => setFilterSubject('') });
    }
    if (filterFrequency) {
      chips.push({ key: 'frequency', label: FREQUENCY_LABELS[filterFrequency] ?? filterFrequency, onClear: () => setFilterFrequency('') });
    }
    if (filterTimeRange) {
      chips.push({ key: 'time', label: filterTimeRange === 'upcoming' ? 'Kelgusi' : "O'tgan", onClear: () => setFilterTimeRange('') });
    }
    if (filterPublished) {
      chips.push({ key: 'published', label: filterPublished === 'published' ? "E'lon qilingan" : 'Qoralama', onClear: () => setFilterPublished('') });
    }
    return chips;
  }, [filterClass, filterSubject, filterFrequency, filterTimeRange, filterPublished, classes, subjects]);

  // ── Intelligence ─────────────────────────────────────────────────────────────
  const upcomingExams = exams.filter((e) => new Date(e.scheduledAt) >= now);
  const pastExams = exams.filter((e) => new Date(e.scheduledAt) < now);
  const unpublishedExams = exams.filter((e) => !e.isPublished);

  const frequencyBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    exams.forEach((e) => { map.set(e.frequency, (map.get(e.frequency) || 0) + 1); });
    return Array.from(map.entries()).map(([freq, count]) => ({ freq, count, label: FREQUENCY_LABELS[freq] ?? freq }))
      .sort((a, b) => b.count - a.count);
  }, [exams]);

  const subjectBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    exams.forEach((e) => {
      const cur = map.get(e.subjectId) ?? { name: e.subject?.name ?? 'Nomaʼlum', count: 0 };
      cur.count++;
      map.set(e.subjectId, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [exams]);

  const nextExams = useMemo(() => {
    return upcomingExams
      .filter((e) => e.isPublished)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 5);
  }, [upcomingExams]);

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    {
      key: 'title',
      header: 'Sarlavha',
      cell: (e: Exam) => (
        <div className="min-w-0">
          <p className="font-semibold text-xedu-slate-900 dark:text-xedu-slate-100 text-xs truncate">{e.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-2xs px-1 py-0 h-4">
              {FREQUENCY_LABELS[e.frequency] ?? e.frequency}
            </Badge>
            {e.isPublished ? (
              <span className="text-2xs text-xedu-primary font-medium">E&apos;lon qilingan</span>
            ) : (
              <span className="text-2xs text-xedu-amber-500 font-medium">Qoralama</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Sinf',
      width: '90px',
      cell: (e: Exam) => (
        <span className="text-xs text-xedu-slate-600">{e.class?.name ?? '—'}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Fan',
      width: '100px',
      cell: (e: Exam) => (
        <span className="text-xs text-xedu-slate-600">{e.subject?.name ?? '—'}</span>
      ),
    },
    {
      key: 'date',
      header: 'Sana',
      width: '90px',
      cell: (e: Exam) => {
        const d = new Date(e.scheduledAt);
        const isUpcoming = d >= now;
        return (
          <div className="flex items-center gap-1">
            <Calendar className={cn('h-3 w-3 shrink-0', isUpcoming ? 'text-xedu-primary' : 'text-xedu-slate-400')} />
            <span className={cn('text-xs', isUpcoming ? 'text-xedu-slate-700 font-medium' : 'text-xedu-slate-400')}>
              {formatDate(e.scheduledAt)}
            </span>
          </div>
        );
      },
    },
    {
      key: 'score',
      header: 'Ball',
      width: '70px',
      align: 'center' as const,
      cell: (e: Exam) => (
        <span className="text-xs font-bold text-xedu-slate-700">{e.maxScore}</span>
      ),
    },
    {
      key: 'duration',
      header: 'Daq.',
      width: '60px',
      align: 'center' as const,
      cell: (e: Exam) => (
        <span className="text-xs text-xedu-slate-500">{e.duration ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Holat',
      width: '90px',
      cell: (e: Exam) => {
        const isPast = new Date(e.scheduledAt) < now;
        if (isPast) {
          return (
            <span className="inline-flex items-center gap-1 text-2xs font-bold text-xedu-slate-400">
              <CheckCircle className="h-3 w-3" /> Tugagan
            </span>
          );
        }
        return e.isPublished ? (
          <span className="inline-flex items-center gap-1 text-2xs font-bold text-xedu-primary">
            <CheckCircle className="h-3 w-3" /> Faol
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-2xs font-bold text-xedu-amber-500">
            <Clock className="h-3 w-3" /> Kutilmoqda
          </span>
        );
      },
    },
  ], []);

  const sel = (setState: any) => (k: string) => (v: string) => setState((f: any) => ({ ...f, [k]: v }));
  const inp = (setState: any) => (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setState((f: any) => ({ ...f, [k]: e.target.value }));

  return (
    <WorkspaceShell layout="two-column" density="compact">
      {/* Header */}
      <div className="w-full lg:col-span-2">
        <WorkspaceHeader
          title="Imtihonlar"
          subtitle={`${exams.length} ta imtihon · Baholash va nazorat`}
          icon={<Trophy className="h-5 w-5 text-xedu-slate-500" />}
          actions={
            canManage && (
              <ActionBar
                primary={
                  <PrimaryAction onClick={openCreate} icon={<Plus className="h-3.5 w-3.5" />}>
                    Yangi imtihon
                  </PrimaryAction>
                }
                secondary={
                  isAdmin ? (
                    <SecondaryAction onClick={() => { setBulkOpen(true); setBForm(BULK_EMPTY); setBErrors({}); }} icon={<Layers className="h-3.5 w-3.5" />}>
                      Ommaviy
                    </SecondaryAction>
                  ) : undefined
                }
              />
            )
          }
        />
      </div>

      {/* Toolbar */}
      <div className="w-full lg:col-span-2">
        <WorkspaceToolbar sticky>
          <div className="relative flex-1 min-w-[140px] sm:min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-xedu-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Imtihon nomi..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-800 dark:text-xedu-slate-200 outline-none focus:ring-1 focus:ring-xedu-primary"
            />
            {search && (
              <button onClick={() => { setSearch(''); }} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-3 w-3 text-xedu-slate-400" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors',
              showFilters || activeFilters.length > 0
                ? 'border-xedu-primary bg-xedu-primary-light text-xedu-primary'
                : 'border-xedu-slate-200 dark:border-xedu-slate-700 text-xedu-slate-600 hover:bg-xedu-slate-50'
            )}
          >
            <Filter className="h-3.5 w-3.5" />
            Filterlar
            {activeFilters.length > 0 && (
              <span className="ml-0.5 text-2xs font-bold px-1 py-0 rounded-full bg-xedu-primary text-white">
                {activeFilters.length}
              </span>
            )}
          </button>

          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 h-8 px-2 rounded-lg border border-xedu-primary bg-xedu-primary-light text-xs font-semibold text-xedu-primary"
            >
              {f.label}
              <button onClick={f.onClear} className="hover:text-xedu-ruby-500 transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {activeFilters.length > 0 && (
            <button
              onClick={() => { setFilterClass(''); setFilterSubject(''); setFilterFrequency(''); setFilterTimeRange(''); setFilterPublished(''); }}
              className="text-xs font-semibold text-xedu-slate-400 hover:text-xedu-ruby-500 transition-colors"
            >
              Tozalash
            </button>
          )}
        </WorkspaceToolbar>

        {showFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-2 pb-2">
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              <option value="">Barcha sinflar</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              <option value="">Barcha fanlar</option>
              {subjects.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select
              value={filterFrequency}
              onChange={(e) => setFilterFrequency(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              <option value="">Barcha turlar</option>
              {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            <select
              value={filterTimeRange}
              onChange={(e) => setFilterTimeRange(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              <option value="">Barcha vaqt</option>
              <option value="upcoming">Kelgusi</option>
              <option value="past">O&apos;tgan</option>
            </select>

            <select
              value={filterPublished}
              onChange={(e) => setFilterPublished(e.target.value)}
              className="h-8 px-2 rounded-lg border border-xedu-slate-200 dark:border-xedu-slate-700 bg-white dark:bg-xedu-slate-900 text-xs text-xedu-slate-700"
            >
              <option value="">Barcha holat</option>
              <option value="published">E&apos;lon qilingan</option>
              <option value="draft">Qoralama</option>
            </select>
          </div>
        )}
      </div>

      {/* Main: Exams table */}
      <WorkspaceMain>
        <OpTable
          columns={columns}
          rows={filteredExams}
          rowKey={(e) => e.id}
          density="compact"
          selectable
          selectedIds={selectedIds}
          onSelect={toggleSelect}
          onSelectAll={selectAll}
          rowTone={(e) => {
            const isPast = new Date(e.scheduledAt) < now;
            if (isPast) return 'muted';
            if (!e.isPublished) return 'attention';
            return 'neutral';
          }}
          rowActions={(e) => (
            <>
              <IconAction
                icon={<Eye className="h-3.5 w-3.5" />}
                title="Ko'rish"
                onClick={() => setPanelExam(e)}
                tone="primary"
              />
              {canManage && !e.isPublished && (
                <IconAction
                  icon={<CheckCircle className="h-3.5 w-3.5" />}
                  title="E'lon qilish"
                  onClick={async () => { if (await ask({ title: "Imtihon natijalarini e'lon qilishni tasdiqlang", description: "Imtihon natijalari e'lon qilinadi. Keyin o'zgartirib bo'lmaydi.", variant: 'destructive', confirmText: "E'lon qilish" })) publishMutation.mutate(e.id); }}
                  tone="primary"
                />
              )}
              {canManage && (
                <IconAction
                  icon={<BookOpen className="h-3.5 w-3.5" />}
                  title="Savollar"
                  onClick={() => setDetailExam(e)}
                />
              )}
              {!isStudent && (
                <IconAction
                  icon={<BarChart2 className="h-3.5 w-3.5" />}
                  title="Natijalar"
                  onClick={() => router.push(`/dashboard/exams/${e.id}`)}
                />
              )}
              {isStudent && e.isPublished && new Date(e.scheduledAt) >= now && (
                <IconAction
                  icon={<MonitorPlay className="h-3.5 w-3.5" />}
                  title="Boshlash"
                  onClick={() => router.push(`/exam/${e.id}/take`)}
                  tone="primary"
                />
              )}
              {isAdmin && (
                <IconAction
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  title="O'chirish"
                  tone="danger"
                  onClick={async () => { if (await ask({ title: "Imtihonni o'chirishni tasdiqlang", description: "Imtihon o'chiriladi. Barcha savollar va natijalar bekor bo'ladi.", variant: 'destructive', confirmText: "O'chirish" })) deleteMutation.mutate(e.id); }}
                />
              )}
            </>
          )}
          isLoading={isLoading}
          skeletonRows={6}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <FileText className="h-8 w-8 text-xedu-slate-300" />
              <p className="text-sm font-medium text-xedu-slate-500">Imtihonlar yo&apos;q</p>
              <p className="text-xs text-xedu-slate-400">
                {canManage ? "Yuqoridagi '+ Yangi imtihon' tugmasini bosib qo'shing" : "E'lon qilingan imtihonlar bu yerda ko'rinadi"}
              </p>
            </div>
          }
        />
      </WorkspaceMain>

      {/* Right sidebar: Assessment intelligence */}
      <WorkspaceSidebar width="narrow">
        <WorkspaceSection title="Umumiy ko'rsatkichlar" icon={<BarChart3 className="h-4 w-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <StatPill label="Jami" value={exams.length} />
            <StatPill label="Kelgusi" value={upcomingExams.length} tone={upcomingExams.length > 0 ? 'attention' : 'calm'} />
            <StatPill label="Tugagan" value={pastExams.length} tone="calm" />
            <StatPill label="Qoralama" value={unpublishedExams.length} tone={unpublishedExams.length > 0 ? 'attention' : 'calm'} />
          </div>
        </WorkspaceSection>

        {nextExams.length > 0 && (
          <WorkspaceSection title="Yaqin imtihonlar" icon={<Calendar className="h-4 w-4 text-xedu-primary" />}>
            <div className="space-y-1">
              {nextExams.map((e) => (
                <button
                  key={e.id}
                  onClick={() => setPanelExam(e)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <Clock className="h-3.5 w-3.5 text-xedu-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">{e.title}</p>
                    <p className="text-2xs text-xedu-slate-400">{e.class?.name} · {formatDate(e.scheduledAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {frequencyBreakdown.length > 0 && (
          <WorkspaceSection title="Tur bo'yicha" icon={<TrendingUp className="h-4 w-4" />}>
            <div className="space-y-1">
              {frequencyBreakdown.map((f) => (
                <div key={f.freq} className="flex items-center justify-between rounded-md px-2 py-1.5">
                  <span className="text-xs font-medium text-xedu-slate-600">{f.label}</span>
                  <span className="text-xs font-bold tabular-nums text-xedu-slate-700">{f.count}</span>
                </div>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {subjectBreakdown.length > 0 && (
          <WorkspaceSection title="Fan bo'yicha" icon={<GraduationCap className="h-4 w-4" />}>
            <div className="space-y-1">
              {subjectBreakdown.map((s) => (
                <div key={s.name} className="flex items-center justify-between rounded-md px-2 py-1.5">
                  <span className="text-xs font-medium text-xedu-slate-600 truncate">{s.name}</span>
                  <span className="text-xs font-bold tabular-nums text-xedu-slate-700">{s.count}</span>
                </div>
              ))}
            </div>
          </WorkspaceSection>
        )}

        {unpublishedExams.length > 0 && (
          <WorkspaceSection title="Qoralamalar" icon={<AlertTriangle className="h-4 w-4 text-xedu-amber-500" />}>
            <div className="space-y-1">
              {unpublishedExams.slice(0, 5).map((e) => (
                <button
                  key={e.id}
                  onClick={() => setPanelExam(e)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-800 transition-colors"
                >
                  <FileQuestion className="h-3.5 w-3.5 text-xedu-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-xedu-slate-700 truncate">{e.title}</p>
                    <p className="text-2xs text-xedu-slate-400">{e.class?.name} · {formatDate(e.scheduledAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          </WorkspaceSection>
        )}

        <WorkspaceSection title="Tezkor havolalar">
          <div className="space-y-1">
            <QuickLink href="/dashboard/classes" icon={School} label="Sinflar" />
            <QuickLink href="/dashboard/students" icon={Users} label="O'quvchilar" />
            <QuickLink href="/dashboard/attendance" icon={Calendar} label="Davomat" />
            <QuickLink href="/dashboard/reports" icon={BarChart3} label="Hisobotlar" />
          </div>
        </WorkspaceSection>
      </WorkspaceSidebar>

      {/* Exam Entity Panel */}
      <ExamPanel
        exam={panelExam}
        open={!!panelExam}
        onClose={() => setPanelExam(null)}
        canManage={canManage}
        onPublish={canManage ? async (id) => { if (await ask({ title: "Imtihon natijalarini e'lon qilishni tasdiqlang", description: "Imtihon natijalari e'lon qilinadi. Keyin o'zgartirib bo'lmaydi.", variant: 'destructive', confirmText: "E'lon qilish" })) publishMutation.mutate(id); } : undefined}
      />

      {/* Exam Detail Dialog (Questions + Sessions) */}
      {detailExam && (
        <ExamDetailDialog
          exam={detailExam}
          open={!!detailExam}
          onClose={() => setDetailExam(null)}
          canManage={canManage}
        />
      )}

      {/* Bulk toolbar */}
      <FloatingBulkToolbar
        visible={selectedIds.length >= 1 && canManage}
        selectedIds={selectedIds}
        actions={[
          {
            id: 'publish',
            label: "E'lon qilish",
            icon: CheckCircle,
            tone: 'primary',
            onClick: async (ids: string[]) => {
              if (await ask({ title: `${ids.length} ta imtihon natijalarini e'lon qilishni tasdiqlang`, description: "Imtihon natijalari e'lon qilinadi. Keyin o'zgartirib bo'lmaydi.", variant: 'destructive', confirmText: "E'lon qilish" })) {
                ids.forEach((id) => publishMutation.mutate(id));
              }
              clearSelection();
            },
          },
          {
            id: 'export',
            label: 'Export',
            icon: ArrowRight,
            tone: 'neutral',
            onClick: () => toast({ title: `${selectedIds.length} ta imtihon export qilindi` }),
          },
        ]}
        onClear={clearSelection}
      />

      {/* ── Single create dialog ── */}
      <Dialog open={singleOpen} onOpenChange={setSingleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi imtihon qo&apos;shish</DialogTitle>
            <DialogDescription>Bitta sinf va fan uchun imtihon</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Sarlavha <span className="text-xedu-ruby">*</span></Label>
              <Input placeholder="Masalan: 1-chorak imtihoni" value={sForm.title} onChange={inp(setSForm)('title')} />
              {sErrors.title && <p className="text-xs text-xedu-ruby">{sErrors.title}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sinf <span className="text-xedu-ruby">*</span></Label>
                <Select value={sForm.classId} onValueChange={sel(setSForm)('classId')}>
                  <SelectTrigger><SelectValue placeholder="Sinf..." /></SelectTrigger>
                  <SelectContent>{(modalClasses as any[]).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                {sErrors.classId && <p className="text-xs text-xedu-ruby">{sErrors.classId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Fan <span className="text-xedu-ruby">*</span></Label>
                <Select value={sForm.subjectId} onValueChange={sel(setSForm)('subjectId')}>
                  <SelectTrigger><SelectValue placeholder="Fan..." /></SelectTrigger>
                  <SelectContent>{(modalSubjects as any[]).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {sErrors.subjectId && <p className="text-xs text-xedu-ruby">{sErrors.subjectId}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tur <span className="text-xedu-ruby">*</span></Label>
                <Select value={sForm.frequency} onValueChange={sel(setSForm)('frequency')}>
                  <SelectTrigger><SelectValue placeholder="Tur..." /></SelectTrigger>
                  <SelectContent>{Object.entries(FREQUENCY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
                {sErrors.frequency && <p className="text-xs text-xedu-ruby">{sErrors.frequency}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Max ball</Label>
                <Input type="number" min="1" value={sForm.maxScore} onChange={inp(setSForm)('maxScore')} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Sana va vaqt <span className="text-xedu-ruby">*</span></Label>
                <Input type="datetime-local" value={sForm.scheduledAt} onChange={inp(setSForm)('scheduledAt')} />
                {sErrors.scheduledAt && <p className="text-xs text-xedu-ruby">{sErrors.scheduledAt}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Davomiyligi (daq.)</Label>
                <Input type="number" placeholder="90" min="1" value={sForm.duration} onChange={inp(setSForm)('duration')} />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSingleOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleSingleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Qo&apos;shish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk create dialog ── */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" /> Ommaviy imtihon yaratish</DialogTitle>
            <DialogDescription>Ko&apos;p sinf × ko&apos;p fan kombinatsiyasi uchun bir vaqtda imtihon yarating</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Sarlavha <span className="text-xedu-ruby">*</span></Label>
              <Input placeholder="Masalan: Oylik imtihon — Mart 2026" value={bForm.title} onChange={inp(setBForm)('title')} />
              {bErrors.title && <p className="text-xs text-xedu-ruby">{bErrors.title}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tur <span className="text-xedu-ruby">*</span></Label>
                <Select value={bForm.frequency} onValueChange={sel(setBForm)('frequency')}>
                  <SelectTrigger><SelectValue placeholder="Tur tanlang..." /></SelectTrigger>
                  <SelectContent>{Object.entries(FREQUENCY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
                {bErrors.frequency && <p className="text-xs text-xedu-ruby">{bErrors.frequency}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Sana <span className="text-xedu-ruby">*</span></Label>
                <Input type="datetime-local" value={bForm.scheduledAt} onChange={inp(setBForm)('scheduledAt')} />
                {bErrors.scheduledAt && <p className="text-xs text-xedu-ruby">{bErrors.scheduledAt}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max ball</Label>
                <Input type="number" min="1" value={bForm.maxScore} onChange={inp(setBForm)('maxScore')} />
              </div>
              <div className="space-y-1.5">
                <Label>Davomiyligi (daq.)</Label>
                <Input type="number" placeholder="90" min="1" value={bForm.duration} onChange={inp(setBForm)('duration')} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Sinflar <span className="text-xedu-ruby">*</span></Label>
                  <div className="flex gap-1.5">
                    {bForm.classIds.length > 0 && (
                      <span className="text-xs text-primary font-medium">{bForm.classIds.length} tanlandi</span>
                    )}
                    <button
                      type="button"
                      className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-primary underline"
                      onClick={() => {
                        const allIds = (modalClasses as any[]).map((c: any) => c.id);
                        setBForm(f => ({ ...f, classIds: f.classIds.length === allIds.length ? [] : allIds }));
                      }}
                    >
                      {bForm.classIds.length === (modalClasses as any[]).length ? 'Barchasini bekor' : 'Barchasini tanlash'}
                    </button>
                  </div>
                </div>
                {(modalClasses as any[]).length === 0 ? (
                  <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 italic">Yuklanmoqda...</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-lg border p-2 space-y-0.5">
                    {(modalClasses as any[]).map((c: any) => (
                      <label key={c.id} className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer text-sm transition-colors ${bForm.classIds.includes(c.id) ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                        <Checkbox checked={bForm.classIds.includes(c.id)} onCheckedChange={() => toggleClass(c.id)} />
                        <span className="flex-1">{c.name}</span>
                        {bForm.classIds.includes(c.id) && <Check className="h-3 w-3 text-primary shrink-0" />}
                      </label>
                    ))}
                  </div>
                )}
                {bErrors.classIds && <p className="text-xs text-xedu-ruby">{bErrors.classIds}</p>}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Fanlar <span className="text-xedu-ruby">*</span></Label>
                  <div className="flex gap-1.5">
                    {bForm.subjectIds.length > 0 && (
                      <span className="text-xs text-primary font-medium">{bForm.subjectIds.length} tanlandi</span>
                    )}
                    <button
                      type="button"
                      className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-primary underline"
                      onClick={() => {
                        const allIds = (modalSubjects as any[]).map((s: any) => s.id);
                        setBForm(f => ({ ...f, subjectIds: f.subjectIds.length === allIds.length ? [] : allIds }));
                      }}
                    >
                      {bForm.subjectIds.length === (modalSubjects as any[]).length ? 'Barchasini bekor' : 'Barchasini tanlash'}
                    </button>
                  </div>
                </div>
                {(modalSubjects as any[]).length === 0 ? (
                  <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 italic">Yuklanmoqda...</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-lg border p-2 space-y-0.5">
                    {(modalSubjects as any[]).map((s: any) => (
                      <label key={s.id} className={`flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer text-sm transition-colors ${bForm.subjectIds.includes(s.id) ? 'bg-primary/10 text-primary' : 'hover:bg-accent'}`}>
                        <Checkbox checked={bForm.subjectIds.includes(s.id)} onCheckedChange={() => toggleSubject(s.id)} />
                        <span className="flex-1">{s.name}</span>
                        {s.class && <Badge variant="secondary" className="text-xs">{s.class.name}</Badge>}
                        {bForm.subjectIds.includes(s.id) && <Check className="h-3 w-3 text-primary shrink-0" />}
                      </label>
                    ))}
                  </div>
                )}
                {bErrors.subjectIds && <p className="text-xs text-xedu-ruby">{bErrors.subjectIds}</p>}
              </div>
            </div>
            {bForm.classIds.length > 0 && bForm.subjectIds.length > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 text-sm text-center">
                Jami{' '}
                <span className="font-bold text-primary text-base">{bForm.classIds.length * bForm.subjectIds.length}</span>
                {' '}ta imtihon yaratiladi
                <span className="text-xedu-slate-500 dark:text-xedu-slate-400 ml-1.5 block text-xs mt-0.5">
                  {bForm.classIds.length} ta sinf × {bForm.subjectIds.length} ta fan
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Bekor qilish</Button>
            <Button onClick={handleBulkSubmit} disabled={bulkMutation.isPending}>
              {bulkMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Yaratilmoqda...</> : <><Layers className="mr-2 h-4 w-4" />Yaratish</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WorkspaceShell>
  );
}
