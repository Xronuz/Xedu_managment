import { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { studentApi } from '@/api/student';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { DataList } from '@/components/data-list';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Button, Field } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

interface HomeworkRow {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  subject?: { name?: string } | null;
}

export default function MyHomeworkScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const now = Date.now();

  const [active, setActive] = useState<HomeworkRow | null>(null);
  const [content, setContent] = useState('');

  const query = useQuery<HomeworkRow[]>({
    queryKey: ['student', 'homework'],
    queryFn: studentApi.homework,
  });

  const mutation = useMutation({
    mutationFn: () => studentApi.submitHomework(active!.id, content.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', 'homework'] });
      setActive(null);
      setContent('');
      Alert.alert(t('common.success'), t('homework.submitted'));
    },
    onError: (err) => {
      const msg = (err as AxiosError<{ message?: string }>).response?.data?.message ?? t('common.networkError');
      Alert.alert(t('common.error'), typeof msg === 'string' ? msg : t('common.error'));
    },
  });

  return (
    <>
      <DataList
        query={query}
        keyExtractor={(r) => r.id}
        emptyIcon="book-outline"
        emptyTitle={t('homework.empty')}
        renderItem={(row) => {
          const overdue = new Date(row.dueDate).getTime() < now;
          return (
            <Card onPress={() => { setActive(row); setContent(''); }}>
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <IconBadge icon="book-outline" color="warning" bg="warningLight" />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                      {row.title}
                    </Text>
                    <Badge label={`${t('homework.due')}: ${formatDate(row.dueDate)}`} tone={overdue ? 'danger' : 'neutral'} />
                  </View>
                  {row.subject?.name ? (
                    <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>
                      {row.subject.name}
                    </Text>
                  ) : null}
                  {row.description ? (
                    <Text variant="caption" color="textMuted" style={{ marginTop: 4 }} numberOfLines={3}>
                      {row.description}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
                    <Ionicons name="cloud-upload-outline" size={15} color={theme.primary} />
                    <Text variant="label" color="primary">
                      {t('homework.submit')}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />

      <Modal visible={!!active} animationType="slide" transparent onRequestClose={() => setActive(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
            <ScrollView contentContainerStyle={{ padding: spacing.xxl }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
                  {active?.title}
                </Text>
                <Ionicons name="close" size={26} color={theme.textMuted} onPress={() => setActive(null)} />
              </View>
              <Field
                label={t('homework.yourAnswer')}
                value={content}
                onChangeText={setContent}
                placeholder={t('homework.answerHint')}
                multiline
                numberOfLines={5}
                style={{ height: 130, textAlignVertical: 'top' }}
              />
              <Button
                title={t('homework.submit')}
                icon="cloud-upload-outline"
                onPress={() => mutation.mutate()}
                loading={mutation.isPending}
                disabled={content.trim().length === 0}
              />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
