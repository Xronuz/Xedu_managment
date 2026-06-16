import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { fonts, radius, spacing, type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

type Variant = 'primary' | 'tonal' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  fullWidth = true,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}) {
  const { theme } = useTheme();
  const isDisabled = disabled || loading;

  const bg =
    variant === 'primary' ? theme.primary
    : variant === 'tonal' ? theme.primaryLight
    : variant === 'danger' ? theme.danger
    : 'transparent';
  const fg =
    variant === 'primary' ? theme.onPrimary
    : variant === 'danger' ? '#FFFFFF'
    : theme.primary;
  const borderColor = variant === 'ghost' ? theme.borderStrong : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor,
          borderWidth: variant === 'ghost' ? 1 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.88 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.buttonInner}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text variant="bodyStrong" style={{ color: fg }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  secureTextEntry,
  leftIcon,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
}) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);

  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={styles.fieldWrap}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.card, borderColor, borderWidth: focused ? 1.5 : 1 },
        ]}
      >
        {leftIcon ? (
          <Ionicons name={leftIcon} size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
        ) : null}
        <TextInput
          placeholderTextColor={theme.textMuted}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, { color: theme.text, fontFamily: fonts.medium }]}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={theme.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fieldWrap: { gap: spacing.xs, marginBottom: spacing.lg },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  input: { flex: 1, ...type.body, paddingVertical: spacing.md },
});
