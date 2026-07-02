import { useRef } from 'react';
import { Animated, Image, Pressable, View } from 'react-native';
import { Text } from './text';
import { fonts, radius } from '@/theme/tokens';
import { impact } from '@/lib/haptics';

const AVATAR_COLORS = ['#0F7B53', '#2563EB', '#7C3AED', '#C77D11', '#0891B2', '#BE185D', '#4D7C0F'];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Avatar({
  name,
  uri,
  size = 44,
  ring = false,
  online = false,
  onPress,
}: {
  name: string;
  uri?: string | null;
  size?: number;
  /** Gradient halqa border — maxsus holatlar uchun */
  ring?: boolean;
  /** Online indicator — yashil nuqta (o'ng pastda) */
  online?: boolean;
  /** Bosish holati -- press animatsiya bilan */
  onPress?: () => void;
}) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.9,
      damping: 12,
      stiffness: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  };

  const avatarContent = uri ? (
    <Image
      source={{ uri }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
      }}
    />
  ) : (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colorFor(name || '?'),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: size * 0.38 }}>
        {initials(name || '?')}
      </Text>
    </View>
  );

  const wrapper = (
    <View style={{ position: 'relative' }}>
      {/* Ring -- gradient border */}
      {ring && (
        <View
          style={{
            position: 'absolute',
            width: size + 4,
            height: size + 4,
            borderRadius: (size + 4) / 2,
            borderWidth: 2,
            borderColor: '#0F7B53',
            left: -2,
            top: -2,
          }}
        />
      )}
      {avatarContent}

      {/* Online indicator */}
      {online && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.28,
            height: size * 0.28,
            borderRadius: (size * 0.28) / 2,
            backgroundColor: '#22C55E',
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={() => {
          impact('light');
          onPress();
        }}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ transform: [{ scale: pressScale }] }}
      >
        {wrapper}
      </AnimatedPressable>
    );
  }

  return wrapper;
}
