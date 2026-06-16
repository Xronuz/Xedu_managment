import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { studentApi } from '@/api/student';
import { useAuthStore } from '@/store/auth.store';
import { Text } from '@/components/text';
import { HeroCard } from '@/components/hero-card';
import { StudentHome } from '@/components/student-home';
import { Avatar } from '@/components/avatar';
import { Card } from '@/components/card';
import { Row } from '@/components/row';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { useTabBarSpace } from '@/lib/tab-space';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import type { ThemeColors } from '@/theme/tokens';

interface Child {
  id: string;
  firstName?: string;
  lastName?: string;
  class?: { name: string } | null;
  avatarUrl?: string | null;
}

const TEACHER_TILES = [
  { route: '/teach/today', icon: 'today-outline', labelKey: 'teach.todayLessons', color: 'primary', bg: 'primaryLight' },
  { route: '/teach/classes', icon: 'school-outline', labelKey: 'teach.myClasses', color: 'info', bg: 'infoLight' },
] as const;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const bottomSpace = useTabBarSpace();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? '').toLowerCase().trim();
  const isParent = role === 'parent';
  const isStudent = role === 'student';
  const isTeacher = role === 'teacher' || role === 'class_teacher';
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const childrenQuery = useQuery<Child[]>({
    queryKey: ['parent', 'children'],
    queryFn: parentApi.getChildren,
    enabled: isParent,
  });
  const coinsQuery = useQuery<{ coins: number }>({
    queryKey: ['student', 'coins', 'balance'],
    queryFn: studentApi.coinsBalance,
    enabled: isStudent,
    retry: false,
  });

  function openChild(child: Child) {
    router.push({
      pathname: '/child/[id]',
      params: { id: child.id, name: `${child.firstName ?? ''} ${child.lastName ?? ''}`.trim() },
    });
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: bottomSpace, gap: spacing.lg }}
        refreshControl={
          isParent ? (
            <RefreshControl refreshing={childrenQuery.isRefetching} onRefresh={childrenQuery.refetch} tintColor={theme.primary} />
          ) : undefined
        }
      >
        {isStudent ? (
          <StudentHome name={fullName} avatarUrl={user?.avatarUrl} coins={coinsQuery.data?.coins ?? 0} />
        ) : (
          <>
            <HeroCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" style={{ color: theme.onHeroMuted }}>
                    {t('home.welcome')}
                  </Text>
                  <Text variant="title" style={{ color: theme.onHero, marginTop: 2 }} numberOfLines={1}>
                    {fullName}
                  </Text>
                  <View style={{ alignSelf: 'flex-start', marginTop: spacing.sm, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: spacing.sm + 2, paddingVertical: 3, borderRadius: radius.pill }}>
                    <Text variant="label" style={{ color: theme.onHero }}>
                      {(role || '').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Avatar name={fullName || '?'} uri={user?.avatarUrl} size={56} />
              </View>
            </HeroCard>

            {isParent ? (
              <View style={{ gap: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Ionicons name="people" size={18} color={theme.text} />
                  <Text variant="heading">{t('home.myChildren')}</Text>
                </View>
                {childrenQuery.isLoading ? (
                  <ListSkeleton rows={2} />
                ) : childrenQuery.data && childrenQuery.data.length > 0 ? (
                  childrenQuery.data.map((child) => (
                    <Row
                      key={child.id}
                      onPress={() => openChild(child)}
                      leading={<Avatar name={`${child.firstName ?? ''} ${child.lastName ?? ''}`} uri={child.avatarUrl} size={44} />}
                      title={`${child.firstName ?? ''} ${child.lastName ?? ''}`.trim()}
                      subtitle={child.class?.name ?? t('child.noClass')}
                      trailing={<Ionicons name="chevron-forward" size={20} color={theme.textMuted} />}
                    />
                  ))
                ) : (
                  <EmptyState icon="people-outline" title={t('home.noChildren')} subtitle={t('home.noChildrenSub')} />
                )}
              </View>
            ) : isTeacher ? (
              <View style={{ gap: spacing.md }}>
                <Text variant="heading">{t('me.menu')}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                  {TEACHER_TILES.map((tile) => (
                    <Card key={tile.route} onPress={() => router.push(tile.route)} style={{ width: '47.5%', alignItems: 'flex-start', gap: spacing.md }}>
                      <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: theme[tile.bg as keyof ThemeColors], alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={tile.icon} size={22} color={theme[tile.color as keyof ThemeColors]} />
                      </View>
                      <Text variant="bodyStrong">{t(tile.labelKey)}</Text>
                    </Card>
                  ))}
                </View>
              </View>
            ) : (
              <EmptyState icon="construct-outline" title={t('home.comingSoon')} subtitle={t('home.notImplemented')} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
