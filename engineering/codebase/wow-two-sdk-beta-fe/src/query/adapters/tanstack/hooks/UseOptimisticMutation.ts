import { queryScope, withinQueryScope, assertQueryCurrent } from '../QueryLifetime';
import type { RequestSnapshot } from '../../../../foundation/http/RequestScope';
import { runOptimisticTransaction } from '../OptimisticTransactions';
import { queryOutcome } from '../QueryOutcome';
import { resolveQueryResult } from '../QueryOutcome';
import type { ApiFailure } from '../../../../foundation/http';
import type { Result } from '../../../../foundation/results';
import { onScopeDispose, computed } from 'vue';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/vue-query';

import type { Endpoint } from '../Endpoints';
import { toApiFailure } from '../QueryOutcome';
import type { UseAppMutationReturn } from './UseAppMutation';

/** Defines one cached query an optimistic mutation patches — where it lives and how it changes. */
export interface OptimisticTarget<TVars, TCached = unknown> {
  /** Locates the cached entry to patch — a query key, or an endpoint def (patched at its `key`). */
  readonly key: QueryKey | Endpoint<TCached>;

  /**
   * Produces the next cached value from the current one and the mutation vars — pure, no side effects.
   * `current` is `undefined` when the key holds no data yet; returning a value then seeds the entry
   * (and rollback removes the seed).
   */
  // Method syntax on purpose: its bivariant parameters let targets of different `TCached` shapes
  // (each annotating its own `current`) share one `targets` array typed `ReadonlyArray<OptimisticTarget<TVars>>`.
  apply(current: TCached | undefined, vars: TVars): TCached;
}

/** Defines options for `useOptimisticMutation`. */
export interface UseOptimisticMutationOptions<TData, TVars> {
  /** Performs the mutation against the backend. */
  readonly mutationFn: (vars: TVars, context: { readonly signal: AbortSignal }) => Promise<Result<TData, ApiFailure>>;

  /**
   * The cached queries this mutation patches — each is cancelled, snapshotted, and applied before
   * the request fires, then rolled back on error.
   */
  readonly targets: ReadonlyArray<OptimisticTarget<TVars>>;

  /**
   * Invalidates every target key once the mutation settles (success or error) so the server truth
   * reconciles the patch — `true` when omitted.
   */
  readonly invalidateOnSettle?: boolean;
}

/** A per-target snapshot taken before the patch — the unit of rollback. */
interface TargetSnapshot {
  readonly queryKey: QueryKey;
  readonly previous: unknown;
}

/** Resolves a target locator to its query key — unwraps an endpoint def, passes a bare key through. */
function resolveKey(key: QueryKey | Endpoint<unknown>): QueryKey {
  return 'queryFn' in key ? key.key : key;
}

/**
 * Manages an optimistic mutation — cancel + snapshot + patch every target on mutate, roll the
 * patches back on error, reconcile with the server on settle. Transactions serialize per client
 * through reconciliation, preventing an older rollback from erasing a later write. Independent
 * clients remain independent. Target apply functions must be pure; `useAppMutation` is the passive default.
 */
export function useOptimisticMutation<TData, TVars>({
  mutationFn,
  targets,
  invalidateOnSettle = true,
}: UseOptimisticMutationOptions<TData, TVars>): UseAppMutationReturn<TData, TVars> {
  const queryClient = useQueryClient();

  const scope = queryScope(queryClient);
  const mutation = useMutation<TData, Error, { vars: TVars; origin: RequestSnapshot }>({
    mutationFn: ({ vars, origin }) =>
      withinQueryScope(origin, () =>
        runOptimisticTransaction(queryClient, async () => {
          assertQueryCurrent(origin);
          const keys = targets.map((target) => resolveKey(target.key));
          await Promise.all(keys.map((queryKey) => queryClient.cancelQueries({ queryKey, exact: true })));
          assertQueryCurrent(origin);
          const snapshots: TargetSnapshot[] = [];
          try {
            for (const target of targets) {
              const queryKey = resolveKey(target.key);
              const previous = queryClient.getQueryData(queryKey);
              snapshots.push({ queryKey, previous });
              queryClient.setQueryData(queryKey, () => target.apply(previous, vars));
            }
            return await withinQueryScope(origin, () =>
              resolveQueryResult(mutationFn(vars, { signal: origin.signal })),
            );
          } catch (error) {
            // Reverse order also restores duplicate targets to the transaction's initial value.
            if (!origin.isCurrent()) throw error;
            for (const { queryKey, previous } of [...snapshots].reverse()) {
              if (previous === undefined) queryClient.removeQueries({ queryKey, exact: true });
              else queryClient.setQueryData(queryKey, () => previous);
            }
            throw error;
          } finally {
            // The transaction stays locked through reconciliation; the next snapshot sees settled data.
            if (origin.isCurrent() && invalidateOnSettle)
              await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey, exact: true })));
          }
        }),
      ),
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
