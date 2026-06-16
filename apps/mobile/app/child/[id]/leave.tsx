import { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { Badge, leaveTone } from '@/components/badge';
import { IconBadge } from '@/components/row';
import { Button, Field } from '@/components/ui';
import { useChildParams } from '@/hooks/use-child';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface LeaveRow {
  id: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function LeaveScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { id } = useChildParams();
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const query = useQuery<LeaveRow[]>({
    queryKey: ['parent', 'leave', id],
    queryFn: () => parentApi.getChildLeaveRequests(id),
  });

  const mutation = useMutation({
    mutationFn: () => parentApi.createLeaveRequest(id, { startDate, endDate, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parent', 'leave', id] });
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
        emptyTitle={t('leave.empty')}
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

      {/* FAB */}
      <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xl }}>
        <Button title={t('leave.new')} icon="add" onPress={() => setOpen(true)} />
      </View>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
            <ScrollView contentContainerStyle={{ padding: spacing.xxl }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
                <Text variant="title">{t('leave.new')}</Text>
                <Ionicons name="close" size={26} color={theme.textMuted} onPress={() => setOpen(false)} />
              </View>
              <Field
                label={t('leave.startDate')}
                leftIcon="calendar-outline"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2026-06-20"
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
              />
              <Field
                label={t('leave.endDate')}
                leftIcon="calendar-outline"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2026-06-22"
                autoCapitalize="none"
                keyboardType="numbers-and-punctuation"
                error={startDate && endDate && !datesValid ? t('leave.invalidDates') : undefined}
              />
              <Field
                label={t('leave.reason')}
                value={reason}
                onChangeText={setReason}
                placeholder={t('leave.reasonHint')}
                multiline
                numberOfLines={3}
                style={{ height: 90, textAlignVertical: 'top' }}
              />
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
