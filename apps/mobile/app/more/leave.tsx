import { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { leaveApi, type LeaveRequest } from '@/api/school';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { Badge, leaveTone } from '@/components/badge';
import { IconBadge } from '@/components/row';
import { Button, Field } from '@/components/ui';
import { DateField } from '@/components/date-field';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function TeacherLeaveScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const query = useQuery<LeaveRequest[]>({ queryKey: ['leave', 'mine'], queryFn: leaveApi.mine });

  const mutation = useMutation({
    mutationFn: () => leaveApi.create({ startDate, endDate, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave', 'mine'] });
      setOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      Alert.alert(t('common.success'), t('leave.created'));
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? t('common.networkError');
      Alert.alert(t('common.error'), typeof msg === 'string' ? msg : t('common.error'));
    },
  });

  const datesValid = ISO_DATE.test(startDate) && ISO_DATE.test(endDate);
  const canSubmit = datesValid && reason.trim().length >= 5 && !mutation.isPending;

  return (
    <View style={{ flex: 1 }}>
      <DataList
        query={query}
        keyExtractor={(r) => r.id}
        emptyIcon="document-text-outline"
        emptyTitle={t('more.noLeave')}
        renderItem={(row) => (
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <IconBadge icon="airplane-outline" />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">
                  {formatDate(row.startDate)} – {formatDate(row.endDate)}
                </Text>
                <Text variant="caption" color="textMuted" numberOfLines={2} style={{ marginTop: 2 }}>
                  {row.reason}
                </Text>
              </View>
              <Badge label={t(`leave.${row.status}`)} tone={leaveTone(row.status)} />
            </View>
          </Card>
        )}
      />

      <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xl }}>
        <Button title={t('leave.new')} icon="add" onPress={() => setOpen(true)} />
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
            <ScrollView contentContainerStyle={{ padding: spacing.xxl }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                <Text variant="title">{t('leave.new')}</Text>
                <Ionicons name="close" size={26} color={theme.textMuted} onPress={() => setOpen(false)} />
              </View>
              <DateField label={t('leave.startDate')} value={startDate} onChange={setStartDate} mode="date" />
              <DateField label={t('leave.endDate')} value={endDate} onChange={setEndDate} mode="date" minimumDate={startDate ? new Date(startDate) : undefined} />
              <Field label={t('leave.reason')} value={reason} onChangeText={setReason} placeholder={t('leave.reasonHint')} multiline numberOfLines={3} style={{ height: 90, textAlignVertical: 'top' }} />
              <Button title={t('common.submit')} icon="send-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
              <View style={{ marginTop: spacing.sm }}>
                <Button title={t('common.cancel')} variant="ghost" onPress={() => setOpen(false)} />
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
