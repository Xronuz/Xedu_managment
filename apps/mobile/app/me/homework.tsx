import { useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { studentApi } from '@/api/student';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Button, Field } from '@/components/ui';
import { ChipFilter } from '@/components/chip-filter';
import { ListSkeleton } from '@/components/skeleton';
import { ErrorBanner } from '@/components/error-banner';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { success as hapticSuccess, error as hapticError, impact } from '@/lib/haptics';
import { Surface } from '@/components/dashboard-kit';

interface HomeworkRow {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  status?: string | null;
  subject?: { name?: string } | null;
}

type FilterMode = 'all' | 'pending' | 'done' | 'overdue';

function isOverdue(hw: HomeworkRow): boolean {
  if (hw.status === 'submitted' || hw.status === 'graded') return false;
  return new Date(hw.dueDate).getTime() < Date.now();
}

export default function MyHomeworkScreen() {
  const { t } = useTranslation();
  const { theme, shadow } = useTheme();
  const qc = useQueryClient();

  const [filter, setFilter] = useState<FilterMode>('all');
  const [active, setActive] = useState<HomeworkRow | null>(null);
  const [content, setContent] = useState('');

  const query = useQuery<HomeworkRow[]>({
    queryKey: ['student', 'homework'],
    queryFn: studentApi.homework,
    retry: false,
  });

  const rawHw: any = query.data;
  const all: HomeworkRow[] = Array.isArray(rawHw) ? rawHw : rawHw?.data ?? rawHw?.items ?? [];

  // Filter counts for chips.
  const pendingCount = all.filter((h) => !isOverdue(h) && h.status !== 'submitted' && h.status !== 'graded').length;
  const doneCount = all.filter((h) => h.status === 'submitted' || h.status === 'graded').length;
  const overdueCount = all.filter((h) => isOverdue(h)).length;

  let filtered = all.filter((h) => {
    if (filter === 'all') return true;
    if (filter === 'done') return h.status === 'submitted' || h.status === 'graded';
    if (filter === 'overdue') return isOverdue(h);
    if (filter === 'pending') return !isOverdue(h) && h.status !== 'submitted' && h.status !== 'graded';
    return true;
  });

  filtered = filtered.sort((a, b) => {
    const aDone = a.status === 'submitted' || a.status === 'graded';
    const bDone = b.status === 'submitted' || b.status === 'graded';
    if (aDone && !bDone) return 1;
    if (!aDone && bDone) return -1;
    
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const mutation = useMutation({
    mutationFn: () => studentApi.submitHomework(active!.id, content.trim()),
    onSuccess: () => {
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['student', 'homework'] });
      setActive(null);
      setContent('');
      Alert.alert(t('common.success'), t('homework.submitted'));
    },
    onError: () => {
      hapticError();
      Alert.alert(t('common.error'), t('common.networkError'));
    },
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* Chip filter */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <ChipFilter
          selected={filter}
          onSelect={(v) => { impact('light'); setFilter(v as FilterMode); }}
          options={[
            { value: 'all', label: t('homework.filterAll'), count: all.length },
            { value: 'pending', label: t('homework.filterPending'), count: pendingCount, tone: 'warning' },
            { value: 'done', label: t('homework.filterDone'), count: doneCount, tone: 'success' },
            { value: 'overdue', label: t('homework.filterOverdue'), count: overdueCount, tone: 'danger' },
          ]}
        />
      </View>

      {query.isError ? (
        <View style={{ padding: spacing.lg }}>
          <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />
        </View>
      ) : null}

      {query.isLoading ? (
        <ListSkeleton rows={4} />
      ) : filtered.length > 0 ? (
        <FlatList
          data={filtered}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={theme.primary} />
          }
          renderItem={({ item: row }) => {
            const overdue = isOverdue(row);
            const done = row.status === 'submitted' || row.status === 'graded';
            return (
              <Pressable onPress={() => { impact('light'); setActive(row); setContent(''); }}>
                {({ pressed }) => (
                  <Surface style={{ padding: spacing.md, opacity: pressed ? 0.8 : 1, borderWidth: overdue ? 1 : 0, borderColor: overdue ? theme.danger : 'transparent', ...shadow(done ? 0 : 2) }}>
                    <View style={{ flexDirection: 'row', gap: spacing.md }}>
                      <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: done ? theme.successLight : overdue ? theme.dangerLight : theme.warningLight, alignItems: 'center', justifyContent: 'center' }}>
                        <Ionicons name={done ? 'checkmark-circle' : overdue ? 'alert-circle' : 'book'} size={24} color={done ? theme.success : overdue ? theme.danger : theme.warning} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                          <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>{row.title}</Text>
                          <Badge label={formatDate(row.dueDate)} tone={overdue ? 'danger' : done ? 'success' : 'neutral'} />
                        </View>
                        {row.subject?.name ? (
                          <Text variant="caption" color="textSecondary" style={{ marginTop: 2 }}>{row.subject.name}</Text>
                        ) : null}
                        {done ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
                            <Ionicons name="checkmark-circle" size={15} color={theme.success} />
                            <Text variant="label" style={{ color: theme.success }}>Topshirilgan</Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
                            <Ionicons name="cloud-upload-outline" size={15} color={theme.primary} />
                            <Text variant="label" color="primary">Vazifani yuklash</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </Surface>
                )}
              </Pressable>
            );
          }}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl }}>
          <Surface style={{ padding: spacing.xxl, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgSubtle }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.successLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
              <Ionicons name="checkmark-done" size={32} color={theme.success} />
            </View>
            <Text variant="heading" style={{ fontSize: 20 }}>Hammasi bajarilgan</Text>
            <Text variant="body" color="textMuted" center style={{ marginTop: spacing.sm }}>
              Bugun vazifa yo'q. Qo'shimcha XP uchun bilim resurslarini ko'rib chiqing.
            </Text>
          </Surface>
        </View>
      )}

      {/* Detail + submit bottom sheet */}
      <Modal visible={!!active} animationType="slide" transparent onRequestClose={() => setActive(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '80%' }}>
            <View style={{ padding: spacing.xxl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <Text variant="title" style={{ flex: 1 }} numberOfLines={2}>
                  {active?.title}
                </Text>
                <Ionicons name="close" size={26} color={theme.textMuted} onPress={() => setActive(null)} />
              </View>

              {active?.subject?.name ? (
                <View style={{ alignSelf: 'flex-start', marginBottom: spacing.sm }}>
                  <Badge label={active.subject.name} tone="info" />
                </View>
              ) : null}

              <Text variant="caption" color="textMuted">Muddat: {active ? formatDate(active.dueDate) : ''}</Text>

              {active?.description ? (
                <Text variant="body" style={{ marginTop: spacing.md, lineHeight: 22 }}>
                  {active.description}
                </Text>
              ) : null}

              {/* Submit form (only if not yet submitted) */}
              {active && active.status !== 'submitted' && active.status !== 'graded' ? (
                <View style={{ marginTop: spacing.lg, gap: spacing.md }}>
                  <Field
                    label={t('homework.yourAnswer')}
                    value={content}
                    onChangeText={setContent}
                    placeholder={t('homework.answerHint')}
                    multiline
                    numberOfLines={5}
                    style={{ minHeight: 120, textAlignVertical: 'top' }}
                  />
                  <Button
                    title={t('homework.submit')}
                    icon="cloud-upload-outline"
                    onPress={() => mutation.mutate()}
                    loading={mutation.isPending}
                    disabled={content.trim().length === 0}
                    fullWidth
                  />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, backgroundColor: theme.successLight, borderRadius: radius.md }}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                  <Text variant="bodyStrong" style={{ color: theme.success }}>Vazifa topshirilgan</Text>
                </View>
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
