import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { notificationsApi } from '@/api/notifications';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { spacing } from '@/theme/tokens';

const GROUPS = ['all_students', 'all_parents', 'all_teachers', 'all_staff', 'class_teachers'];

export default function BroadcastScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [targetGroup, setTargetGroup] = useState('all_students');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const mutation = useMutation({
    mutationFn: () => notificationsApi.broadcast(targetGroup, title.trim(), body.trim()),
    onSuccess: () => {
      Alert.alert(t('common.success'), t('special.bcSent'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = title.trim() && body.trim() && !mutation.isPending;

  return (
    <Screen title={t('menu.broadcast')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <SelectField
          label={t('special.bcTarget')}
          value={targetGroup}
          options={GROUPS.map((g) => ({ value: g, label: t(`special.group.${g}`) }))}
          onChange={setTargetGroup}
        />
        <Field label={t('special.bcTitle')} value={title} onChangeText={setTitle} />
        <Field label={t('special.bcBody')} value={body} onChangeText={setBody} multiline />
        <Button
          title={t('special.bcSend')}
          icon="megaphone-outline"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          disabled={!canSubmit}
        />
      </ScrollView>
    </Screen>
  );
}
