/**
 * FormField — kengaytirilgan forma maydoni (MOBILE_FOUNDATION_SPEC §2.10, N5).
 * Mavjud `Field` (ui.tsx) ustiga qurilgan — unga `hint`, `leftIcon`, `required`,
 * `rightSlot` qo'shadi. Mavjud Field buzilmaydi.
 *
 * Ishlatish:
 *   <FormField
 *     label="Telefon"
 *     required
 *     leftIcon="call-outline"
 *     hint="+998 bilan boshlansin"
 *     error={errors.phone}
 *     value={phone}
 *     onChangeText={setPhone}
 *     keyboardType="phone-pad"
 *   />
 */
import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { useTheme } from '@/theme/use-theme';
import { fonts, radius, spacing } from '@/theme/tokens';
import type { TextInputProps } from 'react-native';

interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  /** Yordamchi matn (input ostida, kulrang). */
  hint?: string;
  /** Xato matni (kiritilgan bo'lsa, hint o'rniga qizil ko'rinadi). */
  error?: string;
  /** Majburiy maydon — yoniga * qo'yiladi. */
  required?: boolean;
  /** Input ichki chap tomonidagi ikonka. */
  leftIcon?: keyof typeof Ionicons.glyphMap;
  /** Input ichki o'ng tomonidagi slot (masalan, ko'rsatish/yashirish tugmasi). */
  rightSlot?: ReactNode;
}

export function FormField({
  label,
  hint,
  error,
  required,
  leftIcon,
  rightSlot,
  ...props
}: FormFieldProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const showError = !!error;

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text variant="label" color={showError ? 'danger' : 'textMuted'}>
          {label}
        </Text>
        {required ? (
          <Text variant="label" style={{ color: theme.danger }}>*</Text>
        ) : null}
      </View>

      <View
        style={[
          styles.inputWrap,
          {
            borderColor: showError ? theme.danger : focused ? theme.primary : theme.border,
            backgroundColor: theme.card,
          },
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={showError ? theme.danger : focused ? theme.primary : theme.textMuted}
            style={{ marginRight: spacing.sm }}
          />
        ) : null}
        <TextInput
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.text, fontFamily: fonts.regular }]}
        />
        {rightSlot}
      </View>

      {showError ? (
        <Text variant="caption" style={{ color: theme.danger, marginTop: 2 }}>{error}</Text>
      ) : hint ? (
        <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
});
