import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';
import { useReduceMotion } from './use-reduce-motion';

/** Pressable style factory — extracted to avoid TSX arrow-return parse ambiguity. */
const pressedStyle = ({ pressed }: { pressed: boolean }) => ({
  opacity: pressed ? 0.92 : 1,
  transform: [{ scale: pressed ? 0.98 : 1 }],
});

/**
 * CURRENT · TrophyTile — an achievement tile.
 *
 * Earned = full colour + date. Locked = silhouette + hint of how to earn it.
 * Turns empty voids into invitations. The single most important primitive
 * for the "Profile = identity" shift. PlayStation trophies + Steam cards +
 * the "locked" overlay that makes you want it.
 *
 * See CURRENT_DESIGN_SYSTEM.md §7.
 */
export interface TrophyTileProps {
  earned: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** How to unlock — shown for locked. */
  hint?: string;
  /** Shown for earned. */
  dateEarned?: string;
  rarity?: 'common' | 'rare' | 'epic';
  onPress?: () => void;
}

export function TrophyTile({
  earned,
  icon,
  title,
  hint,
  dateEarned,
  rarity,
  onPress,
}: TrophyTileProps) {
  const { theme, shadow } = useTheme();
  const reduce = useReduceMotion();

  // Subtle earned shimmer (recent). Static fallback under reduce-motion.
  const shimmer = useRef(new Animated.Value(reduce ? 0 : 0)).current;

  const rarityColor = rarity === 'rare' ? theme.info : rarity === 'epic' ? theme.accent : null;

  const a11y = earned
    ? `${title}, earned${dateEarned ? ' ' + dateEarned : ''}${rarity ? ', ' + rarity : ''}`
    : `${title}, locked. ${hint ?? 'Keep going to unlock.'}`;

  const inner = (
    <View
      style={{
        borderRadius: radius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: earned ? theme.border : theme.border,
        backgroundColor: earned ? theme.card : theme.bgSubtle,
        ...shadow(earned ? 1 : 0),
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Rarity corner flair */}
      {earned && rarityColor ? (
        <View style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderLeftWidth: 18, borderLeftColor: 'transparent', borderTopWidth: 18, borderTopColor: rarityColor }} />
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: earned ? theme.accentLight : 'rgba(0,0,0,0.04)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: earned ? 0 : 1,
            borderColor: theme.border,
          }}
        >
          <Ionicons
            name={icon}
            size={24}
            color={earned ? theme.accent : theme.textMuted}
            style={{ opacity: earned ? 1 : 0.5 }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1} style={{ color: earned ? theme.text : theme.textMuted }}>
            {title}
          </Text>
          {earned ? (
            <Text variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 1 }}>
              {dateEarned ?? 'Earned'}
            </Text>
          ) : (
            <Text variant="caption" color="textMuted" numberOfLines={2} style={{ marginTop: 1 }}>
              {hint ?? 'Keep going to unlock'}
            </Text>
          )}
        </View>
        {!earned ? (
          <Ionicons name="lock-closed" size={14} color={theme.textMuted} />
        ) : null}
      </View>
    </View>
  );

  return (
    <Pressable
      onPress={() => { impact('light'); onPress?.(); }}
      disabled={!onPress}
      style={pressedStyle}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      {inner}
    </Pressable>
  );
}

/**
 * TrophyCase — grid of TrophyTile (2 per row by default).
 * Empty lists render nothing here — the parent should render TrophyTile(locked)
 * placeholders instead, so emptiness is always an invitation, never a void.
 */
export function TrophyCase({
  tiles,
  columns = 1,
  style,
}: {
  tiles: React.ReactNode[];
  columns?: 1 | 2;
  style?: View['props']['style'];
}) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, style]}>
      {tiles.map((t, i) => (
        <View key={i} style={{ width: columns === 2 ? '48%' : '100%' }}>
          {t}
        </View>
      ))}
    </View>
  );
}
