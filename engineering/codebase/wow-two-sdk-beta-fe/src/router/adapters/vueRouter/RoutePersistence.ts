import type { Router } from 'vue-router';

import { isSafeInternalPath } from './Guards';

/** The default localStorage key the last visited route is stored under. */
const DefaultStorageKey = 'app:lastRoute';

/** Defines options for `installRoutePersistence`. */
export interface RoutePersistenceOptions {
  /** The localStorage key the current route is stored under. */
  readonly storageKey?: string;

  /** Whether to redirect to the saved route on the first navigation when the app opened at its root. */
  readonly restore?: boolean;
}

/**
 * Persists the current route to localStorage on each navigation and, when `restore` is set, sends
 * the first navigation back to the saved route if the app opened at its root. Returns the unregister
 * function.
 *
 * The restore is a `beforeEach` REDIRECT — it lands before the root route ever renders, so there is
 * no flash of the wrong page and no history entry to replace.
 *
 * No-op without a `window` (SSR), and every storage touch is wrapped: `localStorage` throws in
 * private mode and at quota.
 */
export function installRoutePersistence(router: Router, options: RoutePersistenceOptions = {}): () => void {
  if (typeof window === 'undefined') return () => {};

  const { storageKey = DefaultStorageKey, restore = false } = options;

  // Restore fires at most once, on the first navigation — a later return to `/` is a deliberate
  // navigation and must not be hijacked.
  let didRestore = !restore;
  const unregisterRestore = router.beforeEach((to) => {
    if (didRestore) return true;
    didRestore = true;

    const saved = readRoute(storageKey);
    // Only restore when genuinely sitting at the app root — never fight an index redirect that has
    // already moved the app off `/`. The saved value is re-validated as a same-origin root-relative
    // path: localStorage is writable by anything on the origin, so a tampered value (e.g.
    // `//evil.com`) must never reach the router.
    if (saved && to.path === '/' && isNonRootPath(saved) && isSafeInternalPath(saved)) return saved;
    return true;
  });

  const unregisterPersist = router.afterEach((to, _from, failure) => {
    if (failure) return;
    writeRoute(storageKey, to.fullPath);
  });

  return () => {
    unregisterRestore();
    unregisterPersist();
  };
}

/** Reads the saved route from localStorage, tolerating storage being unavailable. */
function readRoute(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes the current route to localStorage, tolerating storage being unavailable (private mode / quota). */
function writeRoute(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — persistence is best-effort, so swallow.
  }
}

/** Determines whether a stored route resolves to a non-root path (ignoring any query string). */
function isNonRootPath(route: string): boolean {
  const [path] = route.split('?');
  return !!path && path !== '/';
}
