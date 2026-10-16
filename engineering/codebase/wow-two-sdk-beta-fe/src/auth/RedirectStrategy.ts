import { AppErrorFactory, ResultExtensions, type AppError, type Result } from '../foundation/results';
import type { AuthStrategy } from './AuthSession';
import { createCookieStrategy, type CreateCookieStrategyOptions } from './CookieStrategy';

/** Defines the options for {@link createRedirectStrategy}. */
export interface CreateRedirectStrategyOptions<TUser> extends Omit<
  CreateCookieStrategyOptions<TUser, never>,
  'signIn'
> {
  /** The sign-in challenge endpoint the browser navigates to. Default `/api/identity/sign-in` (SDK baseline). */
  readonly signInPath?: string;

  /** The query param carrying the post-login return path. Default `returnUrl` (the wheelhouse shape). */
  readonly returnUrlParam?: string;

  /** Builds the full challenge URL from the return path — overrides `signInPath` + `returnUrlParam` entirely. */
  readonly buildSignInUrl?: (returnUrl: string) => string;

  /** Navigates. Default `window.location.assign` — inject to drive the strategy without a DOM in tests. */
  readonly navigate?: (url: string) => void;
}

/**
 * Reads the current location as the default return path.
 *
 * SSR-safe: `createRedirectStrategy` is built at module scope in an app, so this module is imported
 * on the server. There is no location there, so a bare `/` stands in rather than letting
 * `window.location` throw a bare `ReferenceError`.
 */
function currentPath(): string {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname + window.location.search;
}

/**
 * Creates the external-redirect OAuth strategy — a cookie session whose `signIn(returnUrl?)`
 * navigates the browser to the backend's sign-in challenge (`{signInPath}?{returnUrlParam}=…`);
 * the OAuth callback is handled server-side, which sets the cookie and redirects back. `returnUrl`
 * defaults to the current `pathname + search`. Covers the wheelhouse shape.
 *
 * Construction is SSR-safe — every browser global is read inside `signIn`, never at factory time —
 * but `signIn` itself is a browser-only operation, and says so with a real message instead of a
 * bare `ReferenceError` if it is ever reached on the server.
 */
export function createRedirectStrategy<TUser>(
  options: CreateRedirectStrategyOptions<TUser>,
): AuthStrategy<TUser, string | undefined> {
  const {
    signInPath = '/api/identity/sign-in',
    returnUrlParam = 'returnUrl',
    buildSignInUrl,
    navigate,
    ...cookieOptions
  } = options;

  const base = createCookieStrategy<TUser, never>(cookieOptions);
  const buildUrl =
    buildSignInUrl ?? ((returnUrl: string) => `${signInPath}?${returnUrlParam}=${encodeURIComponent(returnUrl)}`);
  const doNavigate =
    navigate ??
    ((url: string) => {
      // A full-page redirect needs a browser. Reaching this on the server means `signIn` was called
      // from a render rather than a user action — fail loudly, since silently dropping a sign-in
      // leaves the session stuck with no signal at all. Pass `navigate` to drive it in a test.
      if (typeof window === 'undefined') {
        throw new Error(
          'createRedirectStrategy: signIn needs a browser to navigate. Pass `navigate` to drive it elsewhere.',
        );
      }
      window.location.assign(url);
    });

  return {
    // Closure-based delegates off the cookie strategy — no `this`, safe to re-home.
    resolveUser: base.resolveUser,
    signOut: base.signOut,

    // Returns void on purpose: the session state stays as-is while the browser navigates away.
    signIn(returnUrl?: string): Result<void, AppError> {
      const target = returnUrl ?? currentPath();
      if (
        !buildSignInUrl &&
        (!target.startsWith('/') ||
          target.startsWith('//') ||
          [...target].some((character) => character === '\\' || character.charCodeAt(0) < 32))
      ) {
        return ResultExtensions.fail(AppErrorFactory.validation());
      }
      if (!navigate && typeof window === 'undefined') return ResultExtensions.fail(AppErrorFactory.unavailable());
      doNavigate(buildUrl(target));
      return ResultExtensions.ok(undefined);
    },
  };
}
