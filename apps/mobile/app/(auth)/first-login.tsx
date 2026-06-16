import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { tokenStore } from '@/api/token-store';
import { Button, Field } from '@/components/ui';
import { Text } from '@/components/text';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function FirstLoginScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && newPassword !== confirm;

  async function onSubmit() {
    if (!currentPassword || newPassword.length < 8 || mismatch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.firstLogin(currentPassword, newPassword);
      await tokenStore.setTokens(res.tokens.accessToken, res.tokens.refreshToken);
      if (user) await setUser({ ...user, isFirstLogin: false });
    } catch (err) {
      const status = (err as AxiosError).response?.status;
      setError(status === 401 ? t('auth.invalidCredentials') : t('common.networkError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xxl }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ alignItems: 'center', marginBottom: spacing.xxl }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.lg,
                backgroundColor: theme.primaryLight,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={32} color={theme.primary} />
            </View>
            <Text variant="title" center>
              {t('auth.firstLoginTitle')}
            </Text>
            <Text variant="body" color="textMuted" center style={{ marginTop: spacing.xs }}>
              {t('auth.firstLoginHint')}
            </Text>
          </View>

          {error ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                backgroundColor: theme.dangerLight,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.lg,
              }}
            >
              <Ionicons name="alert-circle" size={20} color={theme.danger} />
              <Text variant="caption" color="danger" style={{ flex: 1 }}>
                {error}
              </Text>
            </View>
          ) : null}

          <Field
            label={t('auth.currentPassword')}
            leftIcon="lock-closed-outline"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label={t('auth.newPassword')}
            leftIcon="key-outline"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Field
            label={t('auth.confirmPassword')}
            leftIcon="key-outline"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoCapitalize="none"
            error={mismatch ? t('auth.passwordsDontMatch') : undefined}
          />
          <View style={{ marginTop: spacing.sm }}>
            <Button
              title={t('common.save')}
              onPress={onSubmit}
              loading={loading}
              disabled={!currentPassword || newPassword.length < 8 || mismatch}
              icon="checkmark-circle-outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
