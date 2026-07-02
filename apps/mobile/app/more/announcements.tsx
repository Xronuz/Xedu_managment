import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { announcementsApi, type AnnouncementItem } from '@/api/school';
import { useAuthStore } from '@/store/auth.store';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Fab } from '@/components/fab';
import { XBottomSheet, type XBottomSheetRef } from '@/components/bottom-sheet';
import { formatDateTime } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function AnnouncementsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const canCreate = ['director', 'vice_principal', 'super_admin'].includes(role);

  const [selected, setSelected] = useState<AnnouncementItem['announcement'] | null>(null);
  const sheetRef = useRef<XBottomSheetRef>(null);

  const query = useQuery<{ data: AnnouncementItem[] }, Error, AnnouncementItem[]>({
    queryKey: ['announcements', 'my'],
    queryFn: announcementsApi.my,
    select: (r) => r?.data ?? [],
  });

  const markRead = useMutation({
    mutationFn: (announcementId: string) => announcementsApi.markRead(announcementId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements', 'my'] }),
  });

  function openDetail(item: AnnouncementItem) {
    if (!item.isRead) markRead.mutate(item.announcement.id);
    setSelected(item.announcement);
    sheetRef.current?.present();
  }

  return (
    <View style={{ flex: 1 }}>
      <DataList
        query={query}
        keyExtractor={(it) => it.id}
        emptyIcon="megaphone-outline"
        emptyTitle={t('more.noAnnouncements')}
        renderItem={(it) => {
          const a = it.announcement;
          const urgent = a.priority === 'urgent' || a.priority === 'high';
          return (
            <Card onPress={() => openDetail(it)}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <IconBadge icon="megaphone-outline" color={urgent ? 'danger' : 'primary'} bg={urgent ? 'dangerLight' : 'primaryLight'} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
                      {a.title}
                    </Text>
                    {!it.isRead ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: theme.primary }} /> : null}
                  </View>
                  <Text variant="caption" color="textSecondary" style={{ marginTop: 4 }} numberOfLines={4}>
                    {a.body}
                  </Text>
                  <Text variant="label" color="textMuted" style={{ marginTop: 6 }}>
                    {formatDateTime(a.createdAt)}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
      />
      {canCreate ? <Fab onPress={() => router.push('/more/announcement-new' as Href)} /> : null}

      <XBottomSheet ref={sheetRef} snapPoint={75}>
        {selected && (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <IconBadge
                icon="megaphone-outline"
                color={selected.priority === 'urgent' || selected.priority === 'high' ? 'danger' : 'primary'}
                bg={selected.priority === 'urgent' || selected.priority === 'high' ? 'dangerLight' : 'primaryLight'}
              />
              <Text variant="heading" style={{ flex: 1 }}>{selected.title}</Text>
            </View>
            <Text variant="caption" color="textMuted">
              {formatDateTime(selected.createdAt)} • {selected.createdBy?.firstName} {selected.createdBy?.lastName}
            </Text>
            <Text variant="body">{selected.body}</Text>
          </View>
        )}
      </XBottomSheet>
    </View>
  );
}
