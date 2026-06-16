import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from './text';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** O'quvchi uchun katta, rangli, o'yinli plitka. */
export function PlayfulTile({
  icon,
  color,
  label,
  onPress,
  comingSoon,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  onPress?: () => void;
  comingSoon?: boolean;
}) {
  const { t } = useTranslation();
  const { theme, shadow } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: '47.5%',
          backgroundColor: theme.card,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: theme.border,
          padding: spacing.lg,
          gap: spacing.md,
          opacity: pressed ? 0.85 : 1,
          ...shadow(1),
        },
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: color + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={30} color={color} />
      </View>
      <Text variant="bodyStrong">{label}</Text>
      {comingSoon ? (
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: theme.bgSubtle,
            borderRadius: radius.pill,
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
          }}
        >
          <Text variant="label" color="textMuted">
            {t('student.comingSoon')}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
