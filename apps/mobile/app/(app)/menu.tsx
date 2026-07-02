import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { menuForRole, MENU_GROUPS, type MenuItem } from '@/config/menu';
import { Text } from '@/components/text';
import { SearchBar } from '@/components/search-bar';
import { useTabBarSpace } from '@/lib/tab-space';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

export default function MenuScreen() {
  const { t } = useTranslation();
  const { theme, shadow } = useTheme();
  const router = useRouter();
  const bottomSpace = useTabBarSpace();
  const role = useAuthStore((s) => s.user?.role) ?? '';
  const [search, setSearch] = useState('');

  const items = useMemo(() => menuForRole(role), [role]);
  
  // Custom label resolver for student specific static strings if missing in i18n
  const getLabel = (key: string) => {
    const customLabels: Record<string, string> = {
      'menu.schedule': 'Jadval',
      'menu.grades': 'Baholar',
      'menu.coins': 'Tangalar',
      'menu.achievements': 'Yutuqlar',
      'menu.portfolio': 'Portfolio',
      'menu.announcements': "E'lonlar",
      'menu.library': 'Kutubxona',
      'menu.homework': 'Uy vazifalari',
      'menu.courses': 'Kurslar',
    };
    if (customLabels[key]) return customLabels[key];
    return t(key);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => getLabel(m.labelKey).toLowerCase().includes(q));
  }, [items, search, t]);

  const groups = MENU_GROUPS.map((g) => ({ group: g, items: filtered.filter((m) => m.group === g) })).filter((x) => x.items.length > 0);

  function open(item: MenuItem) {
    if (item.built && item.route) {
      impact('light');
      router.push(item.route as Href);
    } else {
      Alert.alert('Tez orada ✨', getLabel(item.labelKey));
    }
  }

  const getGroupTitle = (group: string) => {
    switch (group) {
      case 'student_learning': return "Mening o'qishim";
      case 'student_growth': return "Mening o'sishim";
      case 'student_resources': return "Resurslar";
      default: return t(`menu.group${group.charAt(0).toUpperCase() + group.slice(1)}`);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
        <Text variant="title">{t('menu.title', 'Menyu')}</Text>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('menu.search', 'Qidirish')} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xs, paddingBottom: bottomSpace, gap: spacing.xl }}>
        {groups.length === 0 ? (
          <Text variant="body" color="textMuted" center style={{ marginTop: spacing.xxl }}>
            {t('menu.noResults', 'Natija topilmadi')}
          </Text>
        ) : (
          groups.map(({ group, items: gItems }) => (
            <View key={group} style={{ gap: spacing.sm }}>
              <Text variant="label" color="textMuted" style={{ marginLeft: spacing.xs, textTransform: 'uppercase' }}>
                {getGroupTitle(group)}
              </Text>
              <View style={{ backgroundColor: theme.card, borderRadius: radius.lg, borderWidth: 1, borderColor: theme.border, overflow: 'hidden', ...shadow(1) }}>
                {gItems.map((item, i) => (
                  <Pressable
                    key={item.key}
                    onPress={() => open(item)}
                    style={({ pressed }) => [
                      { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: item.built ? theme.primaryLight : theme.bgSubtle, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={item.icon} size={20} color={item.built ? theme.primary : theme.textMuted} />
                    </View>
                    <Text variant="bodyStrong" style={{ flex: 1 }}>
                      {getLabel(item.labelKey)}
                    </Text>
                    {item.built ? (
                      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                    ) : (
                      <View style={{ backgroundColor: theme.bgSubtle, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                        <Text variant="label" color="textMuted">
                          Tez orada
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
