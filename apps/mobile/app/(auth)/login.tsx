import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';
import { Button, Field } from '@/components/ui';
import { Text } from '@/components/text';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.login(email.trim().toLowerCase(), password);
      await setSession(res.user, res.tokens);
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
          <View style={{ alignItems: 'center', marginBottom: spacing.xxxl }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.lg,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <Ionicons name="school" size={34} color={theme.onPrimary} />
            </View>
            <Text variant="display">{t('common.appName')}</Text>
            <Text variant="body" color="textMuted" style={{ marginTop: spacing.xs }}>
              {t('auth.loginTitle')}
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
            label={t('auth.email')}
            leftIcon="mail-outline"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="email@maktab.uz"
          />
          <Field
            label={t('auth.password')}
            leftIcon="lock-closed-outline"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError(null);
            }}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            placeholder="••••••••"
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          <View style={{ marginTop: spacing.sm }}>
            <Button
              title={loading ? t('auth.loggingIn') : t('auth.login')}
              onPress={onSubmit}
              loading={loading}
              disabled={!email.trim() || !password}
              icon="log-in-outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
