import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { payrollApi, type SalaryConfig } from '@/api/finance';
import { Screen } from '@/components/screen';
import { DataList } from '@/components/data-list';
import { Row } from '@/components/row';
import { Avatar } from '@/components/avatar';
import { Text } from '@/components/text';
import { formatMoney } from '@/lib/format';
import { useTheme } from '@/theme/use-theme';

export default function PayrollScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const query = useQuery<SalaryConfig[]>({ queryKey: ['payroll', 'staff'], queryFn: payrollApi.staff });

  return (
    <Screen title={t('fin.payroll')} scroll={false}>
      <DataList
        query={query}
        keyExtractor={(s) => s.id}
        emptyIcon="wallet-outline"
        emptyTitle={t('fin.noPayroll')}
        renderItem={(s) => {
          const name = s.user ? `${s.user.firstName ?? ''} ${s.user.lastName ?? ''}`.trim() : '—';
          return (
            <Row
              leading={<Avatar name={name} uri={s.user?.avatarUrl} size={40} />}
              title={name}
              subtitle={s.user?.role}
              trailing={<Text variant="bodyStrong" style={{ color: theme.success }}>{formatMoney(s.baseSalary)}</Text>}
            />
          );
        }}
      />
    </Screen>
  );
}
