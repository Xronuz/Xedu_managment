import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { settingsApi, type SchoolConfig } from '@/api/school';
import { useAuthStore } from '@/store/auth.store';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { EmptyState } from '@/components/empty-state';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const role = (useAuthStore((s) => s.user?.role) ?? '').toLowerCase().trim();
  const canEdit = role === 'director' || role === 'super_admin';

  const { data, isLoading, isError, refetch } = useQuery<SchoolConfig>({
    queryKey: ['system-config'],
    queryFn: settingsApi.get,
  });

  const [form, setForm] = useState<SchoolConfig | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (dto: Partial<SchoolConfig>) => settingsApi.update(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-config'] });
      Alert.alert(t('common.success'), t('crud.saved'));
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  if (isLoading || !form) {
    return (
      <Screen title={t('menu.settings')} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </Screen>
    );
  }
  if (isError) {
    return (
      <Screen title={t('menu.settings')} scroll={false}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="cloud-offline-outline" tone="danger" title={t('common.error')} subtitle={t('common.networkError')} actionTitle={t('common.retry')} onAction={() => refetch()} />
        </View>
      </Screen>
    );
  }

  const set = (k: keyof SchoolConfig, v: string) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const save = () =>
    mutation.mutate({
      school_name: form.school_name,
      school_phone: form.school_phone,
      school_address: form.school_address,
      academic_year: form.academic_year,
      pass_threshold: Number(form.pass_threshold) || 50,
      work_days: Number(form.work_days) || 22,
      bhm: Number(form.bhm) || 0,
    });

  const editable = canEdit && !mutation.isPending;

  return (
    <Screen title={t('menu.settings')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Field label={t('cfg.schoolName')} value={form.school_name} onChangeText={(v) => set('school_name', v)} editable={editable} />
        <Field label={t('cfg.schoolPhone')} value={form.school_phone} onChangeText={(v) => set('school_phone', v)} keyboardType="phone-pad" editable={editable} />
        <Field label={t('cfg.schoolAddress')} value={form.school_address} onChangeText={(v) => set('school_address', v)} multiline editable={editable} />
        <Field label={t('cfg.academicYear')} value={String(form.academic_year)} onChangeText={(v) => set('academic_year', v)} editable={editable} />
        <Field label={t('cfg.passThreshold')} value={String(form.pass_threshold)} onChangeText={(v) => set('pass_threshold', v)} keyboardType="number-pad" editable={editable} />
        <Field label={t('cfg.workDays')} value={String(form.work_days)} onChangeText={(v) => set('work_days', v)} keyboardType="number-pad" editable={editable} />
        <Field label={t('cfg.bhm')} value={String(form.bhm)} onChangeText={(v) => set('bhm', v)} keyboardType="number-pad" editable={editable} />
        {canEdit ? (
          <Button title={t('common.save')} icon="save-outline" onPress={save} loading={mutation.isPending} disabled={!editable} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
