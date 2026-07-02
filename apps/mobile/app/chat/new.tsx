import { useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { messagingApi, type ChatUser } from '@/api/messaging';
import { Row } from '@/components/row';
import { Avatar } from '@/components/avatar';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { fonts, radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

function normalizeUsers(raw: unknown): ChatUser[] {
  if (Array.isArray(raw)) return raw as ChatUser[];
  const data = (raw as { data?: ChatUser[] })?.data;
  return Array.isArray(data) ? data : [];
}

export default function NewChatScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['messaging', 'contacts', search],
    queryFn: () => messagingApi.contacts(search || undefined),
    select: normalizeUsers,
  });

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, paddingHorizontal: spacing.md, height: 48 }}>
          <Ionicons name="search" size={18} color={theme.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t('messages.searchContacts')}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            style={{ flex: 1, color: theme.text, fontFamily: fonts.medium, fontSize: 15 }}
          />
        </View>
      </View>

      {query.isLoading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.md, flexGrow: 1 }}
          renderItem={({ item }) => {
            const name = `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim();
            return (
              <Row
                onPress={() => router.replace({ pathname: '/chat/[userId]', params: { userId: item.id, name } })}
                leading={<Avatar name={name} size={44} />}
                title={name}
                subtitle={item.role}
              />
            );
          }}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', minHeight: 300 }}>
              <EmptyState icon="people-outline" title={t('messages.noContacts')} />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
