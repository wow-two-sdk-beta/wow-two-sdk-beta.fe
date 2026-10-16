// returnTo round-trip — capture the page a user wanted before being bounced to login,
// then restore them there after auth.
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { useRoute, type LocationQuery } from 'vue-router';

import type { GuardContext, GuardDecision, RouteGuard } from './RouteConfig';

/** The shapes `resolveReturnTo` reads a `returnTo` out of — a query string, parsed params, or `route.query`. */
export type ReturnToSource = URLSearchParams | string | LocationQuery;

/**
 * Builds a route guard that allows activation when authenticated, else redirects to `loginPath`
 * with the attempted path+search captured as a `returnTo` query param for post-login restore.
 *
 * Takes an `isAuthenticated` callback so the check stays app-owned — pass a stub today, swap the
 * real one in later without touching any route.
 *
 * @example
 * const isAuthenticated = () => Boolean(localStorage.getItem('token'));
 * // { path: '/library', guard: requireAuth(isAuthenticated), lazy: … }
 */
export function requireAuth(isAuthenticated: () => boolean | Promise<boolean>, loginPath = '/login'): RouteGuard {
  return async (context: GuardContext): Promise<GuardDecision> => {
    if (await isAuthenticated()) return true;
    // vue-router hands guards a normalized location, not a `Request` — `fullPath` is already
    // `pathname + search + hash`.
    return { redirect: buildReturnTo(loginPath, context.to.fullPath) };
  };
}

/**
 * Builds a login redirect (`{loginPath}?returnTo=…`) encoding the attempted path+search.
 * `from` accepts a full URL or a root-relative `fullPath`.
 */
export function buildReturnTo(loginPath: string, from: string): string {
  return `${loginPath}?returnTo=${encodeURIComponent(toPathAndSearch(from))}`;
}

/** Resolves the safe same-origin return path from a `returnTo` param, rejecting open-redirect targets → `fallback`. */
export function resolveReturnTo(search: ReturnToSource, fallback = '/'): string {
  const target = readReturnTo(search);
  if (target === null) return fallback;
  return isSafeInternalPath(target) ? target : fallback;
}

/**
 * Provides access to the safe post-login return path read from the current URL's `returnTo` param.
 *
 * Returns a `ComputedRef`, not a bare string — the value has to track `route.query`.
 */
export function useReturnTo(fallback: MaybeRefOrGetter<string> = '/'): ComputedRef<string> {
  const route = useRoute();
  return computed(() => resolveReturnTo(route.query, toValue(fallback)));
}

/** @internal Reads the raw `returnTo` value out of any supported source, or `null` when absent. */
function readReturnTo(search: ReturnToSource): string | null {
  if (typeof search === 'string') return new URLSearchParams(search).get('returnTo');
  if (search instanceof URLSearchParams) return search.get('returnTo');
  const value = search.returnTo;
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/** @internal Reduces a full (or root-relative) URL to its `pathname + search`, dropping any origin. */
function toPathAndSearch(from: string): string {
  const url = new URL(from, 'http://localhost');
  return url.pathname + url.search;
}

/** @internal Reports whether a target is a same-origin root-relative path — the open-redirect guard. */
export function isSafeInternalPath(target: string): boolean {
  if (!target.startsWith('/')) return false; // must be root-relative (rejects http:, https:, bare paths)
  if (target.startsWith('//')) return false; // protocol-relative → external host
  if (target.includes('\\')) return false; // '\' → browsers may normalize to '/' (e.g. '/\evil' → '//evil')
  // Control chars (incl. \t \n \r that browsers strip) can smuggle a bypass past the checks above.
  if ([...target].some((ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) === 0x7f)) return false;
  return true;
}
