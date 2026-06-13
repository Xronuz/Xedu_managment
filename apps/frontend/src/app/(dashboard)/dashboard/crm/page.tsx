'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, UserCheck, Phone, MessageSquare, RefreshCw,
  TrendingUp, Users, Star, BarChart3, X, ChevronDown, Loader2,
  Instagram, Send, Globe, Share2, PhoneCall, Footprints,
  GraduationCap, ArrowRight, AlertTriangle, Copy, CheckCircle,
  PencilLine, Trash2, CalendarClock, Link2, RotateCcw, Check,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useConfirm } from '@/store/confirm.store';
import { useAuthStore } from '@/store/auth.store';
import { classesApi } from '@/lib/api/classes';
import { branchesApi } from '@/lib/api/branches';
import { usersApi } from '@/lib/api/users';
import {
  leadsApi, KANBAN_COLUMNS, LEAD_STATUS_CONFIG, LEAD_SOURCE_CONFIG,
  type Lead, type LeadStatus, type LeadSource, type LeadAnalytics,
} from '@/lib/api/leads';

// Lead'ga mas'ul sifatida biriktirilishi mumkin bo'lgan (CRM'ga kira oladigan) rollar
const ASSIGNEE_ROLES = new Set(['director', 'vice_principal', 'branch_admin', 'accountant']);

/** Keyingi bog'lanish sanasi holati: o'tib ketgan / bugun / kelgusi */
function contactDateState(iso?: string | null): 'overdue' | 'today' | 'future' | null {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const day = (x: Date) => Math.floor(x.getTime() / 86400000);
  if (day(d) < day(now)) return 'overdue';
  if (day(d) === day(now)) return 'today';
  return 'future';
}

function formatContactDate(iso: string) {
  return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** ISO sanani <input type="date"> qiymatiga (YYYY-MM-DD) o'tkazish */
function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 10);
}

