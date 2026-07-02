import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';

export interface Page<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** {data, meta} sahifalangan endpoint uchun infinite-scroll query. */
export function usePaginated<T>(key: QueryKey, fetcher: (page: number) => Promise<Page<T>>) {
  return useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => fetcher(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
  });
}

export function flattenPages<T>(pages?: { pages: Page<T>[] }): T[] {
  return (pages?.pages ?? []).flatMap((p) => p.data ?? []);
}
