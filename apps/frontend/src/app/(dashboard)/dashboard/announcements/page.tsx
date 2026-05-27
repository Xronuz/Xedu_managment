'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Send, Users, CheckCircle2, Eye, Clock, AlertTriangle,
  Megaphone, Trash2, Check, X, Loader2, FileText, ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { announcementsApi, type Announcement, type MyAnnouncementItem, type AnnouncementPriority } from '@/lib/api/announcements';
import { StandardEmptyState } from '@/components/ui/standard-empty-state';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const TARGET_GROUPS: { value: string; label: string; roles: string[] }[] = [
  { value: 'all_staff', label: 'Barcha xodimlar', roles: ['teacher', 'class_teacher', 'accountant', 'librarian', 'branch_admin', 'vice_principal', 'director'] },
  { value: 'all_teachers', label: "Barcha o'qituvchilar", roles: ['teacher', 'class_teacher'] },
  { value: 'class_teachers', label: 'Sinf rahbarlari', roles: ['class_teacher'] },
  { value: 'all_parents', label: 'Barcha ota-onalar', roles: ['parent'] },
  { value: 'all_students', label: "Barcha o'quvchilar", roles: ['student'] },
  { value: 'vice_principal', label: "O'rinbosarlar", roles: ['vice_principal'] },
  { value: 'accountant', label: 'Moliya bo‘limi', roles: ['accountant'] },
  { value: 'librarian', label: 'Kutubxonachilar', roles: ['librarian'] },
];

const PRIORITY_CONFIG: Record<AnnouncementPriority, { label: string; color: string; icon: typeof AlertTriangle }> = {
  low: { label: 'Oddiy', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: Bell },
  normal: { label: 'O‘rta', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: Bell },
  urgent: { label: 'Shoshilinch', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: AlertTriangle },
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Qoralama', variant: 'secondary' },
  scheduled: { label: 'Rejalashtirilgan', variant: 'outline' },
  active: { label: 'Faol', variant: 'default' },
  expired: { label: 'Muddati o‘tgan', variant: 'secondary' },
  cancelled: { label: 'Bekor qilingan', variant: 'destructive' },
};

function canCreateAnnouncements(role: string): boolean {
  return ['director', 'vice_principal', 'super_admin'].includes(role);
}

