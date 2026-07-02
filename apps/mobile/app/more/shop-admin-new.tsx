import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { shopAdminApi } from '@/api/academic';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { spacing } from '@/theme/tokens';

export default function ShopAdminNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      shopAdminApi.create({
        name: name.trim(),
        cost: Number(cost) || 0,
        description: description.trim() || undefined,
        emoji: emoji.trim() || undefined,
        stock: stock.trim() === '' ? null : Number(stock),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shop'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = name.trim() && Number(cost) > 0 && !mutation.isPending;

  return (
    <Screen title={t('shopA.newItem')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Field label={t('shopA.name')} value={name} onChangeText={setName} />
        <Field label={t('shopA.emoji')} value={emoji} onChangeText={setEmoji} placeholder="🎁" />
        <Field label={t('shopA.cost')} value={cost} onChangeText={setCost} keyboardType="number-pad" />
        <Field label={t('shopA.stock')} value={stock} onChangeText={setStock} keyboardType="number-pad" placeholder={t('shopA.unlimited')} />
        <Field label={t('hw.description')} value={description} onChangeText={setDescription} multiline />
        <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
