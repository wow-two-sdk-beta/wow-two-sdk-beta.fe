import type { LazyRoute } from '../RouteConfig';

/** @internal Importers already warmed this session — backs prefetch deduplication. */
const prefetched = new WeakSet<LazyRoute>();

/** Fires a lazy route's dynamic import once to warm its chunk; repeat calls for the same importer are ignored. */
export function prefetch(importer: LazyRoute): void {
  if (prefetched.has(importer)) return;
  prefetched.add(importer);
  void Promise.resolve()
    .then(importer)
    .catch(() => {
      prefetched.delete(importer);
      // Prefetch is best-effort — a failed warm-up is retried by the router's own lazy load on navigation.
    });
}

/**
 * Defines the hover/focus listeners to `v-bind` onto a `<RouterLink>` for intent prefetch.
 *
 * `onMouseenter`, not React's `onMouseEnter`: Vue derives the DOM event name with `hyphenate()`, so
 * a camel-humped `onMouseEnter` key would bind a `mouse-enter` event that never fires.
 */
export interface PrefetchProps {
  /** Warms the target chunk when the pointer enters the link. */
  readonly onMouseenter: () => void;

  /** Warms the target chunk when the link gains focus. */
  readonly onFocus: () => void;
}

/** Builds hover/focus listeners that prefetch a lazy route's chunk on intent — `v-bind` onto a `<RouterLink>`. */
export function prefetchProps(importer: LazyRoute): PrefetchProps {
  const warm = (): void => prefetch(importer);
  return { onMouseenter: warm, onFocus: warm };
}

/** Manages intent-based prefetch — returns a `prefetch(importer)` that warms a lazy chunk exactly once. */
export function usePrefetch(): (importer: LazyRoute) => void {
  return prefetch;
}
