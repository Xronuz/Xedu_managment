import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { announcementsApi } from '@/api/school';
import { Screen } from '@/components/screen';
import { Field, Button } from '@/components/ui';
import { SelectField } from '@/components/select-field';
import { spacing } from '@/theme/tokens';

const PRIORITIES = ['low', 'normal', 'urgent'];

export default function AnnouncementNewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState('normal');

  const mutation = useMutation({
    // status='published' — darhol e'lon qilinadi (draft emas)
    mutationFn: () => announcementsApi.create({ title: title.trim(), body: body.trim(), priority, status: 'published' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      Alert.alert(t('common.success'), t('crud.created'), [{ text: 'OK', onPress: () => router.back() }]);
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string | string[] }>).response?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : (msg as string) ?? t('common.networkError'));
    },
  });

  const canSubmit = title.trim() && body.trim() && !mutation.isPending;

  return (
    <Screen title={t('ann.newAnnouncement')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Field label={t('ann.title')} value={title} onChangeText={setTitle} />
        <Field label={t('ann.body')} value={body} onChangeText={setBody} multiline style={{ height: 120, textAlignVertical: 'top' }} />
        <SelectField label={t('ann.priority')} value={priority} options={PRIORITIES.map((p) => ({ value: p, label: t(`ann.priorityVal.${p}`) }))} onChange={setPriority} />
        <Button title={t('ann.publish')} icon="megaphone-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
      </ScrollView>
    </Screen>
  );
}
