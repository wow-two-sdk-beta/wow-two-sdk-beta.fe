import { useQueryRevision, queryScope, withinQueryScope } from '../QueryLifetime';
import { combineRequestSignals } from '../../../../foundation/http/RequestScope';
import { resolveQueryResult } from '../QueryOutcome';
import type { Result } from '../../../../foundation/results';
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';
import { keepPreviousData as keepPrevious, useQuery, useQueryClient, type QueryKey } from '@tanstack/vue-query';

import type { ApiFailure } from '../../../../foundation/http';

import type { AppQueryMeta } from '../CreateQueryClient';
import { toApiFailure } from '../QueryOutcome';

/**
 * Defines options for `useAppQuery` — `TRaw` first so it infers from `queryFn` (a spread def) and
 * `TData` defaults to it when `map` is absent.
 */
export interface UseAppQueryOptions<TRaw, TData = TRaw> {
  /** The cache key (from `queryKeys`). A ref or getter re-keys the query reactively. */
  readonly key: MaybeRefOrGetter<QueryKey>;

  /** Fetches the raw payload; receives the `AbortSignal` so the request cancels on unmount. */
  readonly queryFn: (ctx: { signal: AbortSignal }) => Promise<Result<TRaw, ApiFailure>>;

  /** Maps the raw payload to the domain shape — identity when omitted. */
  readonly map?: (raw: TRaw) => TData;

  /** Gates the query — skips fetching while `false`. A ref or getter toggles it reactively. */
  readonly enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Polls every this many milliseconds while set, pausing in a background tab; `false` or `undefined` stops it. A
   * getter polls only while work is in flight — `() => (job.value?.isRunning ? 2_000 : false)`.
   */
  readonly refetchInterval?: MaybeRefOrGetter<number | false | undefined>;

  /** Metadata for the global `onError` seam — `suppressGlobalError: true` keeps this query's failures out. */
  readonly meta?: AppQueryMeta;

  /**
   * While a new key loads, keeps showing the previous key's data (flagged by `isPreviousData`) instead of
   * dropping to the first-load state — filters, search and paging. Default `false`.
   */
  readonly keepPreviousData?: boolean;
}

/** Represents a single-resource query's slice — every member reactive. */
export interface UseAppQueryReturn<TData> {
  /** The mapped domain payload, or `undefined` until it resolves. */
  readonly data: Ref<TData | undefined>;

  /** True while there is no data yet and a fetch is in flight — already false whenever `data` is set. */
  readonly loading: ComputedRef<boolean>;

  /** True while there is nothing to show yet and the first fetch is in flight — the skeleton state. */
  readonly isFirstLoad: ComputedRef<boolean>;

  /** True while data is showing and a fetch is in flight — a refetch, a poll or a new key under `keepPreviousData`. */
  readonly isRefreshing: ComputedRef<boolean>;

  /** True while `data` is the previous key's, held by `keepPreviousData` until the new key resolves. */
  readonly isPreviousData: ComputedRef<boolean>;

  /** The failure coerced to `ApiFailure`, or `null`. */
  readonly error: ComputedRef<ApiFailure | null>;

  /** Refetches the query. */
  readonly refetch: () => unknown;
}

/**
 * Manages a single-resource query — wraps `useQuery`, maps raw→domain via `select`, and coerces
 * failures to `ApiFailure`.
 *
 * Returns REFS, not values: `@tanstack/vue-query` hands back a ref per field, and a composable that
 * unwrapped them would freeze at the first render. Read `data.value` (or bind `data` in a template).
 */
export function useAppQuery<TRaw, TData = TRaw>({
  key,
  queryFn,
  map,
  enabled,
  refetchInterval,
  meta,
  keepPreviousData = false,
}: UseAppQueryOptions<TRaw, TData>): UseAppQueryReturn<TData> {
  // A getter for the WHOLE options object: `key` and `enabled` are `MaybeRefOrGetter`, and this is
  // the one form that re-evaluates every one of them together on each dependency change.
  const client = useQueryClient();
  const revision = useQueryRevision(client);
  const query = useQuery<TRaw, Error, TData, QueryKey>(() => ({
    queryKey: (revision.value, toValue(key)),
    queryFn: async ({ signal }) => {
      const origin = queryScope(client).capture();
      const combined = combineRequestSignals(signal, origin.signal);
      try {
        return await withinQueryScope(origin, () => resolveQueryResult(queryFn({ signal: combined.signal })));
      } finally {
        combined.dispose();
      }
    },
    select: map ?? ((raw: TRaw) => raw as unknown as TData),
    enabled: toValue(enabled),
    refetchInterval: toValue(refetchInterval) ?? false,
    meta,
    // The shared function, not a fresh arrow: TanStack keeps a held placeholder only while its identity holds.
    ...(keepPreviousData ? { placeholderData: keepPrevious } : {}),
  }));

  const isFirstLoad = computed(() => query.isPending.value && query.isFetching.value);

  return {
    data: query.data,
    loading: isFirstLoad,
    isFirstLoad,
    isRefreshing: computed(() => query.isFetching.value && !query.isPending.value),
    isPreviousData: computed(() => query.isPlaceholderData.value),
    error: computed(() => (query.error.value ? toApiFailure(query.error.value) : null)),
    refetch: query.refetch,
  };
}
