import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function TeachLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { className } = useLocalSearchParams<{ className?: string }>();
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
      <Stack.Screen name="today" options={{ title: t('teach.todayLessons') }} />
      <Stack.Screen name="classes" options={{ title: t('teach.myClasses') }} />
      <Stack.Screen name="attendance" options={{ title: className || t('teach.markAttendance') }} />
      <Stack.Screen name="grades" options={{ title: className || t('teach.gradeEntry') }} />
    </Stack>
  );
}
