import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/text';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/**
 * CURRENT · SectionLabel — the consistent section header across every screen.
 *
 * A small overline eyebrow + title, optional trailing action ("See all →").
 * Not a screen widget — a reusable composite every screen composes from, so
 * section rhythm is identical everywhere. Generous bottom margin built in.
 */
export interface SectionLabelProps {
  /** Small uppercase eyebrow, e.g. "YOUR GROWTH". */
  eyebrow?: string;
  /** Section title. */
  title?: string;
  /** Optional trailing link. */
  action?: { label: string; onPress: () => void };
}

export function SectionLabel({ eyebrow, title, action }: SectionLabelProps) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: spacing.md }}>
      <View style={{ gap: 2 }}>
        {eyebrow ? <Text variant="overline" color="textMuted">{eyebrow}</Text> : null}
        {title ? <Text variant="heading">{title}</Text> : null}
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={8}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 2, opacity: pressed ? 0.6 : 1 })}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text variant="label" color="primary">{action.label}</Text>
          <Ionicons name="chevron-forward" size={14} color={theme.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}
