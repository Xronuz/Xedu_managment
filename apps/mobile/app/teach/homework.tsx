import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { homeworkApi } from '@/api/academic';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Button, Field } from '@/components/ui';
import { DateField } from '@/components/date-field';
import { ErrorBanner } from '@/components/error-banner';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact, success as hapticSuccess, error as hapticError } from '@/lib/haptics';

/**
 * Homework quick create (Week 6). 4 fielddan oshmasin:
 *   1. title (majburiy)
 *   2. description (ixtiyoriy)
 *   3. dueDate (majburiy — DateField)
 *   4. context chip (class + subject — timeline'dan, faqat o'qish uchun)
 *
 * classId / subjectId timeline'dan (today.tsx action sheet) params orqali keladi.
 */
export default function TeachHomeworkScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const router = useRouter();
  const { classId: rawClassId, className, subjectId: rawSubjectId, subjectName } = useLocalSearchParams<{ classId?: string; className?: string; subjectId?: string; subjectName?: string }>();
  const classId = rawClassId ?? '';
  const subjectId = rawSubjectId ?? '';

  // Ertaga default due date.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(tomorrow.toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const hasContext = !!classId && !!subjectId;

  const mutation = useMutation({
    mutationFn: () =>
      homeworkApi.create({
        classId,
        subjectId,
        title: title.trim(),
        description: description.trim() || undefined,
        dueDate,
      }),
    onSuccess: () => {
      hapticSuccess();
      Alert.alert(t('common.success'), t('teach.hwCreated'), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: () => {
      hapticError();
      setError(t('common.networkError'));
    },
  });

  const canSubmit = title.trim().length > 0 && hasContext && !mutation.isPending;

  function submit() {
    if (!hasContext) {
      setError(t('teach.hwContextMissing'));
      return;
    }
    setError(null);
    mutation.mutate();
  }

  return (
    <Screen title={t('teach.hwCreate')} subtitle={className} scroll>
      <Stack.Screen options={{ title: t('teach.hwCreate') }} />

      <View style={{ gap: spacing.lg, paddingBottom: spacing.xxxl }}>
        {/* Context chip — class + subject timeline'dan */}
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {className ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill }}>
              <Ionicons name="school-outline" size={14} color={theme.primary} />
              <Text variant="label" style={{ color: theme.primary }}>{className}</Text>
            </View>
          ) : null}
          {subjectName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.infoLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill }}>
              <Ionicons name="book-outline" size={14} color={theme.info} />
              <Text variant="label" style={{ color: theme.info }}>{subjectName}</Text>
            </View>
          ) : null}
        </View>

        {!hasContext ? (
          <ErrorBanner message={t('teach.hwContextMissing')} detail={t('teach.hwContextMissingSub')} tone="warning" />
        ) : null}

        {error ? <ErrorBanner message={error} onRetry={() => setError(null)} /> : null}

        {/* Field 1: Title (majburiy) */}
        <Field label={t('teach.hwTitle')} value={title} onChangeText={setTitle} placeholder={t('teach.hwTitlePlaceholder')} />

        {/* Field 2: Description (ixtiyoriy) */}
        <Field label={t('teach.hwDesc')} value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ minHeight: 80, textAlignVertical: 'top' }} placeholder={t('teach.hwDescPlaceholder')} />

        {/* Field 3: Due date */}
        <DateField label={t('homework.due')} value={dueDate} onChange={setDueDate} mode="date" minimumDate={new Date()} />

        {/* Submit */}
        <Button title={t('common.save')} icon="save-outline" onPress={submit} loading={mutation.isPending} disabled={!canSubmit} fullWidth />
      </View>
    </Screen>
  );
}
