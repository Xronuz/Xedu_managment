/**
 * ErrorBanner — non-blocking inline xato banner'i (MOBILE_FOUNDATION_SPEC §2.11).
 * To'liq xatolar uchun `EmptyState` (tone="danger") ishlatiladi; qisman xatolar
 * uchun (bitta widget yuklanmadi, qolganlari OK) — shu banner.
 *
 * Ishlatish:
 *   {gradesError ? (
 *     <ErrorBanner
 *       message="Baholar yuklanmadi"
 *       onRetry={() => refetch()}
 *     />
 *   ) : null}
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';
import { impact } from '@/lib/haptics';

export type ErrorTone = 'danger' | 'warning' | 'info';

interface ErrorBannerProps {
  message: string;
  /** Qo'shimcha izoh (kichikroq matn). */
  detail?: string;
  tone?: ErrorTone;
  /** "Qayta urinish" tugmasi — berilmasa ko'rinmaydi. */
  onRetry?: () => void;
  retryLabel?: string;
}

const TONE = {
  danger: { bg: '#FCE8E8', fg: '#DC2626', icon: 'cloud-offline-outline' as const },
  warning: { bg: '#FCEEE3', fg: '#C2410C', icon: 'warning-outline' as const },
  info: { bg: '#E6EDFC', fg: '#2563EB', icon: 'information-circle-outline' as const },
};

export function ErrorBanner({
  message,
  detail,
  tone = 'danger',
  onRetry,
  retryLabel = 'Qayta',
}: ErrorBannerProps) {
  const { theme } = useTheme();
  const c = TONE[tone];

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg, borderColor: c.fg }]}>
      <Ionicons name={c.icon} size={18} color={c.fg} style={{ marginRight: spacing.sm }} />
      <View style={{ flex: 1 }}>
        <Text variant="caption" style={{ color: c.fg }}>{message}</Text>
        {detail ? (
          <Text variant="label" style={{ color: c.fg, opacity: 0.78, marginTop: 2 }}>{detail}</Text>
        ) : null}
      </View>
      {onRetry ? (
        <Pressable
          onPress={() => { impact('light'); onRetry(); }}
          hitSlop={8}
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: pressed ? c.fg : 'transparent', opacity: pressed ? 0.85 : 1, borderWidth: 1, borderColor: c.fg },
          ]}
        >
          {({ pressed }) => (
            <Text variant="label" style={{ color: pressed ? theme.card : c.fg }}>{retryLabel}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  retry: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
