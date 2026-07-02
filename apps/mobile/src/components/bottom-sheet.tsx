/**
 * XBottomSheet — Modal-based bottom sheet (MOBILE_FOUNDATION_SPEC §2.6).
 *
 * `@gorhom/bottom-sheet` reanimatedga bog'liq bo'lgani uchun (RN 0.81.5 da
 * reanimated ishlamaydi), bu komponent RN built-in `Animated` + `Modal`
 * asosida qurilgan. Xuddi shu API: snapPoints, ref orqali ochish/yopish.
 *
 * Ishlatish:
 *   const sheetRef = useRef<XBottomSheetRef>(null);
 *   <XBottomSheet ref={sheetRef} title="Filtr">
 *     {...children}
 *   </XBottomSheet>
 *   sheetRef.current?.present();
 *
 * DO NOT (spec §2.6): to'liq forma, tasdiqlash dialogi yoki sozlash uchun.
 */
import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { Animated, Dimensions, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';
import { impact } from '@/lib/haptics';

const SCREEN_H = Dimensions.get('window').height;

export interface XBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface XBottomSheetProps {
  children: ReactNode;
  /** Snap point — screen height foizi (50 → 50%) yoki piksel son. Default 50%. */
  snapPoint?: number;
  title?: string;
  /** Yopilganda chaqiriladi. */
  onDismiss?: () => void;
}

export const XBottomSheet = forwardRef<XBottomSheetRef, XBottomSheetProps>(function XBottomSheet(
  { children, snapPoint = 50, title, onDismiss },
  ref,
) {
  const { theme, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Sheet y vertikal offset (0 = ko'rinadi, sheetHeight = yashirin).
  const translateY = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(0)).current;

  // snap point → piksel.
  const sheetHeight = useMemo(() => {
    if (snapPoint > 100) return Math.min(snapPoint, SCREEN_H - 40);
    return Math.round((SCREEN_H * snapPoint) / 100);
  }, [snapPoint]);

  const dismiss = useCallback(() => {
    if (closing) return;
    setClosing(true);
    impact('light');
    Animated.parallel([
      Animated.timing(translateY, { toValue: sheetHeight, duration: 220, useNativeDriver: true }),
      Animated.timing(overlay, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setVisible(false);
      setClosing(false);
      onDismiss?.();
    });
  }, [closing, sheetHeight, translateY, overlay, onDismiss]);

  const present = useCallback(() => {
    setVisible(true);
    impact('light');
  }, []);

  useImperativeHandle(ref, () => ({ present, dismiss }), [present, dismiss]);

  // Visible bo'lgach — slide-up animatsiyasi.
  useEffect(() => {
    if (visible) {
      translateY.setValue(sheetHeight);
      overlay.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 28, stiffness: 280, mass: 0.8, useNativeDriver: true }),
        Animated.timing(overlay, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, sheetHeight, translateY, overlay]);

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={dismiss} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', opacity: overlay }}>
          <Pressable style={{ flex: 1 }} onPress={dismiss} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              height: sheetHeight,
              paddingBottom: Math.max(insets.bottom, spacing.md),
              backgroundColor: theme.card,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              transform: [{ translateY }],
              ...shadow(3),
            },
          ]}
        >
          {/* Grabber */}
          <View style={styles.grabberWrap}>
            <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
          </View>
          {/* Header */}
          {title ? (
            <View style={styles.header}>
              <Text variant="heading" style={{ flex: 1 }}>{title}</Text>
              <Pressable onPress={dismiss} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={theme.textMuted} />
              </Pressable>
            </View>
          ) : null}
          {/* Body */}
          <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  grabberWrap: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
