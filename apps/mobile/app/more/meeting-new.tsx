import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { meetingsApi } from '@/api/school';
import { usersApi, studentsApi, type Person } from '@/api/admin';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { DateField } from '@/components/date-field';
import { spacing } from '@/theme/tokens';

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/;
const MEDIUMS = ['in_person', 'phone', 'video'];

const personName = (p: Person) => `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim() || p.email || p.id;

export default function MeetingNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  const [teacherId, setTeacherId] = useState('');
  const [parentId, setParentId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [medium, setMedium] = useState('in_person');
  const [agenda, setAgenda] = useState('');

  const teachersQuery = useQuery({ queryKey: ['users', 'teachers'], queryFn: () => usersApi.list(1, undefined, 'teacher') });
  const parentsQuery = useQuery({ queryKey: ['users', 'parents'], queryFn: () => usersApi.list(1, undefined, 'parent') });
  const studentsQuery = useQuery({ queryKey: ['students', 'pick'], queryFn: () => studentsApi.list(1) });

  const teacherOptions = (teachersQuery.data?.data ?? []).map((p) => ({ value: p.id, label: personName(p) }));
  const parentOptions = (parentsQuery.data?.data ?? []).map((p) => ({ value: p.id, label: personName(p) }));
  const studentOptions = (studentsQuery.data?.data ?? []).map((p) => ({ value: p.id, label: personName(p) }));

  const mutation = useMutation({
    mutationFn: () =>
      meetingsApi.create({ teacherId, parentId, studentId, scheduledAt: scheduledAt.replace(' ', 'T'), medium, agenda: agenda.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = teacherId && parentId && studentId && ISO_DATETIME.test(scheduledAt) && !mutation.isPending;

  return (
    <Screen title={t('mtg.newMeeting')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <SelectField label={t('mtg.teacher')} value={teacherId} options={teacherOptions} onChange={setTeacherId} placeholder={t('mtg.pick')} />
        <SelectField label={t('mtg.parent')} value={parentId} options={parentOptions} onChange={setParentId} placeholder={t('mtg.pick')} />
        <SelectField label={t('mtg.student')} value={studentId} options={studentOptions} onChange={setStudentId} placeholder={t('mtg.pick')} />
        <DateField label={t('mtg.scheduledAt')} value={scheduledAt} onChange={setScheduledAt} mode="datetime" />
        <SelectField label={t('mtg.medium')} value={medium} options={MEDIUMS.map((m) => ({ value: m, label: t(`mtg.mediumVal.${m}`) }))} onChange={setMedium} />
        <Field label={t('mtg.agenda')} value={agenda} onChangeText={setAgenda} multiline />
        <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
