import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useChildParams } from '@/hooks/use-child';
import { Text } from '@/components/text';
import { Card } from '@/components/card';
import { Avatar } from '@/components/avatar';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const SECTIONS = [
  { key: 'attendance', icon: 'checkmark-done-outline', labelKey: 'child.attendance', color: 'success', bg: 'successLight' },
  { key: 'grades', icon: 'stats-chart-outline', labelKey: 'child.grades', color: 'info', bg: 'infoLight' },
  { key: 'schedule', icon: 'calendar-outline', labelKey: 'child.schedule', color: 'primary', bg: 'primaryLight' },
  { key: 'payments', icon: 'card-outline', labelKey: 'child.payments', color: 'warning', bg: 'warningLight' },
  { key: 'coins', icon: 'medal-outline', labelKey: 'child.coins', color: 'accent', bg: 'accentLight' },
  { key: 'leave', icon: 'document-text-outline', labelKey: 'child.leave', color: 'danger', bg: 'dangerLight' },
] as const;

export default function ChildHub() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { id, name } = useChildParams();

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Avatar name={name} size={52} />
          <View style={{ flex: 1 }}>
            <Text variant="heading" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="caption" color="textMuted">
              {t('tabs.children')}
            </Text>
          </View>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {SECTIONS.map((s) => (
          <Card
            key={s.key}
            onPress={() => router.push({ pathname: `/child/[id]/${s.key}`, params: { id, name } })}
            style={{ width: '47.5%', alignItems: 'flex-start', gap: spacing.md }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                backgroundColor: theme[s.bg],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={s.icon} size={22} color={theme[s.color]} />
            </View>
            <Text variant="bodyStrong">{t(s.labelKey)}</Text>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}
