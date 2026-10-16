import { CancelledError, MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query';

import { isAbortError } from '../../../foundation/errors';
import { ApiError, type ApiFailure } from '../../../foundation/http';

import { computeRetryDelay, DefaultRetryPolicy, shouldRetry, type RetryPolicy } from '../../../foundation/resilience';

import { toApiFailure } from './QueryOutcome';
import { queryScope } from './QueryLifetime';
import type { RequestScope } from '../../../foundation/http/RequestScope';

const StaleTimeMs = 30_000;
const GcTimeMs = 5 * 60_000;

/** Recognizes vendor cancellation and the transport cancellation failure bridge. */
function isCancellation(error: unknown): boolean {
  return (
    error instanceof CancelledError ||
    isAbortError(error) ||
    (error instanceof ApiError && error.failure.code === 'cancelled')
  );
}

/**
 * The metadata bag a hook's `meta` option attaches to its query/mutation — free-form keys read back
 * by the global error seam. `suppressGlobalError: true` keeps that call's failures out of the
 * global `onError` (per-query opt-out for polling / boundary-handled errors).
 */
export type AppQueryMeta = Record<string, unknown>;

/** Carries the failing query's / mutation's context into the global `onError`. */
export interface QueryErrorContext {
  /** The `meta` attached at the call site, or `undefined` when none was set. */
  readonly meta: AppQueryMeta | undefined;
}

/** Defines options for `createQueryClient`. */
export interface CreateQueryClientOptions {
  /** Optional auth/session lifetime. Invalidation clears private queries and invalidates late callbacks. */
  readonly scope?: RequestScope;
  /**
   * Emits a coerced `ApiFailure` whenever any query or mutation fails. Cancellations and calls whose
   * `meta` sets `suppressGlobalError: true` are skipped; `context.meta` carries the call's `meta`.
   */
  readonly onError?: (error: ApiFailure, context: QueryErrorContext) => void;

  /**
   * The retry policy for transient query failures (backoff · jitter · retryable statuses). Default
   * `DefaultRetryPolicy`. Mutations never retry; `onRetry` is transport-level only — the TanStack
   * retry seam has no pre-retry hook, so it is not invoked here.
   */
  readonly retry?: RetryPolicy;
}

/**
 * Creates the app `QueryClient` — house defaults (30s stale · 5m gc · no focus-refetch · mutations
 * no-retry) + a configurable `RetryPolicy` + global error coercion to `ApiFailure`.
 */
export interface AppQueryClient extends QueryClient {
  /** Clears this client and cancels its current operation generation. */
  readonly invalidateSession: () => void;
  /** Permanently releases this client and its external session subscription. */
  readonly dispose: () => void;
}
export function createQueryClient(options: CreateQueryClientOptions = {}): AppQueryClient {
  const handleError = (error: unknown, meta: AppQueryMeta | undefined): void => {
    if (isCancellation(error)) return;
    if (meta?.suppressGlobalError === true) return;
    options.onError?.(toApiFailure(error), { meta });
  };
  const policy = options.retry ?? DefaultRetryPolicy;

  const client = new QueryClient({
    queryCache: new QueryCache({ onError: (error, query) => handleError(error, query.meta) }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => handleError(error, mutation.meta),
    }),
    defaultOptions: {
      queries: {
        staleTime: StaleTimeMs,
        gcTime: GcTimeMs,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          error instanceof ApiError &&
          ['http', 'transport'].includes(error.failure.code) &&
          shouldRetry(policy, failureCount, error.status),
        retryDelay: (attemptIndex) => computeRetryDelay(policy, attemptIndex + 1),
      },
      mutations: { retry: 0 },
    },
  });
  const scope = queryScope(client);
  const unsubscribe = options.scope?.subscribe(() => {
    if (options.scope?.capture().isCurrent()) scope.invalidate();
    else scope.dispose();
  });
  return Object.assign(client, {
    invalidateSession: scope.invalidate,
    dispose: () => {
      unsubscribe?.();
      scope.dispose();
    },
  });
}
