import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { subjectsApi, classesApi, usersApi } from '@/api/admin';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { spacing } from '@/theme/tokens';

export default function SubjectNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const classesQuery = useQuery({ queryKey: ['classes', 'all'], queryFn: classesApi.list });
  const teachersQuery = useQuery({ queryKey: ['users', 'teachers'], queryFn: () => usersApi.list(1, undefined, 'teacher') });
  const classOptions = (classesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const teacherOptions = (teachersQuery.data?.data ?? []).map((u) => ({ value: u.id, label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() }));

  const mutation = useMutation({
    mutationFn: () => subjectsApi.create({ name: name.trim(), classId: classId || undefined, teacherId: teacherId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = name.trim().length > 0 && !mutation.isPending;

  return (
    <Screen title={t('crud.newSubject')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Field label={t('crud.subjectName')} value={name} onChangeText={setName} placeholder="Matematika" />
        <SelectField label={t('crud.class')} value={classId} options={classOptions} onChange={setClassId} placeholder={t('crud.selectClass')} />
        <SelectField label={t('crud.teacher')} value={teacherId} options={teacherOptions} onChange={setTeacherId} placeholder={t('crud.selectTeacher')} />
        <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
