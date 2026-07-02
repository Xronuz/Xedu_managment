import { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from './text';
import { Card } from './card';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';
import type { ThemeColors } from '@/theme/tokens';

export interface Tile {
  route: string;
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
  /** Ixtiyoriy izoh — widget uslubidagi karta uchun (ikkinchi qator). */
  descKey?: string;
  color: keyof ThemeColors;
  bg: keyof ThemeColors;
}

/** Widget uslubidagi bo'lim plitkalari (admin/o'qituvchi home). Bosilsa — o'tadi. */
export function TileGrid({ tiles }: { tiles: readonly Tile[] }) {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  const containerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(containerOpacity, {
      toValue: 1,
      duration: anim.duration.normal,
      useNativeDriver: true,
    }).start();
  }, [containerOpacity]);

  return (
    <Animated.View
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, opacity: containerOpacity }}
    >
      {tiles.map((tile, idx) => (
        <TileItem key={tile.route} tile={tile} index={idx} theme={theme} router={router} t={t} />
      ))}
    </Animated.View>
  );
}

function TileItem({ tile, index, theme, router, t }: {
  tile: Tile;
  index: number;
  theme: Record<string, string>;
  router: ReturnType<typeof useRouter>;
  t: ReturnType<typeof useTranslation>['t'];
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 1,
        duration: anim.duration.fast,
        useNativeDriver: true,
      }).start();
    }, index * 60);
    return () => clearTimeout(timer);
  }, [index, opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Card
        onPress={() => {
          impact('light');
          router.push(tile.route as Href);
        }}
        style={{ width: '47.5%', alignItems: 'flex-start', gap: spacing.sm, minHeight: tile.descKey ? 132 : undefined }}
      >
        <View style={{ flexDirection: 'row', alignSelf: 'stretch', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: theme[tile.bg], alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={tile.icon} size={23} color={theme[tile.color]} />
          </View>
          <Ionicons name="arrow-forward" size={16} color={theme.textMuted} />
        </View>
        <Text variant="bodyStrong" numberOfLines={1}>
          {t(tile.labelKey)}
        </Text>
        {tile.descKey ? (
          <Text variant="caption" color="textMuted" numberOfLines={2}>
            {t(tile.descKey)}
          </Text>
        ) : null}
      </Card>
    </Animated.View>
  );
}
