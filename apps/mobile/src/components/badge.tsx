import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Text } from './text';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import type { ThemeColors } from '@/theme/tokens';

type Tone = 'success' | 'danger' | 'warning' | 'neutral' | 'primary' | 'info';
type BadgeSize = 'sm' | 'md';

const TONE: Record<Tone, { fg: keyof ThemeColors; bg: keyof ThemeColors }> = {
  success: { fg: 'success', bg: 'successLight' },
  danger:  { fg: 'danger',  bg: 'dangerLight' },
  warning: { fg: 'warning', bg: 'warningLight' },
  info:    { fg: 'info',    bg: 'infoLight' },
  primary: { fg: 'primary', bg: 'primaryLight' },
  neutral: { fg: 'textMuted', bg: 'bgSubtle' },
};

/** Status badge -- pill shaklidagi belgi. */
export function Badge({
  label,
  tone = 'neutral',
  size = 'md',
  pulse = false,
}: {
  label: string;
  tone?: Tone;
  size?: BadgeSize;
  /** Pulse animatsiya -- muhim badge (unread count) */
  pulse?: boolean;
}) {
  const { theme } = useTheme();
  const t = TONE[tone];

  // Pulse animatsiya
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) {
      pulseScale.setValue(1);
      pulseScale.stopAnimation();
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.15,
          duration: 400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [pulse, pulseScale]);

  const padH = size === 'sm' ? spacing.sm + 1 : spacing.sm + 2;
  const padV = size === 'sm' ? 2 : 4;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: pulseScale }] },
        {
          alignSelf: 'flex-start',
          backgroundColor: theme[t.bg],
          paddingHorizontal: padH,
          paddingVertical: padV,
          borderRadius: radius.pill,
        },
      ]}
    >
      <Text
        variant={size === 'sm' ? 'label' : 'label'}
        style={{ color: theme[t.fg], fontSize: size === 'sm' ? 10 : 12 }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

export function attendanceTone(status: string): Tone {
  switch (status) {
    case 'present': return 'success';
    case 'absent':  return 'danger';
    case 'late':    return 'warning';
    case 'excused': return 'primary';
    default:         return 'neutral';
  }
}

export function paymentTone(status: string): Tone {
  switch (status) {
    case 'paid':    return 'success';
    case 'overdue':
    case 'failed':  return 'danger';
    case 'pending': return 'warning';
    default:         return 'neutral';
  }
}

export function leaveTone(status: string): Tone {
  switch (status) {
    case 'approved': return 'success';
    case 'rejected': return 'danger';
    case 'pending':  return 'warning';
    default:          return 'neutral';
  }
}
