import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** Reference uslubidagi stat karta — ikon chip + katta raqam + label. */
export function StatCard({
  icon,
  value,
  label,
  color,
  tint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  tint: string;
}) {
  const { theme, shadow } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.card,
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: theme.border,
        padding: spacing.lg,
        gap: spacing.sm,
        ...shadow(1),
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: tint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text variant="display" style={{ fontSize: 30 }}>
        {value}
      </Text>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}
