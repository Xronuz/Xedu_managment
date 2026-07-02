import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { fonts } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function ChatLayout() {
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
      {/* [userId] sarlavhasini ekranning o'zi o'rnatadi (suhbatdosh ismi) */}
      <Stack.Screen name="[userId]" options={{ title: t('messages.title') }} />
      <Stack.Screen name="new" options={{ title: t('messages.newChat') }} />
    </Stack>
  );
}
