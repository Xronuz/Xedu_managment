import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { teacherApi } from '@/api/teacher';
import { kpiApi, type TeacherKpi } from '@/api/school';
import { Text } from './text';
import { Avatar } from './avatar';
import { NotifBell } from './notif-bell';
import { Surface, Skel, FocusBlock, DashMetric, DashAction } from './dashboard-kit';
import { Timeline, type TimelineItem } from './timeline';
import { spacing } from '@/theme/tokens';
import { impact } from '@/lib/haptics';

const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const UZ_DAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];

interface ScheduleSlot {
  id?: string;
  timeSlot?: number;
  startTime?: string;
  endTime?: string;
  subject?: { name?: string } | null;
  class?: { name?: string } | null;
  room?: { name?: string } | null;
}
interface Klass { id?: string }

export function TeacherHome({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const { t } = useTranslation();
  const router = useRouter();

  const scheduleQ = useQuery<ScheduleSlot[]>({ queryKey: ['teacher', 'schedule', 'today'], queryFn: teacherApi.scheduleToday, retry: false });
  const classesQ = useQuery<Klass[]>({ queryKey: ['teacher', 'classes'], queryFn: teacherApi.myClasses, retry: false });
  const kpiQ = useQuery<TeacherKpi>({ queryKey: ['teacher', 'kpi'], queryFn: kpiApi.myPoints, retry: false });

  const lessons = scheduleQ.data ?? [];
  const classCount = (classesQ.data ?? []).length;
  const kpiMonth = kpiQ.data?.thisMonth;
  const loading = scheduleQ.isLoading;
  const now = new Date();
  const dateLabel = `${UZ_DAYS[now.getDay()]}, ${now.getDate()} ${UZ_MONTHS[now.getMonth()]}`;

  const focus = lessons.length > 0
    ? { icon: 'today' as const, title: t('teach.lessonsN', { n: lessons.length }), sub: lessons[0]?.subject?.name ? t('teach.firstLesson', { s: lessons[0].subject?.name }) : '', tone: 'primary' as const, route: '/today' as Href }
    : { icon: 'cafe' as const, title: t('teach.allDone'), sub: t('teach.allDoneSub'), tone: 'success' as const, route: '/today' as Href };

  // Schedule → TimelineItem mapping.
  const timelineItems: TimelineItem[] = lessons.map((l) => ({
    id: l.id ?? `${l.timeSlot ?? ''}-${l.subject?.name ?? ''}`,
    time: l.startTime ?? (l.timeSlot != null ? `${7 + l.timeSlot}:00` : ''),
    title: l.subject?.name ?? t('menu.subjects'),
    subtitle: [l.class?.name, l.room?.name ? `${l.room.name}-xona` : null].filter(Boolean).join(' · '),
    icon: 'school' as const,
  }));

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar name={name || '?'} uri={avatarUrl} size={46} />
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>{name}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>{t('role.teacher')} · {dateLabel}</Text>
        </View>
        <NotifBell />
      </View>

      <FocusBlock label={t('teach.focusTitle')} tone={focus.tone} icon={focus.icon} title={focus.title} subtitle={focus.sub} loading={loading} onPress={() => { impact('light'); router.push(focus.route); }} />

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">{t('teach.lessonsToday')}</Text>
        {scheduleQ.isLoading ? (
          <Surface style={{ padding: spacing.lg, gap: spacing.md }}>
            <Skel w="40%" h={14} />
            <Skel w="100%" h={48} />
            <Skel w="100%" h={48} />
          </Surface>
        ) : lessons.length > 0 ? (
          <Timeline items={timelineItems} />
        ) : (
          <Surface style={{ padding: spacing.xl, alignItems: 'center', gap: spacing.sm }}>
            <Ionicons name="cafe-outline" size={32} color="#94A3B8" />
            <Text variant="bodyStrong">{t('teach.noLessons')}</Text>
          </Surface>
        )}
      </View>

      <View style={{ gap: spacing.md }}>
        <Text variant="heading">{t('teach.overview')}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <DashMetric icon="school-outline" label={t('teach.myClasses')} value={classesQ.isLoading ? null : classCount} />
          <DashMetric icon="today-outline" label={t('teach.lessonsToday')} value={loading ? null : lessons.length} tone="info" />
          <DashMetric icon="trophy-outline" label={t('teach.kpiMonth')} value={kpiQ.isLoading ? null : kpiMonth ?? null} tone="accent" />
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text variant="heading">{t('teach.quick')}</Text>
        <DashAction icon="checkmark-done-outline" label={t('teach.markAttendance')} route="/today" />
        <DashAction icon="book-outline" label={t('menu.homework')} route="/more/homework" />
        <DashAction icon="school-outline" label={t('teach.myClasses')} route="/classes" />
        <DashAction icon="trophy-outline" label={t('more.kpi')} route="/more/kpi" />
        <DashAction icon="airplane-outline" label={t('more.myLeave')} route="/more/leave" />
      </View>
    </View>
  );
}
