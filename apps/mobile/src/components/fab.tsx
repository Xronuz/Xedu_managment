import { Platform, Pressable, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/use-theme';

/** Suzuvchi yaratish tugmasi (pastki-o'ng) — emerald, Apple soft shadow. Pill nav ustida. */
export function Fab({ icon = 'add', onPress }: { icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const softShadow = Platform.select<ViewStyle>({
    ios: { shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.35 },
    android: { elevation: 10 },
    default: {},
  });
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          position: 'absolute',
          right: 20,
          bottom: Math.max(insets.bottom, 12) + 84,
          width: 58,
          height: 58,
          borderRadius: 22,
          backgroundColor: theme.primary,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.94 : 1 }],
          ...softShadow,
        },
      ]}
    >
      <Ionicons name={icon} size={26} color={theme.onPrimary} />
    </Pressable>
  );
}
