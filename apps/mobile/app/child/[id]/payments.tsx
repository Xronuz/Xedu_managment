import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { parentApi } from '@/api/parent';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { Badge, paymentTone } from '@/components/badge';
import { IconBadge } from '@/components/row';
import { useChildParams } from '@/hooks/use-child';
import { formatDate, formatMoney } from '@/lib/format';
import { spacing } from '@/theme/tokens';

interface PaymentRow {
  id: string;
  amount: number;
  currency?: string;
  status: string;
  description?: string | null;
  dueDate?: string | null;
  createdAt: string;
}

export default function PaymentsScreen() {
  const { t } = useTranslation();
  const { id } = useChildParams();

  const query = useQuery<PaymentRow[]>({
    queryKey: ['parent', 'payments', id],
    queryFn: () => parentApi.getChildPayments(id),
  });

  return (
    <DataList
      query={query}
      keyExtractor={(r) => r.id}
      emptyIcon="card-outline"
      emptyTitle={t('payments.empty')}
      renderItem={(row) => (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconBadge icon="cash-outline" color="warning" bg="warningLight" />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{formatMoney(row.amount, row.currency)}</Text>
              <Text variant="caption" color="textMuted" numberOfLines={1} style={{ marginTop: 2 }}>
                {row.description || formatDate(row.createdAt)}
                {row.dueDate ? `  ·  ${t('payments.due')}: ${formatDate(row.dueDate)}` : ''}
              </Text>
            </View>
            <Badge label={t(`payments.${row.status}`)} tone={paymentTone(row.status)} />
          </View>
        </Card>
      )}
    />
  );
}
