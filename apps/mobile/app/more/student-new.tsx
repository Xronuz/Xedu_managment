import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { studentsApi, classesApi, type ClassItem } from '@/api/admin';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { spacing } from '@/theme/tokens';

export default function StudentNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [classId, setClassId] = useState('');

  const classesQuery = useQuery<ClassItem[]>({ queryKey: ['classes', 'all'], queryFn: classesApi.list });
  const classOptions = (classesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }));

  const mutation = useMutation({
    mutationFn: () =>
      studentsApi.create({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), password, phone: phone.trim() || undefined, classId: classId || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = firstName.trim() && lastName.trim() && /\S+@\S+\.\S+/.test(email) && password.length >= 6 && !mutation.isPending;

  return (
    <Screen title={t('crud.newStudent')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Field label={t('crud.firstName')} value={firstName} onChangeText={setFirstName} />
        <Field label={t('crud.lastName')} value={lastName} onChangeText={setLastName} />
        <Field label={t('crud.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Field label={t('crud.password')} value={password} onChangeText={setPassword} secureTextEntry />
        <Field label={t('crud.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <SelectField label={t('crud.class')} value={classId} options={classOptions} onChange={setClassId} placeholder={t('crud.selectClass')} />
        <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
