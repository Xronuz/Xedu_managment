import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function ChildLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text, fontFamily: fonts.bold, fontSize: 18 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('tabs.children') }} />
      <Stack.Screen name="attendance" options={{ title: t('child.attendance') }} />
      <Stack.Screen name="grades" options={{ title: t('child.grades') }} />
      <Stack.Screen name="schedule" options={{ title: t('child.schedule') }} />
      <Stack.Screen name="payments" options={{ title: t('child.payments') }} />
      <Stack.Screen name="coins" options={{ title: t('child.coins') }} />
      <Stack.Screen name="portfolio" options={{ title: t('more.portfolio') }} />
      <Stack.Screen name="leave" options={{ title: t('child.leave') }} />
    </Stack>
  );
}
