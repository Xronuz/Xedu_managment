import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { type } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import type { ThemeColors } from '@/theme/tokens';

type Variant = keyof typeof type;

interface Props extends RNTextProps {
  variant?: Variant;
  /** Tema rang kaliti (`text`, `textMuted`, `primary` ...) yoki xom hex. */
  color?: keyof ThemeColors | (string & {});
  center?: boolean;
}

export function Text({ variant = 'body', color = 'text', center, style, ...rest }: Props) {
  const { theme } = useTheme();
  const resolved = (theme as Record<string, string>)[color as string] ?? color;
  return (
    <RNText
      style={[type[variant], { color: resolved }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
