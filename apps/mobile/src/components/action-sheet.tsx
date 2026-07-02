/**
 * ActionSheet — ko'p variantli tezkor tanlov (MOBILE_FOUNDATION_SPEC §2.7).
 * "Davomat: Keldi / Kech qoldi / Kelmadi" kabi vaziyatlar uchun. Oddiy
 * tasdiqlash uchun `Alert.alert` ishlating; to'liq forma uchun Stack screen.
 *
 * Ishlatish:
 *   <ActionSheet
 *     visible={open}
 *     title="Holatni tanlang"
 *     options={[
 *       { label: 'Keldi', icon: 'checkmark-circle', tone: 'success', onPress: () => {} },
 *       { label: 'Kech qoldi', icon: 'time-circle', tone: 'warning', onPress: () => {} },
 *       { label: 'Kelmadi', icon: 'close-circle', tone: 'danger', onPress: () => {} },
 *     ]}
 *     onDismiss={() => setOpen(false)}
 *   />
 */
import { type ReactNode } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Text } from './text';
import { useTheme } from '@/theme/use-theme';
import { radius, spacing } from '@/theme/tokens';
import { impact } from '@/lib/haptics';

export type ActionTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

export interface ActionOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: ActionTone;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  options: ActionOption[];
  /** "Bekor qilish" tugmasi matni (default: bekor qilish). */
  cancelLabel?: string;
  onDismiss: () => void;
}

const TONE_FG: Record<ActionTone, string> = {
  primary: '#0F7B53',
  success: '#15935F',
  warning: '#C2410C',
  danger: '#DC2626',
  neutral: '#64748B',
};

export function ActionSheet({ visible, title, options, cancelLabel, onDismiss }: ActionSheetProps) {
  const { theme, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const overlay = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(280);
      overlay.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, damping: 26, stiffness: 300, mass: 0.8, useNativeDriver: true }),
        Animated.timing(overlay, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, overlay]);

  function run(option: ActionOption) {
    impact('light');
    onDismiss();
    option.onPress();
  }

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDismiss} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', opacity: overlay }}>
          <Pressable style={{ flex: 1 }} onPress={onDismiss} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md),
              backgroundColor: theme.card,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              transform: [{ translateY }],
              ...shadow(3),
            },
          ]}
        >
          <View style={styles.grabberWrap}>
            <View style={[styles.grabber, { backgroundColor: theme.borderStrong }]} />
          </View>

          {title ? (
            <Text variant="heading" style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
              {title}
            </Text>
          ) : null}

          <View style={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
            {options.map((opt, idx) => {
              const tone = opt.tone ?? (opt.destructive ? 'danger' : 'neutral');
              const fg = TONE_FG[tone];
              return (
                <Pressable
                  key={`${opt.label}-${idx}`}
                  onPress={() => run(opt)}
                  style={({ pressed }) => [
                    styles.optionRow,
                    { backgroundColor: pressed ? theme.bgSubtle : 'transparent' },
                  ]}
                >
                  {opt.icon ? (
                    <Ionicons name={opt.icon} size={20} color={fg} style={{ marginRight: spacing.md }} />
                  ) : null}
                  <Text variant="bodyStrong" style={{ flex: 1, color: opt.destructive ? theme.danger : theme.text }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => { impact('light'); onDismiss(); }}
            style={({ pressed }) => [
              styles.cancelBtn,
              { backgroundColor: pressed ? theme.bgSubtle : theme.card, borderColor: theme.border },
            ]}
          >
            <Text variant="bodyStrong" color="primary">{cancelLabel ?? 'Bekor qilish'}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { overflow: 'hidden', borderTopWidth: StyleSheet.hairlineWidth },
  grabberWrap: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  grabber: { width: 40, height: 4, borderRadius: 2 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    minHeight: 48,
  },
  cancelBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
});
