import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Text } from './text';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

/** ISO sana (YYYY-MM-DD) ni Date'ga aylantiradi; bo'sh bo'lsa bugun. */
function parse(value: string): Date {
  if (value) {
    const d = new Date(value.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

const pad = (n: number) => String(n).padStart(2, '0');

function toIso(d: Date, mode: 'date' | 'datetime'): string {
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return mode === 'datetime' ? `${base} ${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}

/**
 * Native sana/vaqt tanlash maydoni. Qiymat ISO string sifatida saqlanadi
 * ("YYYY-MM-DD" yoki "YYYY-MM-DD HH:mm"). Qo'lda yozish O'CHIRILGAN.
 */
export function DateField({
  label,
  value,
  onChange,
  mode = 'date',
  placeholder,
  minimumDate,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  mode?: 'date' | 'datetime';
  placeholder?: string;
  minimumDate?: Date;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  // datetime rejimida Android avval sana, keyin vaqt so'raydi
  const [androidStep, setAndroidStep] = useState<'date' | 'time'>('date');
  const [temp, setTemp] = useState<Date | null>(null);

  const current = parse(value);

  const display = value
    ? mode === 'datetime'
      ? value
      : value.split(' ')[0]
    : placeholder ?? (mode === 'datetime' ? '____-__-__ __:__' : '____-__-__');

  const handleChange = (event: DateTimePickerEvent, picked?: Date) => {
    if (event.type === 'dismissed') {
      setShow(false);
      setAndroidStep('date');
      setTemp(null);
      return;
    }
    const chosen = picked ?? current;

    if (Platform.OS === 'android') {
      if (mode === 'datetime' && androidStep === 'date') {
        // sana tanlandi → endi vaqt so'raymiz
        setTemp(chosen);
        setAndroidStep('time');
        return; // picker time bilan qayta ochiladi (show hali true)
      }
      // yakuniy (date-only yoki datetime'ning time qadami)
      const finalDate =
        mode === 'datetime' && temp
          ? new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), chosen.getHours(), chosen.getMinutes())
          : chosen;
      onChange(toIso(finalDate, mode));
      setShow(false);
      setAndroidStep('date');
      setTemp(null);
    } else {
      // iOS: spinner inline, har o'zgarishda yangilaymiz
      onChange(toIso(chosen, mode));
    }
  };

  const androidMode = mode === 'datetime' && androidStep === 'time' ? 'time' : 'date';
  const androidValue = androidStep === 'time' && temp ? temp : current;

  return (
    <View style={{ gap: spacing.xs, marginBottom: spacing.lg }}>
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
      <Pressable
        onPress={() => {
          setAndroidStep('date');
          setTemp(null);
          setShow(true);
        }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 52,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.card,
          paddingHorizontal: spacing.md,
        }}
      >
        <Text variant="body" style={{ flex: 1 }} color={value ? 'text' : 'textMuted'}>
          {display}
        </Text>
        <Ionicons name={mode === 'datetime' ? 'time-outline' : 'calendar-outline'} size={18} color={theme.textMuted} />
      </Pressable>

      {show ? (
        <DateTimePicker
          value={Platform.OS === 'android' ? androidValue : current}
          mode={Platform.OS === 'android' ? androidMode : mode === 'datetime' ? 'datetime' : 'date'}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          onChange={handleChange}
          themeVariant={theme.bg === '#FFFFFF' ? 'light' : 'dark'}
        />
      ) : null}

      {Platform.OS === 'ios' && show ? (
        <Pressable onPress={() => setShow(false)} style={{ alignSelf: 'flex-end', paddingVertical: spacing.xs }}>
          <Text variant="bodyStrong" color="primary">
            {t('common.save')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
