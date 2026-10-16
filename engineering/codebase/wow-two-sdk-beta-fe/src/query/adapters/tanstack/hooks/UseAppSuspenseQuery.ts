import { resolveQueryResult } from '../QueryOutcome';
import type { ApiFailure } from '../../../../foundation/http';
import type { Result } from '../../../../foundation/results';
import { toValue, type MaybeRefOrGetter, type Ref } from 'vue';
import { useQuery, type QueryKey } from '@tanstack/vue-query';

import type { AppQueryMeta } from '../CreateQueryClient';

/**
 * Defines a suspenseful query — a key, a fetcher, and an optional raw→view mapper. `TRaw` first so
 * it infers from `queryFn` (a spread def); `TData` defaults to it when `map` is absent.
 */
export interface AppSuspenseQueryOptions<TRaw, TData = TRaw> {
  /** The query key that identifies and caches this query. */
  readonly key: MaybeRefOrGetter<QueryKey>;

  /** Fetches the raw data; receives the abort signal the library manages. */
  readonly queryFn: (context: { signal: AbortSignal }) => Promise<Result<TRaw, ApiFailure>>;

  /** Maps the raw fetched shape to the view shape; identity when omitted. */
  readonly map?: (raw: TRaw) => TData;

  /**
   * Metadata for the global `onError` seam — `suppressGlobalError: true` keeps this query's failures
   * out (boundary-handled errors would otherwise double-surface).
   */
  readonly meta?: AppQueryMeta;
}

/** Represents a resolved suspenseful query — `data` is already filled when the composable resolves. */
export interface AppSuspenseQueryReturn<TData> {
  /** The resolved payload. Defined on resolve, and kept live afterwards. */
  readonly data: Ref<TData>;

  /** Refetches the query. */
  readonly refetch: () => unknown;
}

/**
 * Manages a suspenseful query — the composable AWAITS the first resolution, so a `<script setup>`
 * that awaits it suspends until data is there.
 *
 * ```vue
 * <script setup lang="ts">
 * const { data } = await useAppSuspenseQuery({ key: ['user'], queryFn });
 * </script>
 * ```
 *
 * `@tanstack/vue-query` ships no `useSuspenseQuery` — Vue suspends on an async `setup()` rather than
 * on a thrown promise, so the library exposes `suspense()` on the query result and this awaits it.
 * That makes this composable ASYNC where React's was synchronous, the one shape change the two
 * suspense models force.
 *
 * The caller still owns both boundaries: a `<Suspense>` for loading, and an error boundary for
 * failure — a rejected query rejects this promise and bubbles past the hook.
 */
export async function useAppSuspenseQuery<TRaw, TData = TRaw>({
  key,
  queryFn,
  map,
  meta,
}: AppSuspenseQueryOptions<TRaw, TData>): Promise<AppSuspenseQueryReturn<TData>> {
  const query = useQuery<TRaw, Error, TData, QueryKey>(() => ({
    queryKey: toValue(key),
    queryFn: ({ signal }) => resolveQueryResult(queryFn({ signal })),
    select: map,
    meta,
  }));

  const result = await query.suspense();
  if (result.error) throw result.error; // `suspense()` settles on failure too — rethrow for the boundary

  // `data` is `Ref<TData | undefined>` in general; the await above is what makes it defined here.
  return { data: query.data as Ref<TData>, refetch: query.refetch };
}
