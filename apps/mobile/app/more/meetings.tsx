import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { meetingsApi, type MeetingItem } from '@/api/school';
import { useAuthStore } from '@/store/auth.store';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Fab } from '@/components/fab';
import { formatDateTime } from '@/lib/format';
import { spacing } from '@/theme/tokens';

const MEDIUM_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  in_person: 'people-outline',
  phone: 'call-outline',
  video: 'videocam-outline',
};

function statusTone(s: string): 'success' | 'danger' | 'primary' {
  return s === 'completed' ? 'success' : s === 'cancelled' ? 'danger' : 'primary';
}

export default function MeetingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const isTeacher = role === 'teacher' || role === 'class_teacher';
  const canCreate = ['teacher', 'class_teacher', 'director', 'vice_principal', 'branch_admin'].includes(role);

  const query = useQuery<MeetingItem[]>({
    queryKey: ['meetings', 'my'],
    queryFn: meetingsApi.my,
  });

  return (
    <View style={{ flex: 1 }}>
    <DataList
      query={query}
      keyExtractor={(m) => m.id}
      emptyIcon="people-outline"
      emptyTitle={t('more.noMeetings')}
      renderItem={(m) => {
        const other = isTeacher ? m.parent : m.teacher;
        const otherName = other ? `${other.firstName ?? ''} ${other.lastName ?? ''}`.trim() : '—';
        const studentName = m.student ? `${m.student.firstName ?? ''} ${m.student.lastName ?? ''}`.trim() : '';
        return (
          <Card>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <IconBadge icon={MEDIUM_ICON[m.medium ?? 'in_person'] ?? 'people-outline'} color="info" bg="infoLight" />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {otherName}
                  </Text>
                  <Badge label={t(`meetingStatus.${m.status}`)} tone={statusTone(m.status)} />
                </View>
                {studentName ? (
                  <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                    {studentName}
                  </Text>
                ) : null}
                <Text variant="label" color="textMuted" style={{ marginTop: 6 }}>
                  {formatDateTime(m.scheduledAt)} · {t(`meetingMedium.${m.medium ?? 'in_person'}`)}
                </Text>
                {m.notes ? (
                  <Text variant="caption" color="textMuted" style={{ marginTop: 4 }} numberOfLines={2}>
                    {m.notes}
                  </Text>
                ) : null}
              </View>
            </View>
          </Card>
        );
      }}
    />
    {canCreate ? <Fab onPress={() => router.push('/more/meeting-new' as Href)} /> : null}
    </View>
  );
}
