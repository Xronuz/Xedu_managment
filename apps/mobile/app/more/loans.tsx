import { useState } from 'react';
import { Alert, FlatList, RefreshControl, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { loansApi, type LibraryLoan } from '@/api/school';
import { libraryApi, type LibraryBook } from '@/api/school';
import { Screen } from '@/components/screen';
import { Card } from '@/components/card';
import { Text } from '@/components/text';
import { IconBadge } from '@/components/row';
import { Badge } from '@/components/badge';
import { Button } from '@/components/ui';
import { Field } from '@/components/ui';
import { ListSkeleton } from '@/components/skeleton';
import { ErrorBanner } from '@/components/error-banner';
import { EmptyState } from '@/components/empty-state';
import { formatDate } from '@/lib/format';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';
import { success as hapticSuccess, error as hapticError, impact } from '@/lib/haptics';

/**
 * Library Scanner (Week 8). Kutubxonachi: kitob berish/qaytarish.
 * Camera scanner dependency yo'q — manual ISBN/kitob nomi input + graceful
 * "Scan" fallback (TODO: Phase 2 camera-scanner).
 *
 * Backend endpointlar (koddan tekshirilgan):
 *  - POST /library/loans (issue) → loansApi.issue
 *  - PUT /library/loans/:id/return (return) → loansApi.returnBook
 */
export default function LoansScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const qc = useQueryClient();
  const now = Date.now();

  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('');

  const loansQ = useQuery<LibraryLoan[]>({
    queryKey: ['library', 'loans'],
    queryFn: loansApi.list,
    retry: false,
  });

  // Kitob qidiruv (issue uchun).
  const booksQ = useQuery<LibraryBook[]>({
    queryKey: ['library', 'books', search.trim()],
    queryFn: () => libraryApi.books(search.trim() || undefined),
    enabled: search.trim().length >= 2,
    retry: false,
  });

  const returnMut = useMutation({
    mutationFn: (loanId: string) => loansApi.returnBook(loanId),
    onSuccess: () => {
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['library', 'loans'] });
      Alert.alert(t('common.success'), t('lib.returned'));
    },
    onError: () => {
      hapticError();
      Alert.alert(t('common.error'), t('common.networkError'));
    },
  });

  const issueMut = useMutation({
    mutationFn: ({ bookId }: { bookId: string }) => {
      if (!studentId.trim()) throw new Error('studentId');
      // Ertaga default due date (2 hafta).
      const due = new Date();
      due.setDate(due.getDate() + 14);
      return loansApi.issue({ bookId, studentId: studentId.trim(), dueDate: due.toISOString().slice(0, 10) });
    },
    onSuccess: () => {
      hapticSuccess();
      qc.invalidateQueries({ queryKey: ['library', 'loans'] });
      setSearch('');
      Alert.alert(t('common.success'), t('lib.issued'));
    },
    onError: () => {
      hapticError();
      Alert.alert(t('common.error'), t('common.networkError'));
    },
  });

  const loans = loansQ.data ?? [];
  const overdueLoans = loans.filter((l) => !l.returnedAt && new Date(l.dueDate).getTime() < now);
  const books = (booksQ.data ?? []).slice(0, 5);

  return (
    <Screen title={t('more.loans')} scroll>
      {/* Issue section — kitob berish */}
      <View style={{ gap: spacing.md }}>
        <Text variant="heading">{t('lib.issueTitle')}</Text>

        {/* Scan button — graceful fallback (TODO: Phase 2 camera) */}
        <Button
          title={t('lib.scan')}
          icon="scan-outline"
          variant="ghost"
          onPress={() => { impact('light'); Alert.alert(t('lib.scan'), t('lib.scanNotAvailable')); }}
        />

        <Field
          label={t('lib.bookSearch')}
          leftIcon="search-outline"
          value={search}
          onChangeText={setSearch}
          placeholder={t('lib.bookSearchHint')}
          autoCapitalize="none"
        />
        <Field
          label={t('lib.studentId')}
          leftIcon="person-outline"
          value={studentId}
          onChangeText={setStudentId}
          placeholder={t('lib.studentIdHint')}
          autoCapitalize="none"
        />

        {/* Book search results */}
        {search.trim().length >= 2 && booksQ.data ? (
          <View style={{ gap: spacing.sm }}>
            {books.length === 0 ? (
              <Text variant="caption" color="textMuted">{t('lib.noBooksFound')}</Text>
            ) : (
              books.map((book) => (
                <Card key={book.id} onPress={() => { impact('light'); issueMut.mutate({ bookId: book.id }); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="book-outline" size={18} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>{book.title}</Text>
                      {book.author ? <Text variant="caption" color="textMuted">{book.author}</Text> : null}
                    </View>
                    <Badge label={`${book.copiesAvailable ?? 0}`} tone={(book.copiesAvailable ?? 0) > 0 ? 'success' : 'neutral'} />
                  </View>
                </Card>
              ))
            )}
          </View>
        ) : null}

        {!studentId.trim() && search.trim().length >= 2 ? (
          <Text variant="caption" color="textMuted">{t('lib.enterStudentId')}</Text>
        ) : null}
      </View>

      {/* Active loans section — overdue highlighted */}
      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        <Text variant="heading">{t('lib.activeLoans')}</Text>

        {loansQ.isError ? (
          <ErrorBanner message={t('common.networkError')} onRetry={() => loansQ.refetch()} />
        ) : null}

        {loansQ.isLoading ? (
          <ListSkeleton rows={3} />
        ) : loans.length > 0 ? (
          <FlatList
            data={loans}
            scrollEnabled={false}
            keyExtractor={(l) => l.id}
            contentContainerStyle={{ gap: spacing.md }}
            refreshControl={
              <RefreshControl refreshing={loansQ.isRefetching} onRefresh={loansQ.refetch} tintColor={theme.primary} />
            }
            renderItem={({ item: loan }) => {
              const overdue = !loan.returnedAt && new Date(loan.dueDate).getTime() < now;
              const name = loan.student ? `${loan.student.firstName ?? ''} ${loan.student.lastName ?? ''}`.trim() : '';
              return (
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <IconBadge
                      icon={overdue ? 'alert-circle-outline' : 'book-outline'}
                      color={overdue ? 'danger' : 'primary'}
                      bg={overdue ? 'dangerLight' : 'primaryLight'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text variant="bodyStrong" numberOfLines={1}>{loan.book?.title ?? '—'}</Text>
                      <Text variant="caption" color="textMuted">
                        {name}{name ? ' · ' : ''}{t('more.dueDate')}: {formatDate(loan.dueDate)}
                      </Text>
                    </View>
                    {overdue ? <Badge label={t('more.overdue')} tone="danger" /> : null}
                  </View>
                  {!loan.returnedAt ? (
                    <View style={{ marginTop: spacing.md }}>
                      <Button
                        title={t('lib.returnBook')}
                        icon="arrow-undo-outline"
                        variant="tonal"
                        loading={returnMut.isPending}
                        onPress={() => { impact('light'); returnMut.mutate(loan.id); }}
                      />
                    </View>
                  ) : null}
                </Card>
              );
            }}
          />
        ) : (
          <EmptyState icon="book-outline" title={t('more.noLoans')} />
        )}
      </View>
    </Screen>
  );
}
