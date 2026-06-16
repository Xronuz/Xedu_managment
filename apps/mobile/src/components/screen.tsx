import { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from './text';
import { useTabBarSpace } from '@/lib/tab-space';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export function Screen({
  title,
  subtitle,
  right,
  children,
  scroll = true,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  scroll?: boolean;
}) {
  const { theme } = useTheme();
  const bottomSpace = useTabBarSpace();
  const Body = scroll ? ScrollView : View;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.bg }}>
      {title ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text variant="title">{title}</Text>
            {subtitle ? (
              <Text variant="caption" color="textMuted" style={{ marginTop: 2 }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      ) : null}
      <Body
        style={{ flex: 1 }}
        contentContainerStyle={scroll ? { padding: spacing.lg, paddingBottom: bottomSpace, gap: spacing.md, flexGrow: 1 } : undefined}
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}

// Card endi `./card` da — eski importlar (`@/components/screen`) buzilmasligi uchun re-export.
export { Card } from './card';
