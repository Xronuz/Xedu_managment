import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { homeworkApi } from '@/api/academic';
import { classesApi, subjectsApi } from '@/api/admin';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { DateField } from '@/components/date-field';
import { spacing } from '@/theme/tokens';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

export default function HomeworkNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const classesQuery = useQuery({ queryKey: ['classes', 'all'], queryFn: classesApi.list });
  const subjectsQuery = useQuery({ queryKey: ['subjects', 'all'], queryFn: () => subjectsApi.list() });
  const classOptions = (classesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const subjectOptions = (subjectsQuery.data ?? []).map((s) => ({ value: s.id, label: s.name }));

  const mutation = useMutation({
    mutationFn: () => homeworkApi.create({ classId, subjectId, title: title.trim(), description: description.trim() || undefined, dueDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['homework'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = classId && subjectId && title.trim() && ISO_DATE.test(dueDate) && !mutation.isPending;

  return (
    <Screen title={t('hw.newHomework')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Field label={t('hw.title')} value={title} onChangeText={setTitle} />
        <SelectField label={t('crud.class')} value={classId} options={classOptions} onChange={setClassId} placeholder={t('crud.selectClass')} />
        <SelectField label={t('menu.subjects')} value={subjectId} options={subjectOptions} onChange={setSubjectId} />
        <Field label={t('hw.description')} value={description} onChangeText={setDescription} multiline />
        <DateField label={t('hw.due')} value={dueDate} onChange={setDueDate} mode="date" />
        <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
