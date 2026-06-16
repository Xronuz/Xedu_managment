import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function MeLayout() {
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
      <Stack.Screen name="attendance" options={{ title: t('child.attendance') }} />
      <Stack.Screen name="homework" options={{ title: t('me.homework') }} />
      <Stack.Screen name="coins" options={{ title: t('child.coins') }} />
    </Stack>
  );
}
