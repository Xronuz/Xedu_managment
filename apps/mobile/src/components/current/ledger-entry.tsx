import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';
import { useReduceMotion } from './use-reduce-motion';

/**
 * CURRENT · LedgerEntry — one growth-framed moment in a vertical feed.
 *
 * v2 visual language: glossy gradient icon chip (emoji or ionicon), layered
 * depth, premium feel. Strava activity feed + a bank statement of growth.
 *
 * See CURRENT_DESIGN_SYSTEM.md §8.
 */
export type LedgerTone = 'xp' | 'coins' | 'win' | 'milestone' | 'neutral';

export interface LedgerEntryProps {
  delta?: string;
  label: string;
  sublabel?: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Kept for source-compat. v3 ignores it — premium SF glyphs only. */
  emoji?: string;
  tone?: LedgerTone;
  index?: number;
  onPress?: () => void;
}

function toneGradient(tone: LedgerTone, isDark: boolean): [string, string] {
  switch (tone) {
    case 'xp': return isDark ? ['#5BD6A4', '#1F8F62'] : ['#5BD6A4', '#0F9F66'];
    case 'coins': return ['#FFD980', '#E08A12'];
    case 'win': return isDark ? ['#5BD6A4', '#1F8F62'] : ['#5BD6A4', '#0F9F66'];
    case 'milestone': return isDark ? ['#F5B53D', '#C77D11'] : ['#FFCB52', '#E08A12'];
    default: return isDark ? ['#2A3530', '#1A2420'] : ['#EEF2EF', '#D7DEDA'];
  }
}

function toneFg(tone: LedgerTone, theme: Record<string, string>): string {
  switch (tone) {
    case 'xp': return theme.primary;
    case 'coins': return theme.accent;
    case 'win': return theme.primary;
    case 'milestone': return theme.accent;
    default: return theme.textMuted;
  }
}

/** Pressable style factory — extracted to avoid TSX arrow-return parse ambiguity. */
const pressedStyle = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.9 : 1,
  transform: [{ scale: pressed ? 0.99 : 1 }],
});

export function LedgerEntry({
  delta,
  label,
  sublabel,
  icon,
  emoji,
  tone = 'neutral',
  index = 0,
  onPress,
}: LedgerEntryProps) {
  const { theme, shadow, isDark } = useTheme();
  const reduce = useReduceMotion();
  const grad = toneGradient(tone, isDark);
  const fg = toneFg(tone, theme);

  const op = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const ty = useRef(new Animated.Value(reduce ? 0 : 8)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: anim.duration.normal, easing: Easing.out(Easing.cubic), useNativeDriver: true, delay: Math.min(index, 6) * 40 }),
      Animated.timing(ty, { toValue: 0, duration: anim.duration.normal, easing: Easing.out(Easing.cubic), useNativeDriver: true, delay: Math.min(index, 6) * 40 }),
    ]).start();
  }, [reduce, index, op, ty]);

  const isMilestone = tone === 'milestone';

  const a11y = `${label}${delta ? ', ' + delta : ''}${sublabel ? ', ' + sublabel : ''}`;

  const inner = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: isMilestone ? theme.accent + '33' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)'),
        },
        isMilestone ? { padding: spacing.md, ...shadow(2) } : shadow(1),
      ]}
    >
      {/* Glossy gradient icon chip */}
      <View style={{ width: 44, height: 44, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
        <LinearGradient colors={grad} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* top sheen */}
          <LinearGradient colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%' }} />
          <Ionicons name={icon} size={22} color={tone === 'neutral' ? theme.textMuted : '#FFFFFF'} />
        </LinearGradient>
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={2}>{label}</Text>
        {sublabel ? (
          <Text variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 1 }}>{sublabel}</Text>
        ) : null}
      </View>
      {delta ? (
        <View style={{
          backgroundColor: tone === 'neutral' ? theme.bgSubtle : (tone === 'coins' || tone === 'milestone' ? theme.accentLight : theme.primaryLight),
          borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 4,
        }}>
          <Text variant="label" style={{ color: fg, fontSize: 12 }}>{delta}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Animated.View style={{ opacity: op, transform: [{ translateY: ty }] }}>
      {onPress ? (
        <Pressable onPress={() => { impact('light'); onPress(); }} style={pressedStyle} accessibilityRole="button" accessibilityLabel={a11y}>
          {inner}
        </Pressable>
      ) : (
        <View accessibilityRole="text" accessibilityLabel={a11y}>{inner}</View>
      )}
    </Animated.View>
  );
}

/**
 * Ledger — a vertical feed of LedgerEntry.
 */
export function Ledger({ children, style }: { children: React.ReactNode; style?: View['props']['style'] }) {
  return <View style={[{ gap: spacing.sm }, style]}>{children}</View>;
}
