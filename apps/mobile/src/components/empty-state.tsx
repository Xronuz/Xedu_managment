import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { Button } from './ui';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  subtitle,
  actionTitle,
  onAction,
  tone = 'neutral',
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionTitle?: string;
  onAction?: () => void;
  tone?: 'neutral' | 'danger';
}) {
  const { theme } = useTheme();
  const iconColor = tone === 'danger' ? theme.danger : theme.primary;
  const iconBg = tone === 'danger' ? theme.dangerLight : theme.primaryLight;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl, gap: spacing.md }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: radius.pill,
          backgroundColor: iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={32} color={iconColor} />
      </View>
      <Text variant="heading" center>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="textMuted" center style={{ maxWidth: 280 }}>
          {subtitle}
        </Text>
      ) : null}
      {actionTitle && onAction ? (
        <View style={{ marginTop: spacing.sm }}>
          <Button title={actionTitle} onPress={onAction} variant="tonal" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}
