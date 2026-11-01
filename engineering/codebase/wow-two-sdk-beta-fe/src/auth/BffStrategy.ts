import { createApiClient, type ApiAntiforgeryOptions, type ApiClientOptions } from '../foundation/http';
import { AppErrorFactory, ResultExtensions, type AppError, type Result } from '../foundation/results';
import type { SessionExpiredListener } from './AuthBridge';
import type { AuthResolveContext, AuthStrategy, AuthStrategyHost } from './AuthSession';
import { decodeBffLogout, decodeBffSession, type BffUser } from './BffSession';
import { connectBffSession, type BffRefreshOptions, type BffSessionLink, type BffSyncOptions } from './BffSessionSync';
import { ReturnUrlExtensions } from './ReturnUrlExtensions';

/** Defines the options for {@link createBffStrategy}. */
export interface CreateBffStrategyOptions {
  /** The route prefix of the BFF's auth endpoints. Default `/auth`. */
  readonly prefix?: string;

  /** The origin the auth endpoints live on. Default `''`: the SPA's own origin, the BFF's served shape. */
  readonly baseUrl?: string;

  /** The request header the CSRF token travels in. Default `X-Csrf-Token`. */
  readonly csrfHeaderName?: string;

  /** Sent with every auth request. Default is the browser's `same-origin`. */
  readonly credentials?: RequestCredentials;

  /** Replaces `fetch` — a mocked one in tests. */
  readonly fetch?: typeof globalThis.fetch;

  /** Navigates the page. Default `window.location.assign`; inject to drive the strategy without a DOM. */
  readonly navigate?: (url: string) => void;

  /** Cross-tab sync. Default on, over `BroadcastChannel` with a `storage`-event fallback; `false` turns it off. */
  readonly sync?: BffSyncOptions | false;

  /** Session refresh before `expiresAt` and on focus. Default on; `false` turns it off. */
  readonly refresh?: BffRefreshOptions | false;

  /** The clock refresh scheduling reads. Default `Date.now`. */
  readonly now?: () => number;
}

/** Defines the BFF strategy — an {@link AuthStrategy} plus the pieces the rest of the app wires. */
export interface BffStrategy extends AuthStrategy<BffUser, string | undefined> {
  /**
   * Feeds `createApiClient({ antiforgery })`, so every unsafe request echoes the session's CSRF token. The token
   * is read per request, so a refreshed session and a sign-out take effect at once.
   */
  readonly antiforgery: ApiAntiforgeryOptions;

  /** Reads the current CSRF token; `null` while signed out. */
  readonly getCsrfToken: () => string | null;

  /** Builds `{prefix}/login?returnUrl=…` for a local path; a path that is not local falls back to `/`. */
  readonly loginUrl: (returnUrl?: string) => string;

  /**
   * Sends the person to sign-in with the page they were on. Subscribe it to the bridge:
   * `bridge.subscribeExpired(bff.redirectToLogin)`.
   */
  readonly redirectToLogin: SessionExpiredListener;
}

/**
 * Creates the BFF session strategy for an SPA served on its BFF's origin. The BFF owns the session cookie; the SPA
 * reads `GET {prefix}/session`, signs in by navigating to `{prefix}/login?returnUrl=…`, and signs out with
 * `POST {prefix}/logout`, then navigates to the returned `endSessionUrl`.
 *
 * Its own HTTP client carries the auth calls, with no request scope — a sign-out must not cancel itself. The app's
 * client takes {@link BffStrategy.antiforgery} so its writes carry the CSRF token. Pair it with
 * `createAuthBridge({ getIdentity: BffSessionExtensions.identity })`.
 */
export function createBffStrategy(options: CreateBffStrategyOptions = {}): BffStrategy {
  const {
    prefix = '/auth',
    baseUrl = '',
    csrfHeaderName = 'X-Csrf-Token',
    sync = {},
    refresh = {},
    now = () => Date.now(),
  } = options;
  const root = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;

  let csrfToken: string | null = null;
  let generation = 0;
  let link: BffSessionLink | undefined;

  const antiforgery: ApiAntiforgeryOptions = { headerName: csrfHeaderName, getToken: () => csrfToken };
  const clientOptions: ApiClientOptions = {
    baseUrl,
    antiforgery,
    ...(options.credentials !== undefined ? { credentials: options.credentials } : {}),
    ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
  };
  const client = createApiClient(clientOptions);
  const cancelled = () => ResultExtensions.fail(AppErrorFactory.cancelled());

  const navigate =
    options.navigate ??
    ((url: string) => {
      if (typeof window === 'undefined') {
        throw new Error('createBffStrategy: navigating needs a browser. Pass `navigate` to drive it elsewhere.');
      }
      window.location.assign(url);
    });
  const loginUrl = (returnUrl: string = ReturnUrlExtensions.current()): string =>
    `${baseUrl}${root}/login?returnUrl=${encodeURIComponent(ReturnUrlExtensions.isLocal(returnUrl) ? returnUrl : '/')}`;

  return {
    antiforgery,
    getCsrfToken: () => csrfToken,
    loginUrl,
    redirectToLogin: ({ returnUrl }) => navigate(loginUrl(returnUrl)),

    async resolveUser(context: AuthResolveContext): Promise<Result<BffUser | null, AppError>> {
      const current = ++generation;
      const outcome = await client.get(`${root}/session`, { ...context, decode: decodeBffSession });
      if (current !== generation || context.signal?.aborted) return cancelled();
      if (!outcome.ok) {
        // A BFF answers a signed-out `GET /session` with 200; a 401 from a proxy in front still means signed out.
        if (outcome.failure.status !== 401) return outcome;
        csrfToken = null;
        return ResultExtensions.ok(null);
      }
      csrfToken = outcome.value.csrfToken;
      return ResultExtensions.ok(outcome.value.user);
    },

    // Returns void on purpose: the session stays as it is while the browser navigates to the BFF.
    signIn(returnUrl?: string): Result<void, AppError> {
      const target = returnUrl ?? ReturnUrlExtensions.current();
      if (!ReturnUrlExtensions.isLocal(target)) return ResultExtensions.fail(AppErrorFactory.validation());
      if (!options.navigate && typeof window === 'undefined')
        return ResultExtensions.fail(AppErrorFactory.unavailable());
      navigate(loginUrl(target));
      return ResultExtensions.ok(undefined);
    },

    async signOut(context: AuthResolveContext): Promise<Result<void, AppError>> {
      ++generation;
      try {
        // The token is read when the request is sent, so it must outlive the call and clear only afterwards.
        const outcome = await client.post(`${root}/logout`, { ...context, decode: decodeBffLogout });
        if (!outcome.ok) {
          // A 401 means the server session was already gone: signed out either way, with no provider session to end.
          return outcome.failure.status === 401 ? ResultExtensions.ok(undefined) : outcome;
        }
        navigate(outcome.value.endSessionUrl);
        return ResultExtensions.ok(undefined);
      } finally {
        csrfToken = null;
        // Told after the server answered: a hint sent earlier would let a tab read the session before it ended.
        link?.announce('signed-out');
      }
    },

    onUnauthorized(): void {
      generation += 1;
      csrfToken = null;
      link?.announce('signed-out');
    },

    connect(host: AuthStrategyHost<BffUser>): () => void {
      link?.dispose();
      const own = connectBffSession(host, { sync, refresh, now });
      link = own;
      return () => {
        own.dispose();
        if (link === own) link = undefined;
      };
    },
  };
}
