import { useEffect, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { disciplineApi } from '@/api/academic';
import { studentsApi } from '@/api/admin';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { DateField } from '@/components/date-field';
import { SearchBar } from '@/components/search-bar';
import { spacing } from '@/theme/tokens';

const TYPES = ['behavior', 'absence', 'academic', 'dress_code', 'other'];
const SEVS = ['low', 'medium', 'high'];
const ACTIONS = ['warning', 'detention', 'parent_call', 'parent_meeting', 'suspension', 'other'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function DisciplineNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  const [studentSearch, setStudentSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('behavior');
  const [severity, setSeverity] = useState('low');
  const [action, setAction] = useState('warning');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebounced(studentSearch.trim()), 350);
    return () => clearTimeout(id);
  }, [studentSearch]);

  const studentsQuery = useQuery({ queryKey: ['students', 'pick', debounced], queryFn: () => studentsApi.list(1, debounced || undefined) });
  const studentOptions = (studentsQuery.data?.data ?? []).map((s) => ({ value: s.id, label: `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim() }));

  const mutation = useMutation({
    mutationFn: () => disciplineApi.create({ studentId, description: description.trim(), date, type, severity, action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['discipline'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = studentId && description.trim().length >= 5 && ISO_DATE.test(date) && !mutation.isPending;

  return (
    <Screen title={t('edu.newIncident')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <SearchBar value={studentSearch} onChangeText={setStudentSearch} placeholder={t('crud.search')} />
        <SelectField label={t('menu.students')} value={studentId} options={studentOptions} onChange={setStudentId} placeholder={t('crud.selectClass')} />
        <SelectField label={t('edu.incidentType')} value={type} options={TYPES.map((x) => ({ value: x, label: t(`edu.discType.${x}`) }))} onChange={setType} />
        <SelectField label={t('edu.severity')} value={severity} options={SEVS.map((x) => ({ value: x, label: t(`edu.discSeverity.${x}`) }))} onChange={setSeverity} />
        <SelectField label={t('edu.action')} value={action} options={ACTIONS.map((x) => ({ value: x, label: t(`edu.discAction.${x}`) }))} onChange={setAction} />
        <Field label={t('edu.description')} value={description} onChangeText={setDescription} multiline numberOfLines={3} style={{ height: 90, textAlignVertical: 'top' }} />
        <DateField label={t('edu.scheduledAt')} value={date} onChange={setDate} mode="date" />
        <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
