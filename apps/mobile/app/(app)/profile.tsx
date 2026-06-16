import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/auth.store';
import { studentApi } from '@/api/student';
import { setLanguage } from '@/i18n/language';
import type { AppLanguage } from '@/i18n';
import { useThemeStore, type ThemeMode } from '@/theme/theme-store';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { Avatar } from '@/components/avatar';
import { StudentHero } from '@/components/student-hero';
import { Button } from '@/components/ui';
import { IconBadge } from '@/components/row';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const LANGS: { code: AppLanguage; label: string }[] = [
  { code: 'uz', label: "O‘zbekcha" },
  { code: 'ru', label: 'Русский' },
];

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [lang, setLang] = useState<string>(i18n.language);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const isStudent = (user?.role ?? '').toLowerCase().trim() === 'student';

  const THEMES: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap }[] = [
    { mode: 'system', icon: 'phone-portrait-outline' },
    { mode: 'light', icon: 'sunny-outline' },
    { mode: 'dark', icon: 'moon-outline' },
  ];
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  const coinsQuery = useQuery<{ coins: number }>({
    queryKey: ['student', 'coins', 'balance'],
    queryFn: studentApi.coinsBalance,
    enabled: isStudent,
    retry: false,
  });

  function confirmLogout() {
    Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('auth.logout'), style: 'destructive', onPress: () => logout() },
    ]);
  }
  async function changeLang(code: AppLanguage) {
    setLang(code);
    await setLanguage(code);
  }

  return (
    <Screen title={t('tabs.profile')}>
      {isStudent ? (
        <>
          <StudentHero name={fullName} avatarUrl={user?.avatarUrl} coins={coinsQuery.data?.coins ?? 0} />
          {/* Badges (kelajak) */}
          <Text variant="label" color="textMuted" style={{ marginTop: spacing.sm, marginLeft: spacing.xs }}>
            {t('student.badges').toUpperCase()}
          </Text>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <IconBadge icon="ribbon-outline" color="accent" bg="accentLight" />
              <Text variant="caption" color="textMuted" style={{ flex: 1 }}>
                {t('student.noBadges')}
              </Text>
            </View>
          </Card>
        </>
      ) : (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Avatar name={fullName || '?'} uri={user?.avatarUrl} size={56} />
            <View style={{ flex: 1 }}>
              <Text variant="heading" numberOfLines={1}>
                {fullName}
              </Text>
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {user?.email}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Language */}
      <Text variant="label" color="textMuted" style={{ marginTop: spacing.sm, marginLeft: spacing.xs }}>
        {t('profile.language').toUpperCase()}
      </Text>
      <Card padded={false}>
        {LANGS.map((l, i) => {
          const active = lang === l.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => changeLang(l.code)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}
            >
              <IconBadge icon="language-outline" />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {l.label}
              </Text>
              {active ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
            </Pressable>
          );
        })}
      </Card>

      {/* Appearance */}
      <Text variant="label" color="textMuted" style={{ marginTop: spacing.sm, marginLeft: spacing.xs }}>
        {t('profile.appearance').toUpperCase()}
      </Text>
      <Card padded={false}>
        {THEMES.map((th, i) => {
          const active = themeMode === th.mode;
          return (
            <Pressable
              key={th.mode}
              onPress={() => setThemeMode(th.mode)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: theme.border }}
            >
              <IconBadge icon={th.icon} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {t(`theme.${th.mode}`)}
              </Text>
              {active ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
            </Pressable>
          );
        })}
      </Card>

      {/* About */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconBadge icon="information-circle-outline" bg="bgSubtle" color="textMuted" />
            <Text variant="bodyStrong">{t('profile.version')}</Text>
          </View>
          <Text variant="body" color="textMuted">
            {Constants.expoConfig?.version ?? '1.0.0'}
          </Text>
        </View>
      </Card>

      <View style={{ marginTop: spacing.sm }}>
        <Button title={t('auth.logout')} variant="ghost" icon="log-out-outline" onPress={confirmLogout} />
      </View>
    </Screen>
  );
}
