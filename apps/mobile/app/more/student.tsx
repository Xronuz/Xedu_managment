import { ActivityIndicator, Linking, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { studentsApi, type Person } from '@/api/admin';
import { useAuthStore } from '@/store/auth.store';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui';
import { IconBadge } from '@/components/row';
import { EmptyState } from '@/components/empty-state';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function StudentDetailScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const canAddPayment = ['director', 'accountant', 'branch_admin'].includes(role);

  const { data, isLoading, isError, refetch } = useQuery<Person>({
    queryKey: ['students', 'detail', id],
    queryFn: () => studentsApi.get(id),
    enabled: !!id,
  });

  const fullName = data ? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim() : name ?? '';

  return (
    <Screen title={name || t('menu.students')}>
      <Stack.Screen options={{ title: name || t('menu.students') }} />
      {isLoading ? (
        <View style={{ paddingVertical: spacing.xxxl }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : isError || !data ? (
        <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} actionTitle={t('common.retry')} onAction={() => refetch()} />
      ) : (
        <>
          <Card>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Avatar name={fullName} uri={data.avatarUrl} size={72} />
              <Text variant="heading" center>
                {fullName}
              </Text>
              <Badge label={data.isActive === false ? t('crud.inactive') : t('crud.active')} tone={data.isActive === false ? 'neutral' : 'success'} />
            </View>
          </Card>

          {data.email ? (
            <Card onPress={() => Linking.openURL(`mailto:${data.email}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <IconBadge icon="mail-outline" />
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {data.email}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </View>
            </Card>
          ) : null}
          {data.phone ? (
            <Card onPress={() => Linking.openURL(`tel:${data.phone}`)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <IconBadge icon="call-outline" color="success" bg="successLight" />
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {data.phone}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
              </View>
            </Card>
          ) : null}

          {canAddPayment ? (
            <View style={{ marginTop: spacing.sm }}>
              <Button title={t('fin.addPayment')} icon="cash-outline" variant="tonal" onPress={() => router.push({ pathname: '/more/payment-new', params: { studentId: id, name: fullName } } as unknown as Href)} />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
