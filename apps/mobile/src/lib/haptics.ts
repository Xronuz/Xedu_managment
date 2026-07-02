import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback utilities — Xedu interaction layer.
 *
 * iOS:    HapticFeedbackGenerator (light/medium/heavy/success/error)
 * Android: Vibration (tinchlik holatida)
 * Web:    noop
 */

const SUPPORTED = Platform.OS === 'ios' || Platform.OS === 'android';

/** Bosish feedback — kartalar, tugmalar, tab'larga bosganda. */
export function impact(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (!SUPPORTED) return;
  Haptics.impactAsync(
    type === 'light' ? Haptics.ImpactFeedbackStyle.Light
      : type === 'medium' ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Heavy,
  );
}

/** Muvaffaqiyat feedback — saqlash, yuborish, tasdiqlash. */
export function success() {
  if (!SUPPORTED) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/** Ogohlantirish feedback — ogohlantirish, diqqat. */
export function warning() {
  if (!SUPPORTED) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}

/** Xato feedback — xatolik, rad etish, muvaffaqiyatsizlik. */
export function error() {
  if (!SUPPORTED) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}

/** Tanlash feedback — ro'yxat elementini tanlash. */
export function selection() {
  if (!SUPPORTED) return;
  Haptics.selectionAsync();
}
