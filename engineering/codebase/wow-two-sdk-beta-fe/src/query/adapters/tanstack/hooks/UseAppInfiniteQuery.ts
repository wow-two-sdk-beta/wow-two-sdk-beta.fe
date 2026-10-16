import { useQueryRevision, queryScope, withinQueryScope } from '../QueryLifetime';
import { combineRequestSignals } from '../../../../foundation/http/RequestScope';
import { resolveQueryResult } from '../QueryOutcome';
import type { Result } from '../../../../foundation/results';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';
import { useInfiniteQuery, useQueryClient, type InfiniteData, type QueryKey } from '@tanstack/vue-query';

import type { ApiFailure } from '../../../../foundation/http';

import type { AppQueryMeta } from '../CreateQueryClient';
import { toApiFailure } from '../QueryOutcome';

/** Defines options for `useAppInfiniteQuery`. */
export interface UseAppInfiniteQueryOptions<TItem, TPage> {
  /** The cache key (from `queryKeys`). */
  readonly key: MaybeRefOrGetter<QueryKey>;

  /** Fetches one page for `pageParam`; receives the `AbortSignal`. */
  readonly queryFn: (ctx: { pageParam: unknown; signal: AbortSignal }) => Promise<Result<TPage, ApiFailure>>;

  /** Derives the next page's param from the last page — return `undefined`/`null` to stop. */
  readonly getNextPageParam: (lastPage: TPage, allPages: ReadonlyArray<TPage>) => unknown;

  /** The param for the first page. */
  readonly initialPageParam: unknown;

  /** Extracts items from a page — the page itself is the item array when omitted. */
  readonly mapPage?: (page: TPage) => ReadonlyArray<TItem>;

  /** Poll interval in ms, or a fn of the current items → ms / `false` (poll-while-running). */
  readonly refetchInterval?: number | ((items: ReadonlyArray<TItem>) => number | false);

  /** Gates the query — skips fetching while `false`. */
  readonly enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Metadata for the global `onError` seam — `suppressGlobalError: true` keeps this query's failures
   * out (e.g. polls that would otherwise toast per failed refetch).
   */
  readonly meta?: AppQueryMeta;
}

/** Represents an infinite query's slice — every member reactive. */
export interface UseAppInfiniteQueryReturn<TItem> {
  /** Every fetched page flattened to items. */
  readonly items: ComputedRef<ReadonlyArray<TItem>>;

  /** True while there is no page yet and a fetch is in flight. */
  readonly loading: ComputedRef<boolean>;

  /** The failure coerced to `ApiFailure`, or `null`. */
  readonly error: ComputedRef<ApiFailure | null>;

  /** Whether another page can be fetched. */
  readonly hasNextPage: Ref<boolean>;

  /** Fetches the next page. */
  readonly fetchNextPage: (...args: never[]) => unknown;

  /** True while the next page is in flight. */
  readonly isFetchingNextPage: Ref<boolean>;

  /** Refetches every fetched page. */
  readonly refetch: () => unknown;
}

/** Manages a paginated resource — wraps `useInfiniteQuery`, flattens pages to items, supports poll-while-running. */
export function useAppInfiniteQuery<TItem, TPage>({
  key,
  queryFn,
  getNextPageParam,
  initialPageParam,
  mapPage,
  refetchInterval,
  enabled,
  meta,
}: UseAppInfiniteQueryOptions<TItem, TPage>): UseAppInfiniteQueryReturn<TItem> {
  // A plain closure is enough — Vue recomputes only when a tracked dependency changes.
  const extract = (page: TPage): ReadonlyArray<TItem> =>
    mapPage ? mapPage(page) : (page as unknown as ReadonlyArray<TItem>);

  const client = useQueryClient();
  const revision = useQueryRevision(client);
  const query = useInfiniteQuery<TPage, Error, InfiniteData<TPage, unknown>, QueryKey, unknown>(() => ({
    queryKey: (revision.value, toValue(key)),
    queryFn: async ({ pageParam, signal }) => {
      const origin = queryScope(client).capture();
      const combined = combineRequestSignals(signal, origin.signal);
      try {
        return await withinQueryScope(origin, () =>
          resolveQueryResult(queryFn({ pageParam, signal: combined.signal })),
        );
      } finally {
        combined.dispose();
      }
    },
    getNextPageParam,
    initialPageParam,
    enabled: toValue(enabled),
    meta,
    refetchInterval:
      refetchInterval === undefined
        ? undefined
        : (query_) => {
            if (typeof refetchInterval === 'number') return refetchInterval;
            const current = (query_.state.data?.pages ?? []).flatMap((page) => [...extract(page)]);
            return refetchInterval(current);
          },
  }));

  return {
    items: computed(() => (query.data.value?.pages ?? []).flatMap((page) => [...extract(page)])),
    loading: computed(() => query.isPending.value && query.isFetching.value),
    error: computed(() => (query.error.value ? toApiFailure(query.error.value) : null)),
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
  };
}
