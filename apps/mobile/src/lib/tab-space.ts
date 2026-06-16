import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Suzuvchi pill nav ostida kontent qolmasligi uchun pastki bo'shliq. */
export function useTabBarSpace(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12) + 84;
}
