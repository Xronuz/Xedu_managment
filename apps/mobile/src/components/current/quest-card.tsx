import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';
import { useReduceMotion } from './use-reduce-motion';

/**
 * CURRENT · QuestCard — homework / mission as a quest with a visible reward.
 *
 * Overdue is never a red alarm — it's "waiting, keep your streak strong".
 * Submission success is a celebration. Game quest log + battle-pass reward
 * visibility, without the punitive framing.
 *
 * See CURRENT_DESIGN_SYSTEM.md §10.
 */
export type QuestStatus = 'active' | 'overdue' | 'submitted' | 'graded';

export interface QuestCardProps {
  title: string;
  subject?: string;
  /** "Due in 2h" / "Due tomorrow" / "Overdue". */
  dueLabel?: string;
  xpReward?: number;
  coinReward?: number;
  status: QuestStatus;
  /** When graded, e.g. "92%" — shown WITHOUT red/green. */
  gradeLabel?: string;
  /** Show streak framing for overdue (only if student has a streak). */
  hasStreak?: boolean;
  onPress: () => void;
  /** Quick-action CTA inside the card. Falls back to onPress. */
  onSubmit?: () => void;
}

export function QuestCard({
  title,
  subject,
  dueLabel,
  xpReward,
  coinReward,
  status,
  gradeLabel,
  hasStreak = false,
  onPress,
  onSubmit,
}: QuestCardProps) {
  const { theme, shadow } = useTheme();
  const reduce = useReduceMotion();

  // Mount fade-up.
  const op = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.timing(op, { toValue: 1, duration: anim.duration.fast, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [reduce, op]);

  // Overdue eyebrow breathe.
  const breathe = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (status !== 'overdue' || reduce) {
      breathe.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 0.7, duration: 1250, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1, duration: 1250, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [status, reduce, breathe]);

  const isOverdue = status === 'overdue';
  const eyebrow = isOverdue ? 'waiting' : status === 'submitted' ? 'submitted' : status === 'graded' ? 'graded' : null;
  const eyebrowColor = isOverdue ? theme.warning : status === 'submitted' || status === 'graded' ? theme.primary : theme.textMuted;

  const rewardBadge = (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {xpReward != null && xpReward > 0 ? (
        <View style={{ backgroundColor: theme.accentLight, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Text variant="label" style={{ color: theme.accent, fontSize: 11 }}>+{xpReward} XP</Text>
        </View>
      ) : null}
      {coinReward != null && coinReward > 0 ? (
        <View style={{ backgroundColor: theme.accentLight, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons name="medal" size={11} color={theme.accent} />
          <Text variant="label" style={{ color: theme.accent, fontSize: 11 }}>{coinReward}</Text>
        </View>
      ) : null}
    </View>
  );

  const ctaLabel = status === 'active' ? 'Start' : status === 'overdue' ? 'Finish now' : status === 'submitted' ? null : 'View growth';

  const a11y = `${title}${subject ? ', ' + subject : ''}${dueLabel ? ', ' + dueLabel : ''}${xpReward ? ', reward ' + xpReward + ' XP' : ''}, ${status}`;

  return (
    <Animated.View style={{ opacity: op }}>
      <Pressable
        onPress={() => { impact('light'); onPress(); }}
        style={({ pressed }) => [
          {
            backgroundColor: theme.card,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: isOverdue ? theme.warning + '44' : theme.border,
            padding: spacing.lg,
            ...shadow(1),
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.99 : 1 }],
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={a11y}
      >
        {/* Header row: status icon + title + reward */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <View style={{ width: 20, alignItems: 'center', paddingTop: 2 }}>
            {status === 'graded' || status === 'submitted' ? (
              <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
            ) : isOverdue ? (
              <Ionicons name="time" size={18} color={theme.warning} />
            ) : (
              <Ionicons name="radio-button-on" size={14} color={theme.primary} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong" numberOfLines={2}>
              {title}
            </Text>
            {(dueLabel || subject) ? (
              <Text variant="caption" color="textMuted" style={{ marginTop: 2 }} numberOfLines={1}>
                {[dueLabel, subject].filter(Boolean).join(' · ')}
              </Text>
            ) : null}
          </View>

          {rewardBadge}
        </View>

        {/* Overdue streak framing — supportive, never punitive */}
        {isOverdue && hasStreak ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, paddingLeft: 28 }}>
            <Ionicons name="flame" size={13} color="#F97316" />
            <Text variant="caption" color="textSecondary">
              Finish to keep your streak strong
            </Text>
          </View>
        ) : null}

        {/* Eyebrow row for submitted/graded */}
        {eyebrow && !isOverdue ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, paddingLeft: 28 }}>
            <Text variant="label" style={{ color: eyebrowColor, textTransform: 'uppercase' as const, fontSize: 10, letterSpacing: 1 }}>
              {eyebrow}
            </Text>
            {gradeLabel ? (
              <View style={{ backgroundColor: theme.bgSubtle, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 }}>
                <Text variant="label" style={{ fontSize: 11 }}>{gradeLabel}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* CTA */}
        {ctaLabel ? (
          <Pressable
            onPress={() => { impact('light'); (onSubmit ?? onPress)(); }}
            style={({ pressed }) => [
              {
                marginTop: spacing.md,
                backgroundColor: isOverdue ? theme.warning : theme.primary,
                borderRadius: radius.md,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: spacing.xs,
                marginLeft: 28,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            <Text variant="bodyStrong" style={{ color: '#FFFFFF' }}>{ctaLabel}</Text>
          </Pressable>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