function canViewAllAnnouncements(role: string): boolean {
  return ['director', 'vice_principal', 'super_admin', 'branch_admin'].includes(role);
}

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const role = user?.role ?? '';
  const isCreator = canCreateAnnouncements(role);
  isCreator;
  const isAdmin = canViewAllAnnouncements(role);

  const [activeTab, setActiveTab] = useState('my');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState('all_staff');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [requireAck, setRequireAck] = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const myQuery = useQuery({
    queryKey: ['announcements', 'my'],
    queryFn: () => announcementsApi.findMy({ limit: 50 }),
  });

  const allQuery = useQuery({
    queryKey: ['announcements', 'all'],
    queryFn: () => announcementsApi.findAll({ limit: 50 }),
    enabled: isAdmin,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: () => {
      const targetGroup = TARGET_GROUPS.find(g => g.value === target);
      return announcementsApi.create({
        title: title.trim(),
        body: body.trim(),
        priority,
        targetRoles: targetGroup?.roles ?? [],
        requireAck,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "E'lon yuborildi",
        description: `${data.audienceSize} ta foydalanuvchiga yetkazildi`,
      });
      setTitle('');
      setBody('');
      setTarget('all_staff');
      setPriority('normal');
      setRequireAck(false);
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setActiveTab(isAdmin ? 'all' : 'my');
    },
    onError: (err: any) => {
      toast({
        title: 'Xato',
        description: err?.response?.data?.message || "E'lon yuborishda xato yuz berdi",
        variant: 'destructive',
      });
    },
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.acknowledge(id),
    onSuccess: () => {
      toast({ title: 'Tasdiqlandi' });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: (err: any) => {
      toast({
        title: 'Xato',
        description: err?.response?.data?.message || 'Tasdiqlashda xato',
        variant: 'destructive',
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => announcementsApi.cancel(id),
    onSuccess: () => {
      toast({ title: "E'lon bekor qilindi" });
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !createMutation.isPending;

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderPriorityBadge = (p: AnnouncementPriority) => {
    const cfg = PRIORITY_CONFIG[p] ?? PRIORITY_CONFIG.normal;
    return (
      <Badge className={cn('text-xs font-medium', cfg.color)} variant="secondary">
        {cfg.label}
      </Badge>
    );
  };

  const renderStatusBadge = (s: string) => {
    const cfg = STATUS_CONFIG[s] ?? { label: s, variant: 'outline' as const };
    return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
  };

  // ── My announcements list ──────────────────────────────────────────────────

  const MyAnnouncementsList = () => {
    if (myQuery.isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      );
    }

    if (myQuery.isError) {
      return (
        <StandardEmptyState
          icon={AlertTriangle}
          title="Yuklashda xato"
          description="E'lonlarni yuklashda muammo yuz berdi. Iltimos, qayta urinib ko'ring."
          primaryAction={{ label: 'Qayta yuklash', onClick: () => myQuery.refetch() }}
        />
      );
    }

    const items = myQuery.data?.data ?? [];
    if (items.length === 0) {
      return (
        <StandardEmptyState
          icon={Bell}
          title="E'lonlar yo'q"
          description="Sizga hali hech qanday e'lon yuborilmagan."
        />
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item) => (
          <MyAnnouncementCard
            key={item.announcement.id}
            item={item}
            onRead={(id) => readMutation.mutate(id)}
            onAck={(id) => ackMutation.mutate(id)}
            isReading={readMutation.isPending}
            isAcking={ackMutation.isPending}
          />
        ))}
      </div>
    );
  };

  // ── All announcements list (admin) ─────────────────────────────────────────

  const AllAnnouncementsList = () => {
    if (allQuery.isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg border bg-muted/30 animate-pulse" />
          ))}
        </div>
      );
    }

    if (allQuery.isError) {
      return (
        <StandardEmptyState
          icon={AlertTriangle}
          title="Yuklashda xato"
          description="E'lonlarni yuklashda muammo yuz berdi."
          primaryAction={{ label: 'Qayta yuklash', onClick: () => allQuery.refetch() }}
        />
      );
    }

    const items = allQuery.data?.data ?? [];
    if (items.length === 0) {
      return (
        <StandardEmptyState
          icon={Megaphone}
          title="E'lonlar yo'q"
          description="Hali hech qanday e'lon yaratilmagan."
        />
      );
    }

    return (
      <div className="space-y-3">
        {items.map((a) => (
          <AdminAnnouncementCard
            key={a.id}
            announcement={a}
            onCancel={(id) => cancelMutation.mutate(id)}
            isCancelling={cancelMutation.isPending}
          />
        ))}
      </div>
    );
  };

  // ── Compose form ───────────────────────────────────────────────────────────

  const ComposeForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" /> Yangi e&apos;lon
        </CardTitle>
        <CardDescription>Tanlangan guruhga e&apos;lon yuborish</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Maqsadli guruh</label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TARGET_GROUPS.map(g => (
                <SelectItem key={g.value} value={g.value}>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-xedu-slate-500" />
                    {g.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Muhimlik</label>
          <Select value={priority} onValueChange={(v) => setPriority(v as AnnouncementPriority)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Oddiy</SelectItem>
              <SelectItem value="normal">O‘rta</SelectItem>
              <SelectItem value="urgent">Shoshilinch</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Sarlavha *</label>
          <Input
            placeholder="E'lon sarlavhasi..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Matn *</label>
          <Textarea
            placeholder="E'lon matni..."
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            maxLength={5000}
            className="resize-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="requireAck"
            checked={requireAck}
            onCheckedChange={(c) => setRequireAck(c === true)}
          />
          <label htmlFor="requireAck" className="text-sm cursor-pointer">
            Foydalanuvchilardan tasdiqlash talab qilinsin
          </label>
        </div>

        <Button
          className="w-full gap-2"
          onClick={() => createMutation.mutate()}
          disabled={!canSend}
        >
          {createMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Yuborilmoqda...</>
          ) : (
            <><Send className="h-4 w-4" /> E&apos;lon yuborish</>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> E&apos;lonlar
        </h1>
        <p className="text-xedu-slate-500 dark:text-xedu-slate-400">
          Maktab e&apos;lonlari va xabarnomalari
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="my" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Mening e&apos;lonlarim
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="all" className="gap-1.5">
              <Megaphone className="h-3.5 w-3.5" /> Barcha e&apos;lonlar
            </TabsTrigger>
          )}
          {isCreator && (
            <TabsTrigger value="compose" className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Yangi e&apos;lon
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my" className="mt-4">
          <MyAnnouncementsList />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="all" className="mt-4">
            <AllAnnouncementsList />
          </TabsContent>
        )}

        {isCreator && (
          <TabsContent value="compose" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              <ComposeForm />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-xedu-slate-500" /> Qo‘llanma
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-xedu-slate-600 dark:text-xedu-slate-400">
                  <p>E&apos;lon yaratganda quyidagilarni hisobga oling:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>Maqsadli guruh</strong> — e&apos;lon kimlarga yetkazilishini tanlang.</li>
                    <li><strong>Muhimlik</strong> — shoshilinch e&apos;lonlar qizil belgi bilan ajratiladi.</li>
                    <li><strong>Tasdiqlash</strong> — agar bu parametr yoqilsa, foydalanuvchilar e&apos;lonni o&apos;qib, tasdiqlashi kerak bo&apos;ladi.</li>
                    <li>E&apos;lon faqat <strong>qoralama</strong> holatida tahrirlanishi mumkin.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MyAnnouncementCard({
  item,
  onRead,
  onAck,
  isReading,
  isAcking,
}: {
  item: MyAnnouncementItem;
  onRead: (id: string) => void;
  onAck: (id: string) => void;
  isReading: boolean;
  isAcking: boolean;
}) {
  const { announcement, receipt } = item;
  const isUnread = !receipt.isRead;
  const needsAck = announcement.requireAck && !receipt.acknowledgedAt;
  const cfg = PRIORITY_CONFIG[announcement.priority] ?? PRIORITY_CONFIG.normal;
  const PriorityIcon = cfg.icon;

  return (
    <Card className={cn('transition-colors', isUnread && 'border-primary/30 bg-primary/5')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('mt-0.5 h-9 w-9 rounded-full flex items-center justify-center shrink-0', cfg.color)}>
            <PriorityIcon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn('text-sm', isUnread ? 'font-semibold' : 'font-medium')}>
                  {announcement.title}
                </p>
                <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-0.5 line-clamp-2">
                  {announcement.body}
                </p>
              </div>
              {isUnread && (
                <Badge variant="default" className="shrink-0 text-[10px] h-5">Yangi</Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {renderPriorityBadge(announcement.priority)}
              {renderStatusBadge(announcement.status)}
              <span className="text-xs text-xedu-slate-400">
                <Clock className="h-3 w-3 inline mr-0.5" />
                {new Date(announcement.createdAt).toLocaleDateString('uz-UZ')}
              </span>
              {announcement.createdBy && (
                <span className="text-xs text-xedu-slate-400">
                  {announcement.createdBy.firstName} {announcement.createdBy.lastName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              {isUnread && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => onRead(announcement.id)}
                  disabled={isReading}
                >
                  <Eye className="h-3 w-3" /> O‘qildi deb belgilash
                </Button>
              )}
              {needsAck && (
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onAck(announcement.id)}
                  disabled={isAcking}
                >
                  <Check className="h-3 w-3" /> Tasdiqlash
                </Button>
              )}
              {receipt.acknowledgedAt && (
                <Badge variant="secondary" className="text-[10px] h-6 gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" /> Tasdiqlangan
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminAnnouncementCard({
  announcement,
  onCancel,
  isCancelling,
}: {
  announcement: Announcement;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const canCancel = announcement.status === 'active' || announcement.status === 'draft' || announcement.status === 'scheduled';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{announcement.title}</p>
              {renderPriorityBadge(announcement.priority)}
              {renderStatusBadge(announcement.status)}
            </div>
            <p className="text-xs text-xedu-slate-500 dark:text-xedu-slate-400 mt-1 line-clamp-1">
              {announcement.body}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-xedu-slate-400">
              <span>
                <Clock className="h-3 w-3 inline mr-0.5" />
                {new Date(announcement.createdAt).toLocaleDateString('uz-UZ')}
              </span>
              {announcement.createdBy && (
                <span>{announcement.createdBy.firstName} {announcement.createdBy.lastName}</span>
              )}
              {typeof announcement.receiptCount === 'number' && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {announcement.receiptCount} ta qabul qiluvchi
                </span>
              )}
            </div>
          </div>
          {canCancel && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={() => onCancel(announcement.id)}
              disabled={isCancelling}
              title="Bekor qilish"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper used inside sub-components (needs to be in scope)
function renderPriorityBadge(p: AnnouncementPriority) {
  const cfg = PRIORITY_CONFIG[p] ?? PRIORITY_CONFIG.normal;
  return (
    <Badge className={cn('text-xs font-medium', cfg.color)} variant="secondary">
      {cfg.label}
    </Badge>
  );
}

function renderStatusBadge(s: string) {
  const cfg = STATUS_CONFIG[s] ?? { label: s, variant: 'outline' as const };
  return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
}
