import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { messagingApi, type Conversation } from '@/api/messaging';
import { useAuthStore } from '@/store/auth.store';
import { Screen } from '@/components/screen';
import { DataList } from '@/components/data-list';
import { Row } from '@/components/row';
import { Avatar } from '@/components/avatar';
import { Badge } from '@/components/badge';
import { Text } from '@/components/text';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

export default function MessagesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const canStartNew = role === 'teacher' || role === 'class_teacher';

  const query = useQuery<Conversation[]>({
    queryKey: ['messaging', 'conversations'],
    queryFn: messagingApi.conversations,
  });

  const newBtn = canStartNew ? (
    <View>
      <Pressable
        onPress={() => { impact('light'); router.push('/chat/new'); }}
        style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}
      >
        <Ionicons name="create-outline" size={20} color={theme.primary} />
      </Pressable>
    </View>
  ) : undefined;

  return (
    <Screen title={t('messages.title')} right={newBtn} scroll={false}>
      <DataList
        query={query}
        keyExtractor={(c) => c.user.id}
        emptyIcon="chatbubbles-outline"
        emptyTitle={t('messages.empty')}
        emptySubtitle={t('messages.emptySub')}
        renderItem={(conv) => {
          const name = `${conv.user.firstName ?? ''} ${conv.user.lastName ?? ''}`.trim();
          return (
            <Row
              onPress={() => {
                impact('light');
                try {
                  router.push({ pathname: '/chat/[userId]', params: { userId: conv.user.id, name } });
                } catch (e) {
                  // graceful fallback
                }
              }}
              leading={<Avatar name={name} size={46} />}
              title={name}
              subtitle={conv.lastMessage?.content ?? ''}
              trailing={
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text variant="label" color="textMuted">
                    {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}
                  </Text>
                  {conv.unreadCount > 0 ? (
                    <Badge label={String(conv.unreadCount)} tone="primary" size="sm" pulse />
                  ) : null}
                </View>
              }
            />
          );
        }}
      />
    </Screen>
  );
}
