import { useRef, useEffect } from 'react';
import { Animated, View, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { Button } from './ui';
import { radius, spacing, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  subtitle,
  actionTitle,
  onAction,
  tone = 'neutral',
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionTitle?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
}) {
  const { theme } = useTheme();
  const iconColor = tone === 'danger' ? theme.danger : theme.primary;
  const iconBg = tone === 'danger' ? theme.dangerLight : theme.primaryLight;

  // Icon bounce animation
  const bounce = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, {
          toValue: -4,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounce, {
          toValue: 4,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [bounce]);

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.md }}>
      <Animated.View style={{ transform: [{ translateY: bounce }] }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: radius.pill,
            backgroundColor: iconBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={32} color={iconColor} />
        </View>
      </Animated.View>

      <View style={{ alignItems: 'center' }}>
        <Text variant="heading" center>
          {title}
        </Text>
      </View>

      {subtitle ? (
        <View style={{ alignItems: 'center' }}>
          <Text variant="body" color="textMuted" center style={{ maxWidth: 280 }}>
            {subtitle}
          </Text>
        </View>
      ) : null}

      {actionTitle && onAction ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button title={actionTitle} onPress={onAction} variant="tonal" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}
