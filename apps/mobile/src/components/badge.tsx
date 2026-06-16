import { View } from 'react-native';
import { Text } from './text';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import type { ThemeColors } from '@/theme/tokens';

type Tone = 'success' | 'danger' | 'warning' | 'neutral' | 'primary' | 'info';

const TONE: Record<Tone, { fg: keyof ThemeColors; bg: keyof ThemeColors }> = {
  success: { fg: 'success', bg: 'successLight' },
  danger: { fg: 'danger', bg: 'dangerLight' },
  warning: { fg: 'warning', bg: 'warningLight' },
  info: { fg: 'info', bg: 'infoLight' },
  primary: { fg: 'primary', bg: 'primaryLight' },
  neutral: { fg: 'textMuted', bg: 'bgSubtle' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const { theme } = useTheme();
  const t = TONE[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: theme[t.bg],
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: radius.pill,
      }}
    >
      <Text variant="label" style={{ color: theme[t.fg] }}>
        {label}
      </Text>
    </View>
  );
}

export function attendanceTone(status: string): Tone {
  switch (status) {
    case 'present': return 'success';
    case 'absent': return 'danger';
    case 'late': return 'warning';
    case 'excused': return 'primary';
    default: return 'neutral';
  }
}

export function paymentTone(status: string): Tone {
  switch (status) {
    case 'paid': return 'success';
    case 'overdue':
    case 'failed': return 'danger';
    case 'pending': return 'warning';
    default: return 'neutral';
  }
}

export function leaveTone(status: string): Tone {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'pending': return 'warning';
    default: return 'neutral';
  }
}
