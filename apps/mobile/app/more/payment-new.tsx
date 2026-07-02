import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { paymentsApi } from '@/api/finance';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { Field, Button } from '@/components/ui';
import { DateField } from '@/components/date-field';
import { spacing } from '@/theme/tokens';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function PaymentNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();
  const { studentId, name } = useLocalSearchParams<{ studentId: string; name?: string }>();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  const mutation = useMutation({
    mutationFn: () => paymentsApi.create({ studentId, amount: Number(amount), description: description.trim() || undefined, dueDate: dueDate.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const dateOk = !dueDate.trim() || ISO_DATE.test(dueDate.trim());
  const canSubmit = Number(amount) > 0 && dateOk && !mutation.isPending;

  return (
    <Screen title={t('fin.addPayment')} scroll={false}>
      <Stack.Screen options={{ title: t('fin.addPayment') }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        {name ? (
          <Text variant="bodyStrong" style={{ marginBottom: spacing.md }}>
            {name}
          </Text>
        ) : null}
        <Field label={t('fin.amount')} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
        <Field label={t('teach.comment')} value={description} onChangeText={setDescription} />
        <DateField label={t('payments.due')} value={dueDate} onChange={setDueDate} mode="date" />
        <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
