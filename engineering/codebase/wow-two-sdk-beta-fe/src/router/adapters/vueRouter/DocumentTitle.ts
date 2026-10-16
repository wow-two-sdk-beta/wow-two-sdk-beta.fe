import type { Router } from 'vue-router';

import { deepestHandleValue, resolveHandleValue } from './RouteHandles';

/** Defines options for `installDocumentTitle`. */
export interface DocumentTitleOptions {
  /** The suffix appended after the route title — usually the app name. */
  readonly suffix?: string;
}

/**
 * Syncs `document.title` to the deepest matched route's `handle.title`, plus an optional app suffix.
 * Returns the unregister function.
 *
 * React shipped this as a null-rendering `<DocumentTitle>` the router root mounted; vue-router has no
 * root element, and "run on every navigation" is `afterEach`. `createAppRouter({ titleSuffix })` wires
 * it for you — call this directly only to re-wire it with a different suffix.
 *
 * No-op without a `document` (SSR): `afterEach` DOES run on the server during `router.push`, so the
 * guard is the difference between a rendered page and a `ReferenceError`.
 */
export function installDocumentTitle(router: Router, options: DocumentTitleOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {};

  const { suffix } = options;
  return router.afterEach((to, _from, failure) => {
    if (failure) return;
    // `handle.title` may be a resolver — a `:slug` page's title is not knowable statically. One
    // returning `undefined` falls through to the next-shallowest match, as an absent literal does.
    const title = deepestHandleValue(to, (handle) => resolveHandleValue(handle.title, to));
    document.title = title ? (suffix ? `${title} · ${suffix}` : title) : (suffix ?? document.title);
  });
}
