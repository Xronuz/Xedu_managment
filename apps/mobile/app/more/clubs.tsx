import { Alert, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { clubsApi, type ClubItem } from '@/api/school';
import { useAuthStore } from '@/store/auth.store';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui';
import { spacing } from '@/theme/tokens';

export default function ClubsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isStudent = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim() === 'student';

  const query = useQuery<ClubItem[]>({ queryKey: ['clubs', 'all'], queryFn: clubsApi.list });
  const myClubs = useQuery<ClubItem[]>({ queryKey: ['clubs', 'mine'], queryFn: clubsApi.myClubs, enabled: isStudent });
  const myIds = new Set((myClubs.data ?? []).map((c) => c.id));

  const join = useMutation({
    mutationFn: (clubId: string) => clubsApi.join(clubId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clubs'] });
      Alert.alert(t('common.success'), t('more.joinRequested'));
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? t('common.networkError');
      Alert.alert(t('common.error'), typeof msg === 'string' ? msg : t('common.error'));
    },
  });

  return (
    <DataList
      query={query}
      keyExtractor={(c) => c.id}
      emptyIcon="people-circle-outline"
      emptyTitle={t('more.noClubs')}
      renderItem={(club) => {
        const isMember = myIds.has(club.id);
        const count = club._count?.members;
        return (
          <Card>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <IconBadge icon="people-circle-outline" color="accent" bg="accentLight" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {club.name}
                </Text>
                <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                  {[club.schedule, count != null ? `${count} ${t('more.members')}` : null].filter(Boolean).join(' · ')}
                </Text>
                {club.description ? (
                  <Text variant="caption" color="textSecondary" style={{ marginTop: 4 }} numberOfLines={2}>
                    {club.description}
                  </Text>
                ) : null}
              </View>
              {isStudent ? (
                isMember ? (
                  <Badge label={t('more.joined')} tone="success" />
                ) : (
                  <Button title={t('more.join')} fullWidth={false} variant="tonal" onPress={() => join.mutate(club.id)} />
                )
              ) : null}
            </View>
          </Card>
        );
      }}
    />
  );
}
