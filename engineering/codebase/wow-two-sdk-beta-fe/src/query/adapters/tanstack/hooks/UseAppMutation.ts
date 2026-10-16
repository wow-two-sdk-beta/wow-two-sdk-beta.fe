import { queryScope, withinQueryScope, assertQueryCurrent } from '../QueryLifetime';
import type { RequestSnapshot } from '../../../../foundation/http/RequestScope';
import { queryOutcome } from '../QueryOutcome';
import { resolveQueryResult } from '../QueryOutcome';
import type { Result } from '../../../../foundation/results';
import { onScopeDispose, computed, type ComputedRef, type Ref } from 'vue';
import { useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/vue-query';

import type { ApiFailure } from '../../../../foundation/http';

import type { AppQueryMeta } from '../CreateQueryClient';
import { toApiFailure } from '../QueryOutcome';

/** Defines options for `useAppMutation`. */
export interface UseAppMutationOptions<TData, TVars> {
  /** Performs the mutation against the backend. */
  readonly mutationFn: (vars: TVars, context: { readonly signal: AbortSignal }) => Promise<Result<TData, ApiFailure>>;

  /** Query keys to invalidate on success — derived from the vars and the server's returned value. */
  readonly invalidates?: (vars: TVars, data: TData) => ReadonlyArray<QueryKey>;

  /** Reconciles the cache from the server's confirmed result (e.g. `setQueryData`) after invalidation. */
  readonly onConfirmed?: (data: TData, vars: TVars, queryClient: QueryClient) => void;

  /** Metadata for the global `onError` seam — `suppressGlobalError: true` keeps this mutation's failures out. */
  readonly meta?: AppQueryMeta;
}

/** Represents a mutation's slice — state as refs, commands as plain functions. */
export interface UseAppMutationReturn<TData, TVars> {
  /** Fires the mutation, fire-and-forget. */
  readonly mutate: (vars: TVars) => void;

  /** Fires the mutation and resolves with its result. */
  readonly mutateAsync: (vars: TVars) => Promise<Result<TData, ApiFailure>>;

  /** The last successful result. */
  readonly data: Ref<TData | undefined>;

  /** True while the mutation is in flight. */
  readonly loading: Ref<boolean>;

  /** The failure coerced to `ApiFailure`, or `null`. */
  readonly error: ComputedRef<ApiFailure | null>;

  /** Clears the mutation back to idle. */
  readonly reset: () => void;
}

/**
 * Manages a passive mutation — reconciles the cache only from the backend-confirmed result; no
 * optimistic update, no rollback.
 */
export function useAppMutation<TData, TVars>({
  mutationFn,
  invalidates,
  onConfirmed,
  meta,
}: UseAppMutationOptions<TData, TVars>): UseAppMutationReturn<TData, TVars> {
  const queryClient = useQueryClient();

  const scope = queryScope(queryClient);
  const mutation = useMutation<TData, Error, { vars: TVars; origin: RequestSnapshot }>({
    mutationFn: ({ vars, origin }) =>
      withinQueryScope(origin, () => resolveQueryResult(mutationFn(vars, { signal: origin.signal }))),
    meta,
    onSuccess: async (data, { vars, origin }) => {
      assertQueryCurrent(origin);
      const keys = invalidates?.(vars, data) ?? [];
      await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      assertQueryCurrent(origin);
      onConfirmed?.(data, vars, queryClient);
    },
  });

  const unsubscribe = scope.subscribe(mutation.reset);
  onScopeDispose(unsubscribe);
  return {
    mutate: (vars) => mutation.mutate({ vars, origin: scope.capture() }),
    mutateAsync: (vars) => queryOutcome(() => mutation.mutateAsync({ vars, origin: scope.capture() })),
    data: mutation.data,
    loading: mutation.isPending,
    error: computed(() => (mutation.error.value ? toApiFailure(mutation.error.value) : null)),
    reset: mutation.reset,
  };
}
