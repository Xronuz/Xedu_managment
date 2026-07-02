import { useState } from 'react';
import { Alert, Linking, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { leadsApi, type Lead } from '@/api/finance';
import { usePaginated } from '@/lib/use-paginated';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { PaginatedList } from '@/components/paginated-list';
import { Badge } from '@/components/badge';
import { Avatar } from '@/components/avatar';
import { Fab } from '@/components/fab';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const STATUSES = ['NEW', 'CONTACTED', 'TEST_LESSON', 'WAITING_PAYMENT', 'CONVERTED', 'CLOSED'];
const SOURCES = ['INSTAGRAM', 'TELEGRAM', 'FACEBOOK', 'WEBSITE', 'REFERRAL', 'CALL', 'WALK_IN', 'OTHER'];

function leadTone(s: string): 'success' | 'danger' | 'warning' | 'primary' | 'neutral' {
  if (s === 'CONVERTED') return 'success';
  if (s === 'CLOSED') return 'danger';
  if (s === 'WAITING_PAYMENT') return 'warning';
  if (s === 'NEW') return 'primary';
  return 'neutral';
}

export default function CrmScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('INSTAGRAM');

  const query = usePaginated<Lead>(['leads'], (page) => leadsApi.list(page));
  const sourceOptions = SOURCES.map((s) => ({ value: s, label: t(`fin.leadSource.${s}`) }));

  const mutation = useMutation({
    mutationFn: () => leadsApi.create({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), source }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      setOpen(false); setFirstName(''); setLastName(''); setPhone('');
      Alert.alert(t('common.success'), t('crud.created'));
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = firstName.trim() && lastName.trim() && phone.trim().length >= 6 && !mutation.isPending;

  return (
    <View style={{ flex: 1 }}>
      <Screen title={t('fin.leads')} scroll={false}>
        <PaginatedList
          query={query}
          keyExtractor={(l) => l.id}
          emptyIcon="magnet-outline"
          emptyTitle={t('fin.noLeads')}
          renderItem={(lead) => {
            const name = `${lead.firstName} ${lead.lastName}`.trim();
            return (
              <Card onPress={() => Linking.openURL(`tel:${lead.phone}`)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  <Avatar name={name} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>{name}</Text>
                    <Text variant="caption" color="textMuted">
                      {lead.phone}{lead.source ? ` · ${t(`fin.leadSource.${lead.source}`)}` : ''}
                    </Text>
                  </View>
                  <Badge label={t(`fin.leadStatus.${lead.status}`)} tone={leadTone(lead.status)} />
                </View>
              </Card>
            );
          }}
        />
      </Screen>
      <Fab onPress={() => setOpen(true)} />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
            <ScrollView contentContainerStyle={{ padding: spacing.xxl }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                <Text variant="title">{t('fin.newLead')}</Text>
                <Ionicons name="close" size={26} color={theme.textMuted} onPress={() => setOpen(false)} />
              </View>
              <Field label={t('crud.firstName')} value={firstName} onChangeText={setFirstName} />
              <Field label={t('crud.lastName')} value={lastName} onChangeText={setLastName} />
              <Field label={t('fin.leadPhone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
              <SelectField label={t('fin.source')} value={source} options={sourceOptions} onChange={setSource} />
              <Button title={t('crud.create')} icon="checkmark-circle-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
