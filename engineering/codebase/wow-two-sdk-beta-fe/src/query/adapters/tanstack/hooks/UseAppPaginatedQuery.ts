import { useQueryRevision, queryScope, withinQueryScope } from '../QueryLifetime';
import { combineRequestSignals } from '../../../../foundation/http/RequestScope';
import { resolveQueryResult } from '../QueryOutcome';
import type { Result } from '../../../../foundation/results';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';
import { useQuery, useQueryClient, type QueryKey } from '@tanstack/vue-query';

import type { ApiFailure } from '../../../../foundation/http';

import type { AppQueryMeta } from '../CreateQueryClient';
import { toApiFailure } from '../QueryOutcome';

/** Defines options for `useAppPaginatedQuery`. */
export interface UseAppPaginatedQueryOptions<TItem, TPage> {
  /** The base cache key (from `queryKeys`) — the active `page` is appended to form the per-page key. */
  readonly key: MaybeRefOrGetter<QueryKey>;

  /** Fetches one page; receives the controlled `page` and the `AbortSignal`. */
  readonly queryFn: (ctx: { page: number; signal: AbortSignal }) => Promise<Result<TPage, ApiFailure>>;

  /**
   * The controlled page index — the caller owns it; changing it loads that page. A ref or getter
   * drives it reactively.
   */
  readonly page: MaybeRefOrGetter<number>;

  /** Extracts items from a page — the page itself is the item array when omitted. */
  readonly mapPage?: (page: TPage) => ReadonlyArray<TItem>;

  /** Gates the query — skips fetching while `false`. */
  readonly enabled?: MaybeRefOrGetter<boolean>;

  /** Metadata for the global `onError` seam — `suppressGlobalError: true` keeps this query's failures out. */
  readonly meta?: AppQueryMeta;
}

/** Represents a page/offset paginated query's slice — every member reactive. */
export interface UseAppPaginatedQueryReturn<TItem, TPage> {
  /** The current page's items. */
  readonly items: ComputedRef<ReadonlyArray<TItem>>;

  /**
   * The raw page as fetched (`TPage`) — total count / page count / `hasMore` live here; `undefined`
   * until the first page resolves. While `isPlaceholder`, it is the held previous page.
   */
  readonly page: Ref<TPage | undefined>;

  /** True while there is no page yet and a fetch is in flight. */
  readonly loading: ComputedRef<boolean>;

  /** The failure coerced to `ApiFailure`, or `null`. */
  readonly error: ComputedRef<ApiFailure | null>;

  /** True while the held previous page is being shown during a page change. */
  readonly isPlaceholder: Ref<boolean>;

  /** Refetches the active page. */
  readonly refetch: () => unknown;
}

/**
 * Manages page/offset pagination — wraps `useQuery` with `keepPreviousData` so the list holds
 * steady between pages.
 */
export function useAppPaginatedQuery<TItem, TPage>({
  key,
  queryFn,
  page,
  mapPage,
  enabled,
  meta,
}: UseAppPaginatedQueryOptions<TItem, TPage>): UseAppPaginatedQueryReturn<TItem, TPage> {
  const client = useQueryClient();
  const revision = useQueryRevision(client);
  const query = useQuery<TPage, Error, TPage, QueryKey>(() => {
    void revision.value;
    const currentPage = toValue(page);
    return {
      queryKey: [...toValue(key), currentPage],
      queryFn: async ({ signal }) => {
        const origin = queryScope(client).capture();
        const combined = combineRequestSignals(signal, origin.signal);
        try {
          return await withinQueryScope(origin, () =>
            resolveQueryResult(queryFn({ page: currentPage, signal: combined.signal })),
          );
        } finally {
          combined.dispose();
        }
      },
      placeholderData: (previous, previousQuery) =>
        previousQuery &&
        client.getQueryCache().find({ queryKey: previousQuery.queryKey, exact: true }) === previousQuery
          ? previous
          : undefined,
      enabled: toValue(enabled),
      meta,
    };
  });

  const items = computed<ReadonlyArray<TItem>>(() => {
    const data = query.data.value;
    if (data === undefined) return [];
    return mapPage ? mapPage(data) : (data as unknown as ReadonlyArray<TItem>);
  });

  return {
    items,
    page: query.data,
    loading: computed(() => query.isPending.value && query.isFetching.value),
    error: computed(() => (query.error.value ? toApiFailure(query.error.value) : null)),
    isPlaceholder: query.isPlaceholderData,
    refetch: query.refetch,
  };
}
