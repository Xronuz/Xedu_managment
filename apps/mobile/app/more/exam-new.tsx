import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { examAdminApi } from '@/api/academic';
import { classesApi, subjectsApi } from '@/api/admin';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { DateField } from '@/components/date-field';
import { spacing } from '@/theme/tokens';

const FREQS = ['weekly', 'monthly', 'quarterly', 'final', 'on_demand'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

export default function ExamNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [maxScore, setMaxScore] = useState('100');
  const [scheduledAt, setScheduledAt] = useState('');

  const classesQuery = useQuery({ queryKey: ['classes', 'all'], queryFn: classesApi.list });
  const subjectsQuery = useQuery({ queryKey: ['subjects', 'all'], queryFn: () => subjectsApi.list() });
  const classOptions = (classesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const subjectOptions = (subjectsQuery.data ?? []).map((s) => ({ value: s.id, label: s.name }));

  const mutation = useMutation({
    mutationFn: () => examAdminApi.create({ classId, subjectId, title: title.trim(), frequency, maxScore: Number(maxScore) || 100, scheduledAt: scheduledAt.replace(' ', 'T') }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = classId && subjectId && title.trim() && ISO_DATE.test(scheduledAt) && !mutation.isPending;

  return (
    <Screen title={t('edu.newExam')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Field label={t('edu.examTitle')} value={title} onChangeText={setTitle} />
        <SelectField label={t('crud.class')} value={classId} options={classOptions} onChange={setClassId} placeholder={t('crud.selectClass')} />
        <SelectField label={t('menu.subjects')} value={subjectId} options={subjectOptions} onChange={setSubjectId} />
        <SelectField label={t('edu.frequency')} value={frequency} options={FREQS.map((f) => ({ value: f, label: t(`edu.examFreq.${f}`) }))} onChange={setFrequency} />
        <Field label={t('edu.maxScore')} value={maxScore} onChangeText={setMaxScore} keyboardType="number-pad" />
        <DateField label={t('edu.scheduledAt')} value={scheduledAt} onChange={setScheduledAt} mode="datetime" />
        <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
