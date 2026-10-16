import { resolveQueryResult } from '../QueryOutcome';
import type { ApiFailure } from '../../../../foundation/http';
import type { Result } from '../../../../foundation/results';
import { useQueryClient, type QueryClient, type QueryKey } from '@tanstack/vue-query';

/** Defines a prefetch target — a query key paired with its fetcher. */
export interface PrefetchTarget {
  /** The query key to warm — the same key the live query reads. */
  readonly key: QueryKey;

  /** Fetches the data to cache; receives the abort signal the library manages. */
  readonly queryFn: (context: { signal: AbortSignal }) => Promise<Result<unknown, ApiFailure>>;
}

/**
 * Defines the hover/focus listeners to `v-bind` onto a link for data prefetch.
 *
 * `onMouseenter`, not `onMouseEnter`: Vue derives the DOM event name with `hyphenate()`, so a
 * camel-humped `onMouseEnter` key would bind a `mouse-enter` event that never fires.
 */
export interface PrefetchProps {
  /** Warms the target query when the pointer enters the link. */
  readonly onMouseenter: () => void;

  /** Warms the target query when the link gains focus. */
  readonly onFocus: () => void;
}

/** Warms a query's data against a client — a background fetch deduped against the live query. */
function warm(client: QueryClient, { key, queryFn }: PrefetchTarget): void {
  void client.prefetchQuery({ queryKey: key, queryFn: ({ signal }) => resolveQueryResult(queryFn({ signal })) });
}

/** Manages intent-based data prefetch — returns a `prefetch(target)` that warms a query on hover/focus. */
export function usePrefetchQuery(): (target: PrefetchTarget) => void {
  const client = useQueryClient();

  return (target: PrefetchTarget) => warm(client, target);
}

/** Builds hover/focus prefetch listeners. The explicit client isolates app roots and server requests. */
export function prefetchProps(target: PrefetchTarget, client: QueryClient): PrefetchProps {
  const run = (): void => {
    warm(client, target);
  };
  return { onMouseenter: run, onFocus: run };
}
