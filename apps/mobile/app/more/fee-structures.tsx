import { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { feeApi, type FeeStructure } from '@/api/finance';
import { Screen } from '@/components/screen';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { Row, IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Fab } from '@/components/fab';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { formatMoney } from '@/lib/format';
import { useAuthStore } from '@/store/auth.store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const FREQS = ['monthly', 'quarterly', 'yearly', 'once'];

export default function FeeStructuresScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const canCreate = role === 'director' || role === 'accountant';

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  const query = useQuery<FeeStructure[]>({ queryKey: ['fees'], queryFn: feeApi.list });
  const freqOptions = FREQS.map((f) => ({ value: f, label: t(`fin.freq${f.charAt(0).toUpperCase() + f.slice(1)}`) }));

  const mutation = useMutation({
    mutationFn: () => feeApi.create({ name: name.trim(), amount: Number(amount), frequency }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees'] });
      setOpen(false); setName(''); setAmount(''); setFrequency('monthly');
      Alert.alert(t('common.success'), t('crud.created'));
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = name.trim() && Number(amount) > 0 && !mutation.isPending;

  return (
    <View style={{ flex: 1 }}>
      <Screen title={t('fin.fees')} scroll={false}>
        <DataList
          query={query}
          keyExtractor={(f) => f.id}
          emptyIcon="pricetags-outline"
          emptyTitle={t('fin.noFees')}
          renderItem={(f) => (
            <Row
              leading={<IconBadge icon="pricetags-outline" color="primary" bg="primaryLight" />}
              title={f.name}
              subtitle={formatMoney(f.amount)}
              trailing={f.frequency ? <Badge label={t(`fin.freq${f.frequency.charAt(0).toUpperCase() + f.frequency.slice(1)}`)} tone="neutral" /> : undefined}
            />
          )}
        />
      </Screen>
      {canCreate ? <Fab onPress={() => setOpen(true)} /> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
            <ScrollView contentContainerStyle={{ padding: spacing.xxl }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                <Text variant="title">{t('fin.newFee')}</Text>
                <Ionicons name="close" size={26} color={theme.textMuted} onPress={() => setOpen(false)} />
              </View>
              <Field label={t('fin.feeName')} value={name} onChangeText={setName} />
              <Field label={t('fin.amount')} value={amount} onChangeText={setAmount} keyboardType="number-pad" />
              <SelectField label={t('fin.frequency')} value={frequency} options={freqOptions} onChange={setFrequency} />
              <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
