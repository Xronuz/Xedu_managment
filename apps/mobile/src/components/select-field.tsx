import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export interface Option {
  value: string;
  label: string;
}

/** Modal-ro'yxatli tanlash maydoni (sinf/o'qituvchi/filial...). */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value?: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, paddingHorizontal: spacing.md }}
      >
        <Text variant="body" style={{ flex: 1 }} color={selected ? 'text' : 'textMuted'}>
          {selected?.label ?? placeholder ?? '—'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.xl }}>
              <Text variant="title">{label}</Text>
              <Ionicons name="close" size={26} color={theme.textMuted} onPress={() => setOpen(false)} />
            </View>
            <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
              {options.map((o) => {
                const active = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => { onChange(o.value); setOpen(false); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: theme.border }}
                  >
                    <Text variant="bodyStrong" style={{ flex: 1 }} color={active ? 'primary' : 'text'}>
                      {o.label}
                    </Text>
                    {active ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
