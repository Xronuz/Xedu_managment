import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { paymentsApi, type Payment } from '@/api/finance';
import { financeApi } from '@/api/school';
import { usePaginated } from '@/lib/use-paginated';
import { Screen, Card } from '@/components/screen';
import { Text } from '@/components/text';
import { PaginatedList } from '@/components/paginated-list';
import { Badge, paymentTone } from '@/components/badge';
import { Button } from '@/components/ui';
import { IconBadge } from '@/components/row';
import { SearchBar } from '@/components/search-bar';
import { ChipFilter } from '@/components/chip-filter';
import { formatDate, formatMoney } from '@/lib/format';
import { spacing } from '@/theme/tokens';
import { success as hapticSuccess, impact } from '@/lib/haptics';

type Filter = 'all' | 'pending' | 'overdue' | 'paid';

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [status, setStatus] = useState<Filter>('all');
  const [search, setSearch] = useState('');

  const query = usePaginated<Payment>(['payments', 'history', status], (page) => paymentsApi.history(page, status === 'all' ? undefined : status));

  // Finance report — debtor/overdue summary uchun.
  const finQ = useQuery({ queryKey: ['finance', 'report'], queryFn: financeApi.report, retry: false });
  const overdueCount = finQ.data?.overdue ?? 0;
  const debtorCount = finQ.data?.debtors?.length ?? 0;

  const markPaid = useMutation({
    mutationFn: (id: string) => paymentsApi.markPaid(id),
    onSuccess: () => {
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  return (
    <Screen title={t('fin.payments')} scroll={false}>
      {/* Debtor/overdue summary strip */}
      {(overdueCount > 0 || debtorCount > 0) ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          {debtorCount > 0 ? (
            <View style={{ flex: 1, backgroundColor: '#FCE8E8', borderRadius: 12, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
              <Text variant="bodyStrong" style={{ color: '#DC2626' }}>{debtorCount}</Text>
              <Text variant="label" style={{ color: '#DC2626', fontSize: 11 }} numberOfLines={1}>{t('acc.debtors')}</Text>
            </View>
          ) : null}
          {overdueCount > 0 ? (
            <View style={{ flex: 1, backgroundColor: '#FCEEE3', borderRadius: 12, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
              <Text variant="bodyStrong" style={{ color: '#C2410C' }}>{overdueCount}</Text>
              <Text variant="label" style={{ color: '#C2410C', fontSize: 11 }} numberOfLines={1}>{t('acc.overdue')}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Search */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('crud.search')} />
      </View>

      {/* Status chip filter */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <ChipFilter
          selected={status}
          onSelect={(v) => { impact('light'); setStatus(v as Filter); }}
          options={[
            { value: 'all', label: t('fin.all') },
            { value: 'pending', label: t('payments.pending'), tone: 'warning' },
            { value: 'overdue', label: t('payments.overdue'), tone: 'danger' },
            { value: 'paid', label: t('payments.paid'), tone: 'success' },
          ]}
        />
      </View>

      <PaginatedList
        query={query}
        keyExtractor={(p) => p.id}
        emptyIcon="card-outline"
        emptyTitle={t('fin.noPayments')}
        renderItem={(p) => {
          // Client-side search filter (server search yo'q — graceful).
          if (search.trim()) {
            const sName = p.student ? `${p.student.firstName ?? ''} ${p.student.lastName ?? ''}`.trim().toLowerCase() : '';
            const sDesc = (p.description ?? '').toLowerCase();
            if (!sName.includes(search.trim().toLowerCase()) && !sDesc.includes(search.trim().toLowerCase())) {
              return <View style={{ height: 0 }} />;
            }
          }
          const name = p.student ? `${p.student.firstName ?? ''} ${p.student.lastName ?? ''}`.trim() : '';
          const canPay = p.status === 'pending' || p.status === 'overdue';
          return (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <IconBadge
                  icon={p.status === 'overdue' ? 'warning' : 'cash-outline'}
                  color={p.status === 'overdue' ? 'danger' : 'warning'}
                  bg={p.status === 'overdue' ? 'dangerLight' : 'warningLight'}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{formatMoney(p.amount, p.currency)}</Text>
                  <Text variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                    {[name, p.description, p.dueDate ? formatDate(p.dueDate) : null].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Badge label={t(`payments.${p.status}`)} tone={paymentTone(p.status)} />
              </View>
              {canPay ? (
                <View style={{ marginTop: spacing.md }}>
                  <Button title={t('fin.markPaid')} icon="checkmark-circle-outline" variant="tonal" loading={markPaid.isPending} onPress={() => markPaid.mutate(p.id)} />
                </View>
              ) : null}
            </Card>
          );
        }}
      />
    </Screen>
  );
}
