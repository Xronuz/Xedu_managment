import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { classesApi, usersApi } from '@/api/admin';
import { useAuthStore } from '@/store/auth.store';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { spacing } from '@/theme/tokens';

const GRADES = Array.from({ length: 11 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

export default function ClassNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const branchId = useAuthStore((s) => s.user?.branchId);

  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const teachersQuery = useQuery({ queryKey: ['users', 'teachers'], queryFn: () => usersApi.list(1, undefined, 'teacher') });
  const teacherOptions = (teachersQuery.data?.data ?? []).map((u) => ({ value: u.id, label: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() }));

  const mutation = useMutation({
    mutationFn: () => classesApi.create({ name: name.trim(), gradeLevel: Number(grade), branchId: branchId!, teacherId: teacherId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = name.trim() && grade && branchId && !mutation.isPending;

  return (
    <Screen title={t('crud.newClass')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Field label={t('crud.className')} value={name} onChangeText={setName} placeholder="11-A" />
        <SelectField label={t('crud.gradeLevel')} value={grade} options={GRADES} onChange={setGrade} />
        <SelectField label={t('crud.teacher')} value={teacherId} options={teacherOptions} onChange={setTeacherId} placeholder={t('crud.selectTeacher')} />
        <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
