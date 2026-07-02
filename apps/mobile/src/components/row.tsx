import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { Card } from './card';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import type { ThemeColors } from '@/theme/tokens';

type IconSize = 'sm' | 'md' | 'lg';

const ICON_SIZES: Record<IconSize, number> = { sm: 32, md: 40, lg: 48 };

export function IconBadge({
  icon,
  color = 'primary',
  bg,
  size = 'md',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color?: keyof ThemeColors;
  bg?: keyof ThemeColors;
  size?: IconSize;
}) {
  const { theme } = useTheme();
  const s = ICON_SIZES[size];
  return (
    <View
      style={{
        width: s,
        height: s,
        borderRadius: radius.md,
        backgroundColor: theme[bg ?? 'primaryLight'],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={s * 0.5} color={theme[color]} />
    </View>
  );
}

/** Ro'yxat qatori: chap (avatar/ikon) · markaz (sarlavha+izoh) · o'ng (badge/qiymat). */
export function Row({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
}: {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Card onPress={onPress} padded>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {leading}
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing}
      </View>
    </Card>
  );
}
