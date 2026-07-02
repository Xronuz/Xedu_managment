import { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { fonts, radius, spacing, type, anim } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact } from '@/lib/haptics';

/* ═══════════════════════════════════════════════════════════════════
 *  Button
 * ═══════════════════════════════════════════════════════════════════ */
interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'filled' | 'tonal' | 'ghost';
  /** 'pill' = to'liq yumaloq; 'default' = biroz yumaloq */
  shape?: 'default' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export function Button({
  title,
  onPress,
  variant = 'filled',
  shape = 'default',
  size = 'md',
  icon,
  fullWidth = false,
  loading = false,
  disabled = false,
}: ButtonProps) {
  const { theme } = useTheme();
  const btnRadius = shape === 'pill' ? radius.pill : radius.md;
  const height = size === 'sm' ? 34 : size === 'lg' ? 50 : 42;
  const fontSize = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;
  const padH = size === 'sm' ? spacing.md : size === 'lg' ? spacing.xl : spacing.lg;

  const bg =
    variant === 'filled' ? theme.primary
    : variant === 'tonal' ? theme.primaryLight
    : 'transparent';

  const fg =
    variant === 'ghost' ? theme.primary
    : theme.onPrimary;

  return (
    <Pressable
      onPress={() => { if (!disabled && !loading) { impact('light'); onPress?.(); } }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          height,
          borderRadius: btnRadius,
          paddingHorizontal: padH,
          backgroundColor: pressed ? (variant === 'ghost' ? 'transparent' : bg) : bg,
          opacity: pressed ? 0.88 : disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: theme.border,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size={18} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={{ color: fg, fontFamily: fonts.semibold, fontSize }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 *  Field — matn maydoni (bog'liqliklar: useForm, i18n)
 * ═══════════════════════════════════════════════════════════════════ */
interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  /** Chap ikonka (login, forma maydonlari uchun). Mavjud ekrallar ishlatadi. */
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

export function Field({ label, error, leftIcon, ...props }: FieldProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <Animated.View style={{ gap: spacing.xs }}>
      <Text variant="label" color={error ? 'danger' : 'textMuted'}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={error ? theme.danger : focused ? theme.primary : theme.textMuted}
            style={{ position: 'absolute', left: spacing.md, zIndex: 1 }}
          />
        ) : null}
        <TextInput
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          placeholderTextColor={theme.textMuted}
          style={[
            {
              flex: 1,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: error ? theme.danger : focused ? theme.primary : theme.border,
              backgroundColor: theme.card,
              paddingHorizontal: leftIcon ? spacing.xl + spacing.md : spacing.lg,
              paddingVertical: spacing.md,
              fontSize: 15,
              fontFamily: fonts.regular,
              color: theme.text,
            },
            styles.field,
          ]}
        />
      </View>
      {error ? (
        <Animated.Text
          style={{ color: theme.danger, fontSize: 12, fontFamily: fonts.medium, marginTop: spacing.xs }}
        >
          {error}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 46,
  },
});