// ─── Source Icon ──────────────────────────────────────────────────────────────
function SourceIcon({ source }: { source: LeadSource }) {
  const icons: Record<LeadSource, React.ReactNode> = {
    INSTAGRAM: <Instagram className="h-3 w-3" />,
    TELEGRAM:  <Send       className="h-3 w-3" />,
    FACEBOOK:  <Share2     className="h-3 w-3" />,
    WEBSITE:   <Globe      className="h-3 w-3" />,
    REFERRAL:  <Users      className="h-3 w-3" />,
    CALL:      <PhoneCall  className="h-3 w-3" />,
    WALK_IN:   <Footprints className="h-3 w-3" />,
    OTHER:     <Star       className="h-3 w-3" />,
  };
  const cfg = LEAD_SOURCE_CONFIG[source];
  return (
    <span title={cfg.label} className={cfg.color}>
      {icons[source]}
    </span>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────
function LeadCard({
  lead, onStatusChange, onConvert, onOpenDetail,
}: {
  lead: Lead;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onConvert:      (lead: Lead) => void;
  onOpenDetail:   (lead: Lead) => void;
}) {
  const cfg  = LEAD_STATUS_CONFIG[lead.status];
  const isConverted = lead.status === 'CONVERTED';

  return (
    <div
      draggable={!isConverted}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/lead-id', lead.id);
        e.dataTransfer.setData('text/lead-status', lead.status);
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`rounded-xl border bg-xedu-bg-elevated p-3 shadow-sm hover:shadow-sm transition-shadow cursor-pointer group ${
        isConverted ? 'opacity-70' : 'active:cursor-grabbing'
      }`}
      onClick={() => onOpenDetail(lead)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">
            {lead.firstName} {lead.lastName}
          </p>
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-primary mt-0.5"
          >
            <Phone className="h-3 w-3" />
            {lead.phone}
          </a>
        </div>
        <SourceIcon source={lead.source} />
      </div>

      {/* Class expectation */}
      {lead.expectedClass && (
        <div className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-2">
          📚 {lead.expectedClass.name}
        </div>
      )}

      {/* Keyingi bog'lanish sanasi */}
      {lead.nextContactDate && !isConverted && lead.status !== 'CLOSED' && (() => {
        const state = contactDateState(lead.nextContactDate);
        return (
          <div className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 mb-2 text-[10px] font-semibold ${
            state === 'overdue' ? 'bg-xedu-ruby-100 text-xedu-ruby-700' :
            state === 'today'   ? 'bg-xedu-amber-100 text-xedu-amber-700' :
                                  'bg-xedu-slate-100 dark:bg-xedu-slate-800 text-xedu-slate-500 dark:text-xedu-slate-400'
          }`}>
            <CalendarClock className="h-2.5 w-2.5" />
            {state === 'overdue' ? "Bog'lanish o'tib ketgan: " : state === 'today' ? 'Bugun: ' : ''}
            {formatContactDate(lead.nextContactDate)}
          </div>
        );
      })()}

      {/* Note preview */}
      {lead.note && (
        <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 line-clamp-2 mb-2 italic">
          "{lead.note}"
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5 border-t border-xedu-slate-200 dark:border-xedu-slate-700/50">
        <div className="flex items-center gap-1.5">
          {(lead._count?.comments ?? 0) > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-xedu-slate-500 dark:text-xedu-slate-400">
              <MessageSquare className="h-2.5 w-2.5" />
              {lead._count!.comments}
            </span>
          )}
          {lead.assignedTo && (
            <span className="text-[10px] text-xedu-slate-500 dark:text-xedu-slate-400 truncate max-w-[80px]">
              👤 {lead.assignedTo.firstName}
            </span>
          )}
        </div>

        {!isConverted && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            {lead.status === 'WAITING_PAYMENT' && (
              <Button
                size="sm"
                variant="default"
                className="h-6 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onConvert(lead)}
              >
                <GraduationCap className="h-3 w-3 mr-1" /> Convert
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-1.5">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {KANBAN_COLUMNS.filter(s => s !== lead.status && s !== 'CONVERTED').map(s => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => onStatusChange(lead.id, s)}
                    className="text-xs"
                  >
                    <ArrowRight className="h-3 w-3 mr-2" />
                    {LEAD_STATUS_CONFIG[s].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {isConverted && (
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────
function KanbanColumn({
  status, leads, onStatusChange, onConvert, onOpenDetail, onAddLead,
}: {
  status:        LeadStatus;
  leads:         Lead[];
  onStatusChange: (id: string, status: LeadStatus) => void;
  onConvert:     (lead: Lead) => void;
  onOpenDetail:  (lead: Lead) => void;
  onAddLead:     (status: LeadStatus) => void;
}) {
  const cfg = LEAD_STATUS_CONFIG[status];
  const [dragOver, setDragOver] = useState(false);
  // CONVERTED'ga sudrab bo'lmaydi — konvertatsiya alohida oqim (tranzaksiya)
  const droppable = status !== 'CONVERTED';

  return (
    <div
      onDragOver={(e) => { if (droppable) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        if (!droppable) return;
        const leadId = e.dataTransfer.getData('text/lead-id');
        const fromStatus = e.dataTransfer.getData('text/lead-status');
        if (leadId && fromStatus !== status) onStatusChange(leadId, status);
      }}
      className={`flex flex-col rounded-xl border ${cfg.borderColor} ${cfg.bgColor} min-w-[240px] max-w-[280px] flex-shrink-0 transition-shadow ${
        dragOver ? 'ring-2 ring-xedu-primary/40 shadow-md' : ''
      }`}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b ${cfg.borderColor}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${cfg.dotColor}`} />
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{leads.length}</Badge>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[80px] overflow-y-auto max-h-[calc(100vh-260px)]">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onStatusChange={onStatusChange}
            onConvert={onConvert}
            onOpenDetail={onOpenDetail}
          />
        ))}

        {leads.length === 0 && (
          <p className="text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400 text-center py-4 opacity-60">Bo'sh</p>
        )}
      </div>

      {/* Add button (faqat NEW kolonnada) */}
      {status === 'NEW' && (
        <button
          onClick={() => onAddLead(status)}
          className="flex items-center gap-1.5 px-3 py-2 text-xs text-xedu-slate-500 dark:text-xedu-slate-400 hover:text-foreground hover:bg-xedu-slate-50 dark:hover:bg-xedu-slate-700/30 transition-colors border-t border-xedu-slate-200 dark:border-xedu-slate-700/40 rounded-b-xl"
        >
          <Plus className="h-3 w-3" /> Lead qo'shish
        </button>
      )}
    </div>
  );
}

// ─── Analytics Panel ──────────────────────────────────────────────────────────
function AnalyticsPanel({ analytics }: { analytics: LeadAnalytics }) {
  const total = analytics.totalLeads;

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Jami leadlar", value: total, icon: Users,       color: 'text-blue-600' },
          { label: 'Konversiya',   value: `${analytics.conversionRate}%`, icon: TrendingUp, color: 'text-green-600' },
          { label: 'Bu oy convert', value: analytics.convertedThisMonth, icon: UserCheck, color: 'text-purple-600' },
          { label: 'Bu hafta yangi', value: analytics.newThisWeek, icon: Star,       color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-xedu-slate-200 dark:border-xedu-slate-700/60">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Source breakdown */}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-xedu-slate-500 dark:text-xedu-slate-400" />
            Manbalar bo'yicha (qaysi reklama ishlayapti?)
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {analytics.bySource.length === 0 ? (
            <p className="text-sm text-xedu-slate-500 dark:text-xedu-slate-400">Ma'lumot yo'q</p>
          ) : (
            <div className="space-y-2">
              {analytics.bySource.map(({ source, count }) => {
                const cfg = LEAD_SOURCE_CONFIG[source as LeadSource];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className={`text-sm shrink-0 w-5 ${cfg.color}`}>{cfg.emoji}</span>
                    <span className="text-sm shrink-0 w-24 truncate">{cfg.label}</span>
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 shrink-0 w-10 text-right">
                      {count} ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Create Lead Dialog ───────────────────────────────────────────────────────
const EMPTY_FORM = {
  firstName: '', lastName: '', phone: '', source: 'INSTAGRAM' as LeadSource,
  note: '', branchId: '', expectedClassId: '', assignedToId: '', nextContactDate: '',
};

/** Mas'ul xodim tanlovi uchun xodimlar (CRM rollari) */
function useAssigneeOptions(enabled: boolean) {
  const { data } = useQuery({
    queryKey: ['crm', 'assignee-options'],
    queryFn: () => usersApi.getAll({ limit: 200 }),
    enabled,
    staleTime: 5 * 60_000,
  });
  return ((data as any)?.data ?? []).filter((u: any) => ASSIGNEE_ROLES.has(u.role));
}

function CreateLeadDialog({
  open, onOpenChange, defaultStatus, onSuccess,
}: {
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  defaultStatus: LeadStatus;
  onSuccess:     () => void;
}) {
  const { toast }   = useToast();
  const { activeBranchId } = useAuthStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [dupError, setDupError] = useState<any>(null);

  const { data: classesData } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn:  classesApi.getAll,
    enabled:  open,
    select:   (d: any) => (Array.isArray(d) ? d : d?.data ?? []),
  });
  const { data: branchesData } = useQuery({
    queryKey: ['branches', activeBranchId],
    queryFn:  () => branchesApi.getAll(),
    enabled:  open,
    select:   (d: any) => (Array.isArray(d) ? d : d?.data ?? []),
  });
  const branchesList = (branchesData as any[]) ?? [];
  const assignees = useAssigneeOptions(open);

  const mutation = useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => {
      toast({ title: ' Lead qo‘shildi' });
      setForm(EMPTY_FORM);
      setDupError(null);
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      const body = err?.response?.data;
      if (body?.isDuplicate) {
        setDupError(body);
      } else {
        toast({ variant: 'destructive', title: 'Xato', description: body?.message ?? 'Xatolik yuz berdi' });
      }
    },
  });

  const set = (k: string) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'phone') setDupError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Yangi lead</DialogTitle>
          <DialogDescription>Potensial o'quvchi ma'lumotlarini kiriting</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ism <span className="text-xedu-ruby">*</span></Label>
              <Input value={form.firstName} onChange={e => set('firstName')(e.target.value)} placeholder="Jasur" />
            </div>
            <div className="space-y-1.5">
              <Label>Familiya <span className="text-xedu-ruby">*</span></Label>
              <Input value={form.lastName} onChange={e => set('lastName')(e.target.value)} placeholder="Toshmatov" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Telefon <span className="text-xedu-ruby">*</span></Label>
            <Input
              value={form.phone}
              onChange={e => set('phone')(e.target.value)}
              placeholder="+998901234567"
              className={dupError ? 'border-amber-500' : ''}
            />
            {dupError && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-2.5 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Duplicate aniqlandi
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  <strong>{dupError.existingLead.firstName} {dupError.existingLead.lastName}</strong> —{' '}
                  {LEAD_STATUS_CONFIG[dupError.existingLead.status as LeadStatus]?.label}
                  {dupError.existingLead.assignedTo && <> · {dupError.existingLead.assignedTo}</>}
                </p>
                <p className="text-[10px] text-amber-500">Bu telefon allaqachon bazada. Mavjud leadni tahrirlang.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Manba</Label>
              <Select value={form.source} onValueChange={set('source')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_SOURCE_CONFIG).map(([src, cfg]) => (
                    <SelectItem key={src} value={src}>
                      {cfg.emoji} {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sinf/Guruh</Label>
              <Select value={form.expectedClassId} onValueChange={set('expectedClassId')}>
                <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {((classesData as any[]) ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mas&apos;ul xodim</Label>
              <Select value={form.assignedToId || '__none__'} onValueChange={set('assignedToId')}>
                <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {assignees.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Keyingi bog&apos;lanish</Label>
              <Input
                type="date"
                value={form.nextContactDate}
                onChange={e => set('nextContactDate')(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Izoh</Label>
            <Textarea
              value={form.note}
              onChange={e => set('note')(e.target.value)}
              placeholder="Qo'shimcha ma'lumot..."
              rows={2}
              className="resize-none"
            />
          </div>

          {branchesList.length > 0 && (
            <div className="space-y-1.5">
              <Label>Filial</Label>
              <Select value={form.branchId || '__auto__'} onValueChange={set('branchId')}>
                <SelectTrigger><SelectValue placeholder="Filial tanlang..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Joriy filial (avtomatik)</SelectItem>
                  {branchesList.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bekor qilish</Button>
          <Button
            onClick={() => mutation.mutate({
              firstName:       form.firstName,
              lastName:        form.lastName,
              phone:           form.phone,
              source:          form.source,
              note:            form.note || undefined,
              expectedClassId: (form.expectedClassId && form.expectedClassId !== '__none__') ? form.expectedClassId : undefined,
              branchId:        (form.branchId && form.branchId !== '__auto__') ? form.branchId : undefined,
              assignedToId:    (form.assignedToId && form.assignedToId !== '__none__') ? form.assignedToId : undefined,
              nextContactDate: form.nextContactDate ? new Date(form.nextContactDate + 'T09:00:00').toISOString() : undefined,
            })}
            disabled={mutation.isPending || !form.firstName || !form.lastName || !form.phone || !!dupError}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Qo'shish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Share Form Dialog — public lead-capture linklari ─────────────────────────
const SHARE_SOURCES: { src: LeadSource; label: string; emoji: string }[] = [
  { src: 'INSTAGRAM', label: 'Instagram target / bio', emoji: '📸' },
  { src: 'TELEGRAM',  label: 'Telegram kanal / reklama', emoji: '✈️' },
  { src: 'FACEBOOK',  label: 'Facebook reklama', emoji: '👥' },
  { src: 'WEBSITE',   label: 'Sayt / umumiy link', emoji: '🌐' },
];

function ShareFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  const canRotate = ['director', 'branch_admin'].includes(user?.role ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['leads', 'capture-form'],
    queryFn: () => leadsApi.getCaptureForm(),
    enabled: open,
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const linkFor = (src: LeadSource) => `${baseUrl}/r/${data?.token}?src=${src.toLowerCase()}`;

  // Umumiy link uchun QR (banner/flayerga)
  useEffect(() => {
    if (data?.token && open) {
      QRCode.toDataURL(linkFor('WEBSITE'), { width: 240, margin: 1 })
        .then(setQr)
        .catch(() => setQr(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.token, open]);

  const copy = async (src: LeadSource) => {
    await navigator.clipboard.writeText(linkFor(src));
    setCopied(src);
    setTimeout(() => setCopied(null), 1500);
  };

  const rotateMutation = useMutation({
    mutationFn: () => leadsApi.rotateCaptureForm(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', 'capture-form'] });
      toast({ title: 'Link yangilandi', description: 'Eski link endi ishlamaydi.' });
    },
  });

  const handleRotate = async () => {
    const ok = await confirm({
      title: 'Linkni yangilash',
      description: "Hozirgi link bekor bo'ladi — reklamalarda ulashilgan eski linklar ishlamay qoladi. Spam bo'lganda ishlating.",
      confirmText: 'Yangilash',
    });
    if (ok) rotateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-xedu-primary" />
            Ro&apos;yxatdan o&apos;tish formasi
          </DialogTitle>
          <DialogDescription>
            Linkni reklamada ulashing — to&apos;ldirilgan formalar to&apos;g&apos;ridan-to&apos;g&apos;ri CRM&apos;ga lead bo&apos;lib tushadi,
            manbasi avtomatik belgilanadi.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !data ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : (
          <div className="space-y-2.5">
            {SHARE_SOURCES.map(({ src, label, emoji }) => (
              <div key={src} className="flex items-center gap-2 rounded-xl border border-xedu-border p-2.5">
                <span className="text-base">{emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="truncate text-[11px] text-xedu-slate-500 dark:text-xedu-slate-400">{linkFor(src)}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 px-2 shrink-0" onClick={() => copy(src)}>
                  {copied === src ? <Check className="h-3.5 w-3.5 text-xedu-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            ))}

            {qr && (
              <div className="flex items-center gap-3 rounded-xl border border-xedu-border p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR kod" className="h-24 w-24 rounded-lg" />
                <div className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400">
                  <p className="font-semibold text-foreground mb-1">QR-kod (banner / flayer uchun)</p>
                  <p>Skaner qilgan ota-ona to&apos;g&apos;ridan-to&apos;g&apos;ri formaga tushadi.</p>
                  <a href={qr} download="xedu-forma-qr.png" className="text-xedu-primary font-medium hover:underline mt-1 inline-block">
                    Yuklab olish
                  </a>
                </div>
              </div>
            )}

            {canRotate && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-xedu-slate-500 dark:text-xedu-slate-400"
                disabled={rotateMutation.isPending}
                onClick={handleRotate}
              >
                <RotateCcw className="h-3 w-3 mr-1.5" />
                Linkni yangilash (spam bo&apos;lsa)
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Lead Dialog ─────────────────────────────────────────────────────────
function EditLeadDialog({
  lead, open, onOpenChange, onSuccess,
}: {
  lead:         Lead | null;
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess:    () => void;
}) {
  const { toast } = useToast();
  const { activeBranchId } = useAuthStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [dupError, setDupError] = useState<any>(null);

  // Dialog ochilganda formani lead qiymatlari bilan to'ldirish
  const leadId = lead?.id;
  useEffect(() => {
    if (lead && open) {
      setForm({
        firstName:       lead.firstName,
        lastName:        lead.lastName,
        phone:           lead.phone,
        source:          lead.source,
        note:            lead.note ?? '',
        branchId:        '',
        expectedClassId: lead.expectedClassId ?? '',
        assignedToId:    lead.assignedToId ?? '',
        nextContactDate: toDateInputValue(lead.nextContactDate),
      });
      setDupError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, open]);

  const { data: classesData } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn:  classesApi.getAll,
    enabled:  open,
    select:   (d: any) => (Array.isArray(d) ? d : d?.data ?? []),
  });
  const assignees = useAssigneeOptions(open);

  const mutation = useMutation({
    mutationFn: () =>
      leadsApi.update(lead!.id, {
        firstName:       form.firstName,
        lastName:        form.lastName,
        phone:           form.phone,
        source:          form.source,
        note:            form.note,
        expectedClassId: form.expectedClassId && form.expectedClassId !== '__none__' ? form.expectedClassId : undefined,
        assignedToId:    form.assignedToId && form.assignedToId !== '__none__' ? form.assignedToId : undefined,
        nextContactDate: form.nextContactDate ? new Date(form.nextContactDate + 'T09:00:00').toISOString() : ('' as any),
      }),
    onSuccess: () => {
      toast({ title: 'Lead yangilandi' });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: any) => {
      const body = err?.response?.data;
      if (body?.isDuplicate) setDupError(body);
      else toast({ variant: 'destructive', title: 'Xato', description: body?.message ?? 'Xatolik yuz berdi' });
    },
  });

  const set = (k: string) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    if (k === 'phone') setDupError(null);
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Leadni tahrirlash</DialogTitle>
          <DialogDescription>{lead.firstName} {lead.lastName} ma&apos;lumotlarini yangilash</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ism <span className="text-xedu-ruby">*</span></Label>
              <Input value={form.firstName} onChange={e => set('firstName')(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Familiya <span className="text-xedu-ruby">*</span></Label>
              <Input value={form.lastName} onChange={e => set('lastName')(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Telefon <span className="text-xedu-ruby">*</span></Label>
            <Input
              value={form.phone}
              onChange={e => set('phone')(e.target.value)}
              className={dupError ? 'border-amber-500' : ''}
            />
            {dupError && (
              <p className="text-xs text-xedu-amber-600">
                Bu raqam boshqa leadda ({dupError.existingLead?.firstName} {dupError.existingLead?.lastName}) ishlatilmoqda.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Manba</Label>
              <Select value={form.source} onValueChange={set('source')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_SOURCE_CONFIG).map(([src, cfg]) => (
                    <SelectItem key={src} value={src}>{cfg.emoji} {cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Sinf/Guruh</Label>
              <Select value={form.expectedClassId || '__none__'} onValueChange={set('expectedClassId')}>
                <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {((classesData as any[]) ?? []).map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mas&apos;ul xodim</Label>
              <Select value={form.assignedToId || '__none__'} onValueChange={set('assignedToId')}>
                <SelectTrigger><SelectValue placeholder="Tanlang..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {assignees.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Keyingi bog&apos;lanish</Label>
              <Input
                type="date"
                value={form.nextContactDate}
                onChange={e => set('nextContactDate')(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Izoh</Label>
            <Textarea
              value={form.note}
              onChange={e => set('note')(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bekor qilish</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.firstName || !form.lastName || !form.phone}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Saqlash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Close Reason Dialog ──────────────────────────────────────────────────────
// CLOSED statusiga o'tishda yo'qotish sababini so'raydi — keyin tahlil uchun
function CloseReasonDialog({
  open, onOpenChange, onSubmit, pending,
}: {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit:     (reason: string) => void;
  pending:      boolean;
}) {
  const [reason, setReason] = useState('');
  const PRESETS = ['Narx to‘g‘ri kelmadi', 'Boshqa maktabni tanladi', "Aloqa yo'q (javob bermadi)", 'Hozircha kerak emas'];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setReason(''); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Leadni yopish</DialogTitle>
          <DialogDescription>Nega yo&apos;qotildi? Bu tahlil uchun saqlanadi.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setReason(p)}
                className={`rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                  reason === p
                    ? 'border-xedu-primary bg-xedu-primary/10 text-xedu-primary font-semibold'
                    : 'border-xedu-border text-xedu-slate-500 dark:text-xedu-slate-400 hover:border-xedu-border-hover'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Yoki sababni o'zingiz yozing..."
            rows={2}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Bekor qilish</Button>
          <Button variant="destructive" disabled={pending} onClick={() => onSubmit(reason.trim())}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Yopish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Convert to Student Dialog ────────────────────────────────────────────────
function ConvertDialog({
  lead, open, onOpenChange, onSuccess,
}: {
  lead:         Lead | null;
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess:    () => void;
}) {
  const { toast } = useToast();
  const { activeBranchId } = useAuthStore();
  const [classId, setClassId] = useState('');
  const [email,   setEmail]   = useState('');
  const [result,  setResult]  = useState<any>(null);
  const [copied,  setCopied]  = useState(false);

  const { data: classesData } = useQuery({
    queryKey: ['classes', activeBranchId],
    queryFn:  classesApi.getAll,
    enabled:  open,
    select:   (d: any) => (Array.isArray(d) ? d : d?.data ?? []),
  });

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      leadsApi.convertToStudent(id, payload),
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Xato', description: err?.response?.data?.message ?? 'Xatolik' });
    },
  });

  const handleClose = () => {
    setClassId(''); setEmail(''); setResult(null); setCopied(false);
    onOpenChange(false);
  };

  const copyPassword = () => {
    if (result?.rawPassword) {
      navigator.clipboard.writeText(result.rawPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-green-600" />
            O'quvchiga aylantirish
          </DialogTitle>
          <DialogDescription>
            <strong>{lead.firstName} {lead.lastName}</strong> ({lead.phone}) ni o'quvchiga aylantirish
          </DialogDescription>
        </DialogHeader>

        {result ? (
          /* ── SUCCESS STATE ── */
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/30 p-4">
              <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300">{result.message}</p>
                <p className="text-sm text-green-600 dark:text-green-400">Sinf: {result.className}</p>
              </div>
            </div>
            <div className="rounded-lg border bg-xedu-slate-50 dark:bg-xedu-slate-800 p-3 space-y-2 text-sm">
              <p><span className="text-xedu-slate-500 dark:text-xedu-slate-400">Email:</span> <strong>{result.student.email}</strong></p>
              <div className="flex items-center gap-2">
                <span className="text-xedu-slate-500 dark:text-xedu-slate-400">Parol:</span>
                <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">{result.rawPassword}</code>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={copyPassword}>
                  {copied ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                 Bu parolni o'quvchiga yuboring. Keyinroq ko'rinmaydi.
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>Yopish</Button>
          </div>
        ) : (
          /* ── FORM STATE ── */
          <>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label>Sinf / Guruh <span className="text-xedu-ruby">*</span></Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sinf tanlang..." />
                  </SelectTrigger>
                  <SelectContent>
                    {((classesData as any[]) ?? []).map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.gradeLevel && `(${c.gradeLevel}-sinf)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Email <span className="text-xedu-slate-500 dark:text-xedu-slate-400 text-xs">(ixtiyoriy — yo'q bo'lsa telefon asosida)</span></Label>
                <Input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={`student${lead.phone.replace(/[^\d]/g, '')}@school.local`}
                  type="email"
                />
              </div>

              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <p className="font-semibold">Bu operatsiya nima qiladi?</p>
                <ul className="space-y-0.5 pl-3 list-disc">
                  <li>Yangi o'quvchi (User) yaratadi</li>
                  <li>Tanlangan sinfga qo'shadi</li>
                  <li>Lead statusini CONVERTED ga o'tkazadi</li>
                  <li>Vaqtinchalik parol generatsiya qiladi</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Bekor qilish</Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={!classId || mutation.isPending}
                onClick={() => mutation.mutate({
                  id: lead.id,
                  payload: { classId, email: email || undefined },
                })}
              >
                {mutation.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aylantirilmoqda...</>
                  : <><GraduationCap className="mr-2 h-4 w-4" /> O'quvchiga aylantir</>}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Lead Detail Drawer ───────────────────────────────────────────────────────
function LeadDetailDialog({
  lead, open, onOpenChange, onStatusChange, onConvert, onCommentAdd, onEdit, onDelete,
}: {
  lead:           Lead | null;
  open:           boolean;
  onOpenChange:   (v: boolean) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onConvert:      (lead: Lead) => void;
  onCommentAdd:   (leadId: string, text: string) => void;
  onEdit:         (lead: Lead) => void;
  onDelete:       (lead: Lead) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const { user } = useAuthStore();
  const canEdit   = ['director', 'branch_admin', 'vice_principal', 'accountant'].includes(user?.role ?? '');
  const canDelete = ['director', 'branch_admin'].includes(user?.role ?? '');

  const { data: fullLead, isLoading } = useQuery({
    queryKey: ['lead', lead?.id],
    queryFn:  () => leadsApi.getOne(lead!.id),
    enabled:  open && !!lead?.id,
  });

  const displayLead = fullLead ?? lead;
  if (!displayLead) return null;
  const cfg = LEAD_STATUS_CONFIG[displayLead.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div>
              <p>{displayLead.firstName} {displayLead.lastName}</p>
              <p className="text-sm font-normal text-xedu-slate-500 dark:text-xedu-slate-400">{displayLead.phone}</p>
            </div>
            <Badge className={`ml-auto shrink-0 ${cfg.color} ${cfg.bgColor} border ${cfg.borderColor}`}>
              {cfg.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Tahrirlash / o'chirish */}
        {(canEdit || canDelete) && (
          <div className="flex gap-2 -mt-1">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { onOpenChange(false); onEdit(displayLead); }}
              >
                <PencilLine className="h-3 w-3 mr-1.5" /> Tahrirlash
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-xedu-ruby-600 hover:text-xedu-ruby-700"
                onClick={() => onDelete(displayLead)}
              >
                <Trash2 className="h-3 w-3 mr-1.5" /> O&apos;chirish
              </Button>
            )}
          </div>
        )}

        <div className="space-y-4 pt-1">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-800 p-2.5">
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-0.5">Manba</p>
              <div className="flex items-center gap-1.5">
                <SourceIcon source={displayLead.source} />
                <span>{LEAD_SOURCE_CONFIG[displayLead.source].label}</span>
              </div>
            </div>
            {displayLead.expectedClass && (
              <div className="rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-800 p-2.5">
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-0.5">Mo'ljallangan sinf</p>
                <p>{displayLead.expectedClass.name}</p>
              </div>
            )}
            {displayLead.assignedTo && (
              <div className="rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-800 p-2.5">
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-0.5">Mas'ul xodim</p>
                <p>{displayLead.assignedTo.firstName} {displayLead.assignedTo.lastName}</p>
              </div>
            )}
            {displayLead.branch && (
              <div className="rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-800 p-2.5">
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-0.5">Filial</p>
                <p>{displayLead.branch.name}</p>
              </div>
            )}
            {displayLead.nextContactDate && (
              <div className={`rounded-lg p-2.5 ${
                contactDateState(displayLead.nextContactDate) === 'overdue'
                  ? 'bg-xedu-ruby-50 dark:bg-xedu-ruby-100'
                  : 'bg-xedu-slate-50 dark:bg-xedu-slate-800'
              }`}>
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-0.5">Keyingi bog&apos;lanish</p>
                <p className={contactDateState(displayLead.nextContactDate) === 'overdue' ? 'text-xedu-ruby-700 font-semibold' : ''}>
                  {formatContactDate(displayLead.nextContactDate)}
                  {contactDateState(displayLead.nextContactDate) === 'overdue' && " — o'tib ketgan!"}
                </p>
              </div>
            )}
          </div>

          {/* Yopilish sababi */}
          {displayLead.status === 'CLOSED' && displayLead.closedReason && (
            <div className="rounded-lg border border-xedu-ruby-200 bg-xedu-ruby-50 dark:bg-xedu-ruby-100 p-3 text-sm">
              <p className="text-xs text-xedu-ruby-600 mb-1 font-semibold">Yopilish sababi</p>
              <p className="text-xedu-ruby-700">{displayLead.closedReason}</p>
            </div>
          )}

          {/* Note */}
          {displayLead.note && (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mb-1">Izoh</p>
              <p className="italic">"{displayLead.note}"</p>
            </div>
          )}

          {/* Status change */}
          {displayLead.status !== 'CONVERTED' && (
            <div className="flex flex-wrap gap-2">
              {KANBAN_COLUMNS.filter(s => s !== displayLead.status && s !== 'CONVERTED').map(s => {
                const c = LEAD_STATUS_CONFIG[s];
                return (
                  <Button
                    key={s}
                    size="sm"
                    variant="outline"
                    className={`text-xs h-7 ${c.color} border ${c.borderColor} ${c.bgColor} hover:opacity-80`}
                    onClick={() => { onStatusChange(displayLead.id, s); onOpenChange(false); }}
                  >
                    → {c.label}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Convert button */}
          {(displayLead.status === 'WAITING_PAYMENT' || displayLead.status === 'TEST_LESSON') && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={() => { onConvert(displayLead); onOpenChange(false); }}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              O'quvchiga aylantirish
            </Button>
          )}

          {/* Comments */}
          <div>
            <p className="text-sm font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-xedu-slate-500 dark:text-xedu-slate-400" />
              Muloqot tarixi
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {[1,2].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : (fullLead?.comments ?? []).length === 0 ? (
              <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 text-center py-3">Hali izoh yo'q</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {(fullLead?.comments ?? []).map((c: any) => (
                  <div key={c.id} className="rounded-lg bg-xedu-slate-50 dark:bg-xedu-slate-800 p-2.5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {c.author ? `${c.author.firstName} ${c.author.lastName}` : 'Tizim'}
                      </span>
                      <span className="text-xedu-slate-500 dark:text-xedu-slate-400">
                        {new Date(c.createdAt).toLocaleDateString('uz-UZ')}
                      </span>
                    </div>
                    <p className="text-xedu-slate-500 dark:text-xedu-slate-400">{c.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment */}
            <div className="flex gap-2 mt-2">
              <Input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Izoh yozing..."
                className="text-xs h-8"
                onKeyDown={e => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    onCommentAdd(displayLead.id, commentText.trim());
                    setCommentText('');
                  }
                }}
              />
              <Button
                size="sm"
                className="h-8 px-3"
                disabled={!commentText.trim()}
                onClick={() => {
                  onCommentAdd(displayLead.id, commentText.trim());
                  setCommentText('');
                }}
              >
                Yuborish
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CrmPage() {
  const { toast }       = useToast();
  const confirm         = useConfirm();
  const queryClient     = useQueryClient();
  const { user, activeBranchId } = useAuthStore();
  const [search,        setSearch]        = useState('');
  const [activeSource,  setActiveSource]  = useState<string>('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [createOpen,    setCreateOpen]    = useState(false);
  const [createStatus,  setCreateStatus]  = useState<LeadStatus>('NEW');
  const [convertLead,   setConvertLead]   = useState<Lead | null>(null);
  const [detailLead,    setDetailLead]    = useState<Lead | null>(null);
  const [editLead,      setEditLead]      = useState<Lead | null>(null);
  const [closeTargetId, setCloseTargetId] = useState<string | null>(null);
  const [shareOpen,     setShareOpen]     = useState(false);

  // ── Queries ─────────────────────────────────────────────────────────────
  const { data: listData, isLoading } = useQuery({
    queryKey: ['leads', { search, source: activeSource, branchId: activeBranchId }],
    queryFn:  () => leadsApi.getAll({ search: search || undefined, source: activeSource || undefined, limit: 200 }),
  });

  const { data: analytics } = useQuery({
    queryKey: ['leads-analytics', activeBranchId],
    queryFn:  () => leadsApi.getAnalytics(),
    enabled:  showAnalytics,
  });

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['leads'] });
    queryClient.invalidateQueries({ queryKey: ['leads-analytics'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status, closedReason }: { id: string; status: LeadStatus; closedReason?: string }) =>
      leadsApi.updateStatus(id, status, closedReason),
    onSuccess: () => {
      toast({ title: 'Status yangilandi' });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      setCloseTargetId(null);
    },
    onError:   () => toast({ variant: 'destructive', title: 'Xato', description: 'Status yangilanmadi' }),
  });

  // CLOSED'ga o'tishda sabab so'raladi, qolgan statuslar to'g'ridan-to'g'ri
  const handleStatusChange = (id: string, status: LeadStatus) => {
    if (status === 'CLOSED') {
      setDetailLead(null);
      setCloseTargetId(id);
    } else {
      statusMutation.mutate({ id, status });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => leadsApi.remove(id),
    onSuccess: () => { toast({ title: 'Lead o‘chirildi' }); invalidate(); },
    onError:   () => toast({ variant: 'destructive', title: 'Xato', description: 'O‘chirishda xatolik' }),
  });

  const handleDelete = async (lead: Lead) => {
    setDetailLead(null);
    const ok = await confirm({
      title: 'Leadni o‘chirish',
      description: `${lead.firstName} ${lead.lastName} (${lead.phone}) va uning barcha muloqot tarixi o'chiriladi.`,
      confirmText: "O'chirish",
      variant: 'destructive',
    });
    if (ok) deleteMutation.mutate(lead.id);
  };

  const commentMutation = useMutation({
    mutationFn: ({ leadId, text }: { leadId: string; text: string }) =>
      leadsApi.addComment(leadId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      toast({ title: 'Izoh qo‘shildi' });
    },
  });

  // ── Derived ──────────────────────────────────────────────────────────────
  const allLeads: Lead[] = listData?.data ?? [];

  const grouped = useMemo(() => {
    const map: Record<LeadStatus, Lead[]> = {
      NEW: [], CONTACTED: [], TEST_LESSON: [], WAITING_PAYMENT: [], CONVERTED: [], CLOSED: [],
    };
    allLeads.forEach(lead => {
      if (map[lead.status]) map[lead.status].push(lead);
    });
    return map;
  }, [allLeads]);

  const canManage = ['director', 'branch_admin', 'vice_principal', 'accountant'].includes(user?.role ?? '');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">CRM — Leadlar</h1>
          <p className="text-xedu-slate-500 dark:text-xedu-slate-400 text-sm">
            Jami {listData?.total ?? 0} ta lead
            {allLeads.filter(l => l.status === 'CONVERTED').length > 0 && (
              <> · <span className="text-green-600 font-medium">
                {allLeads.filter(l => l.status === 'CONVERTED').length} ta converted
              </span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowAnalytics(v => !v)}>
            <BarChart3 className="mr-2 h-4 w-4" />
            {showAnalytics ? 'Kanban' : 'Tahlil'}
          </Button>
          <Button variant="ghost" size="sm" onClick={invalidate}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                <Link2 className="mr-2 h-4 w-4" /> Forma linki
              </Button>
              <Button onClick={() => { setCreateStatus('NEW'); setCreateOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" /> Lead qo'shish
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-xedu-slate-500 dark:text-xedu-slate-400" />
          <Input
            placeholder="Ism, telefon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 w-56 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X className="h-3.5 w-3.5 text-xedu-slate-500 dark:text-xedu-slate-400" />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={activeSource === '' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setActiveSource('')}
          >
            Barchasi
          </Button>
          {Object.entries(LEAD_SOURCE_CONFIG).map(([src, cfg]) => (
            <Button
              key={src}
              variant={activeSource === src ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => setActiveSource(activeSource === src ? '' : src)}
            >
              {cfg.emoji} {cfg.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Analytics or Kanban */}
      {showAnalytics ? (
        analytics != null
          ? <AnalyticsPanel analytics={analytics} />
          : <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        /* ── KANBAN BOARD ── */
        isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map(s => (
              <div key={s} className="min-w-[240px] space-y-2">
                <Skeleton className="h-8 rounded-xl" />
                {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-3">
            {KANBAN_COLUMNS.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                leads={grouped[status]}
                onStatusChange={handleStatusChange}
                onConvert={setConvertLead}
                onOpenDetail={setDetailLead}
                onAddLead={(s) => { setCreateStatus(s); setCreateOpen(true); }}
              />
            ))}
          </div>
        )
      )}

      {/* Dialogs */}
      <CreateLeadDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus={createStatus}
        onSuccess={invalidate}
      />

      <ConvertDialog
        lead={convertLead}
        open={!!convertLead}
        onOpenChange={(v) => { if (!v) setConvertLead(null); }}
        onSuccess={invalidate}
      />

      <LeadDetailDialog
        lead={detailLead}
        open={!!detailLead}
        onOpenChange={(v) => { if (!v) setDetailLead(null); }}
        onStatusChange={handleStatusChange}
        onConvert={(l) => { setDetailLead(null); setConvertLead(l); }}
        onCommentAdd={(leadId, text) => commentMutation.mutate({ leadId, text })}
        onEdit={setEditLead}
        onDelete={handleDelete}
      />

      <EditLeadDialog
        lead={editLead}
        open={!!editLead}
        onOpenChange={(v) => { if (!v) setEditLead(null); }}
        onSuccess={() => { invalidate(); queryClient.invalidateQueries({ queryKey: ['lead'] }); }}
      />

      <CloseReasonDialog
        open={!!closeTargetId}
        onOpenChange={(v) => { if (!v) setCloseTargetId(null); }}
        pending={statusMutation.isPending}
        onSubmit={(reason) =>
          statusMutation.mutate({ id: closeTargetId!, status: 'CLOSED', closedReason: reason || undefined })
        }
      />

      <ShareFormDialog open={shareOpen} onOpenChange={setShareOpen} />
    </div>
  );
}
