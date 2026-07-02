import { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { teacherApi } from '@/api/teacher';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { Avatar } from '@/components/avatar';
import { Button, Field } from '@/components/ui';
import { EmptyState } from '@/components/empty-state';
import { ListSkeleton } from '@/components/skeleton';
import { ErrorBanner } from '@/components/error-banner';
import { Row } from '@/components/row';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { impact, success as hapticSuccess, error as hapticError } from '@/lib/haptics';

interface Student {
  id: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

// Week 6: 4 ta fielddan oshmasin — type, score, maxScore, comment.
const GRADE_TYPES = ['classwork', 'homework', 'test', 'exam', 'quarterly', 'final'] as const;

export default function TeachGradesScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { classId, subjectId, className } = useLocalSearchParams<{ classId: string; subjectId?: string; subjectName?: string; className?: string }>();

  const [active, setActive] = useState<Student | null>(null);
  const [score, setScore] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [type, setType] = useState<(typeof GRADE_TYPES)[number]>('classwork');
  const [comment, setComment] = useState('');

  const query = useQuery<Student[]>({
    queryKey: ['teacher', 'roster', classId],
    queryFn: () => teacherApi.classStudents(classId),
    enabled: !!classId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      teacherApi.createGrade({
        studentId: active!.id,
        classId,
        subjectId: subjectId ?? '',
        type,
        score: Number(score),
        maxScore: Number(maxScore) || 100,
        date: new Date().toISOString().slice(0, 10),
        comment: comment.trim() || undefined,
      }),
    onSuccess: () => {
      hapticSuccess();
      setActive(null);
      setScore('');
      setComment('');
      Alert.alert(t('common.success'), t('teach.gradeSaved'));
    },
    onError: () => {
      hapticError();
      Alert.alert(t('common.error'), t('common.networkError'));
    },
  });

  const scoreNum = Number(score);
  const maxNum = Number(maxScore) || 100;
  const canSubmit = score.length > 0 && !Number.isNaN(scoreNum) && scoreNum >= 0 && scoreNum <= maxNum && !!subjectId && !mutation.isPending;

  return (
    <>
      <Stack.Screen options={{ title: className || t('teach.gradeEntry') }} />

      {query.isError ? (
        <View style={{ padding: spacing.lg }}>
          <ErrorBanner message={t('common.networkError')} onRetry={() => query.refetch()} />
        </View>
      ) : null}

      {query.isLoading ? (
        <ListSkeleton rows={5} />
      ) : query.data && query.data.length > 0 ? (
        <FlatList
          data={query.data}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          refreshControl={
            <RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={theme.primary} />
          }
          renderItem={({ item }) => (
            <Row
              onPress={() => { impact('light'); setActive(item); setScore(''); setComment(''); setType('classwork'); setMaxScore('100'); }}
              leading={<Avatar name={`${item.firstName ?? ''} ${item.lastName ?? ''}`} uri={item.avatarUrl} size={40} />}
              title={`${item.firstName ?? ''} ${item.lastName ?? ''}`.trim()}
              trailing={<Ionicons name="add-circle-outline" size={24} color={theme.primary} />}
            />
          )}
        />
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState icon="people-outline" title={t('teach.noStudents')} />
        </View>
      )}

      {/* Quick Grade Input — bottom sheet (4 fielddan oshmasin) */}
      <Modal visible={!!active} animationType="slide" transparent onRequestClose={() => setActive(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl }}>
            <ScrollView contentContainerStyle={{ padding: spacing.xxl }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
                <Text variant="title" style={{ flex: 1 }} numberOfLines={1}>
                  {active ? `${active.firstName ?? ''} ${active.lastName ?? ''}`.trim() : ''}
                </Text>
                <Ionicons name="close" size={26} color={theme.textMuted} onPress={() => setActive(null)} />
              </View>

              {/* Field 1: Grade type chips */}
              <Text variant="label" color="textSecondary" style={{ marginBottom: spacing.sm }}>
                {t('teach.type').toUpperCase()}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
                {GRADE_TYPES.map((gt) => {
                  const on = type === gt;
                  return (
                    <Pressable
                      key={gt}
                      onPress={() => setType(gt)}
                      style={{
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: radius.pill,
                        backgroundColor: on ? theme.primaryLight : 'transparent',
                        borderWidth: 1,
                        borderColor: on ? theme.primary : theme.border,
                      }}
                    >
                      <Text variant="caption" style={{ color: on ? theme.primary : theme.textMuted }}>
                        {t(`gradeType.${gt}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Field 2 & 3: Score + MaxScore */}
              <View style={{ flexDirection: 'row', gap: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Field label={t('teach.score')} value={score} onChangeText={setScore} keyboardType="number-pad" placeholder="0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label={t('teach.maxScore')} value={maxScore} onChangeText={setMaxScore} keyboardType="number-pad" placeholder="100" />
                </View>
              </View>

              {/* Field 4: Comment (optional) */}
              <Field label={t('teach.comment')} value={comment} onChangeText={setComment} multiline numberOfLines={2} style={{ height: 70, textAlignVertical: 'top' }} />

              <Button title={t('common.save')} icon="save-outline" onPress={() => mutation.mutate()} loading={mutation.isPending} disabled={!canSubmit} />
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}
