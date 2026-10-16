import type { Router } from 'vue-router';

import { deepestHandleValue, resolveHandleValue } from './RouteHandles';

/** Represents a single page-view event — the resolved pathname and the deepest matched route title. */
export interface PageView {
  /** The pathname navigated to. */
  readonly pathname: string;

  /** The deepest matched route's `handle.title`, when one is set. */
  readonly title?: string;
}

/** Defines options for `installPageViewTracker`. */
export interface PageViewTrackerOptions {
  /** Emits a page-view on the initial navigation and on each subsequent one. */
  readonly onPageView: (view: PageView) => void;
}

/**
 * Emits a page-view (pathname + matched `handle.title`) on every completed navigation. Returns the
 * unregister function.
 *
 * React's null-rendering `<PageViewTracker>` becomes an `afterEach` hook. It also needed a
 * `location.key` guard against StrictMode's double-invoked effect and against revalidations; neither
 * exists here — `afterEach` fires exactly once per settled navigation. A navigation that failed
 * (aborted / redirected away / cancelled) is skipped, so only pages actually shown are reported.
 */
export function installPageViewTracker(router: Router, options: PageViewTrackerOptions): () => void {
  const { onPageView } = options;

  return router.afterEach((to, _from, failure) => {
    if (failure) return;
    onPageView({
      pathname: to.path,
      title: deepestHandleValue(to, (handle) => resolveHandleValue(handle.title, to)),
    });
  });
}
