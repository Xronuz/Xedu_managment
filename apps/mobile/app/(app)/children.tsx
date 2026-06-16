import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { Screen } from '@/components/screen';
import { DataList } from '@/components/data-list';
import { Row } from '@/components/row';
import { Avatar } from '@/components/avatar';
import { useTheme } from '@/theme/use-theme';

interface Child {
  id: string;
  firstName?: string;
  lastName?: string;
  class?: { name: string } | null;
  avatarUrl?: string | null;
}

export default function ChildrenScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();

  const query = useQuery<Child[]>({
    queryKey: ['parent', 'children'],
    queryFn: parentApi.getChildren,
  });

  return (
    <Screen title={t('tabs.children')} scroll={false}>
      <DataList
        query={query}
        keyExtractor={(c) => c.id}
        emptyIcon="people-outline"
        emptyTitle={t('home.noChildren')}
        emptySubtitle={t('home.noChildrenSub')}
        renderItem={(child) => (
          <Row
            onPress={() =>
              router.push({
                pathname: '/child/[id]',
                params: { id: child.id, name: `${child.firstName ?? ''} ${child.lastName ?? ''}`.trim() },
              })
            }
            leading={<Avatar name={`${child.firstName ?? ''} ${child.lastName ?? ''}`} uri={child.avatarUrl} size={44} />}
            title={`${child.firstName ?? ''} ${child.lastName ?? ''}`.trim()}
            subtitle={child.class?.name ?? t('child.noClass')}
            trailing={<Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}
          />
        )}
      />
    </Screen>
  );
}
