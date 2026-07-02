import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { teacherApi } from '@/api/teacher';
import { useAuthStore } from '@/store/auth.store';
import { Screen } from '@/components/screen';
import { Skel } from '@/components/dashboard-kit';
import { Timeline, type TimelineItem } from '@/components/timeline';
import { ActionSheet } from '@/components/action-sheet';
import { EmptyState } from '@/components/empty-state';
import { ErrorBanner } from '@/components/error-banner';
import { spacing } from '@/theme/tokens';
import { impact } from '@/lib/haptics';

interface Lesson {
  id: string;
  timeSlot: number;
  startTime?: string;
  endTime?: string;
  classId?: string;
  class?: { id?: string; name?: string } | null;
  subject?: { id?: string; name?: string } | null;
  room?: { name?: string } | null;
}

export default function TeachTodayTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? '').toLowerCase().trim();

  // Permission check (MOBILE_FOUNDATION_SPEC §3.1). today tab faqat teacher uchun.
  const allowed = role === 'teacher' || role === 'class_teacher';

  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  const query = useQuery<Lesson[]>({
    queryKey: ['teacher', 'schedule', 'today'],
    queryFn: teacherApi.scheduleToday,
    retry: false,
  });

  if (!allowed) {
    return (
      <Screen title={t('teach.todayLessons')} scroll={false}>
        <EmptyState icon="shield-outline" title={t('common.error')} subtitle={t('home.notImplemented')} />
      </Screen>
    );
  }

  const rawData: any = query.data;
  const lessons: Lesson[] = Array.isArray(rawData) ? rawData : rawData?.data ?? rawData?.items ?? [];
  const loading = query.isLoading;

  // Schedule → TimelineItem mapping (tappable).
  const timelineItems: TimelineItem[] = lessons.map((l) => ({
    id: l.id,
    time: l.startTime ?? `${7 + l.timeSlot}:00`,
    title: l.subject?.name ?? t('menu.subjects'),
    subtitle: [l.class?.name, l.room?.name ? `${l.room.name}-xona` : null].filter(Boolean).join(' · '),
    icon: 'school',
    onPress: () => { impact('light'); setActiveLesson(l); },
  }));

  // Action sheet params — Attendance/Grade/Homework ga navigate qilish uchun.
  const lesson = activeLesson;
  const classId = lesson?.class?.id ?? lesson?.classId ?? '';
  const subjectId = lesson?.subject?.id ?? '';
  const className = lesson?.class?.name ?? '';
  const subjectName = lesson?.subject?.name ?? '';

  function goto(route: string, params: Record<string, string>) {
    setActiveLesson(null);
    router.push({ pathname: route as any, params });
  }

  return (
    <>
      <Screen title={t('teach.todayLessons')} scroll={false}>
        {query.isError ? (
          <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />
        ) : null}

        {loading ? (
          <View style={{ gap: spacing.md, padding: spacing.lg }}>
            <Skel w="40%" h={14} />
            <Skel w="100%" h={56} />
            <Skel w="100%" h={56} />
            <Skel w="100%" h={56} />
          </View>
        ) : lessons.length > 0 ? (
          <View style={{ padding: spacing.lg, gap: spacing.md }}>
            <Timeline items={timelineItems} />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState icon="cafe-outline" title={t('teach.noLessons')} subtitle={t('teach.allDoneSub')} />
          </View>
        )}
      </Screen>

      {/* Lesson quick-action sheet (Week 6 — dars card bosilganda) */}
      <ActionSheet
        visible={!!lesson}
        title={lesson ? `${lesson.startTime ?? ''} · ${subjectName || t('menu.subjects')}` : ''}
        onDismiss={() => setActiveLesson(null)}
        options={[
          {
            label: t('teach.markAttendance'),
            icon: 'checkmark-done-circle',
            tone: 'success',
            onPress: () => goto('/teach/attendance', { classId, className, scheduleId: lesson?.id ?? '' }),
          },
          {
            label: t('teach.gradeEntry'),
            icon: 'create',
            tone: 'warning',
            onPress: () => goto('/teach/grades', { classId, className, subjectId, subjectName }),
          },
          {
            label: t('menu.homework'),
            icon: 'book',
            tone: 'primary',
            onPress: () => goto('/teach/homework', { classId, className, subjectId, subjectName }),
          },
        ]}
      />
    </>
  );
}
