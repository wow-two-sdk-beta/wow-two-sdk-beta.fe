import { ResultExtensions, type AppError, type Result } from '../foundation/results';
import { type ApiClient, type ApiDecoder } from '../foundation/http';

import type { AuthResolveContext, AuthStrategy } from './AuthSession';

/** Defines the slice of `ApiClient` the cookie strategy calls — any object with `get`/`post` fits, fakes included. */
export type CookieAuthClient = Pick<ApiClient, 'get' | 'post'>;

/** Defines the context passed to a cookie strategy's custom `signIn` delegate. */
export interface CookieSignInContext extends AuthResolveContext {
  /** The strategy's HTTP client — call sign-in endpoints (guest creation, token exchange) through it. */
  readonly client: CookieAuthClient;
}

/** Defines the options for {@link createCookieStrategy}. */
export interface CreateCookieStrategyOptions<TUser, TSignInInput = unknown> {
  /** The HTTP client the strategy calls — the app's `createApiClient`, same-origin or `credentials: 'include'`. */
  readonly client: CookieAuthClient;

  /** Validates and decodes the user payload at the transport edge. */
  readonly decodeUser: ApiDecoder<TUser>;

  /** The me-resolve endpoint (GET). Default `/api/identity/me` — the backend SDK identity baseline. */
  readonly mePath?: string;

  /** The sign-out endpoint (POST). Default `/api/identity/sign-out`; `null` skips it and clears locally only. */
  readonly signOutPath?: string | null;

  /** Treats a 200 me-response as signed out (guest gate). Default: every resolved user is authenticated. */
  readonly isAnonymous?: (user: TUser) => boolean;

  /** A custom sign-in exchange (guest creation, password post, ID-token swap) — return the user to authenticate. */
  readonly signIn?: (
    input: TSignInInput,
    context: CookieSignInContext,
  ) => Promise<Result<TUser | null | void, AppError>> | Result<TUser | null | void, AppError>;
}

/**
 * Creates the cookie-session strategy — the session cookie is owned by the backend; the client
 * only resolves `GET {mePath}` on mount (401 → anonymous, other failures settle anonymous and are
 * reported) and posts `{signOutPath}` on sign-out. Covers the wheelhouse and smart-qr shapes; pair
 * with `isAnonymous`/`signIn` for guest gates, or use `createRedirectStrategy` for OAuth sign-in.
 */
export function createCookieStrategy<TUser, TSignInInput = unknown>(
  options: CreateCookieStrategyOptions<TUser, TSignInInput>,
): AuthStrategy<TUser, TSignInInput> {
  const { client, mePath = '/api/identity/me', signOutPath = '/api/identity/sign-out', isAnonymous, signIn } = options;

  const strategy: AuthStrategy<TUser, TSignInInput> = {
    async resolveUser(context: AuthResolveContext): Promise<Result<TUser | null, AppError>> {
      const outcome = await client.get(mePath, { ...context, decode: options.decodeUser });
      if (!outcome.ok) return outcome.failure.status === 401 ? ResultExtensions.ok(null) : outcome;
      return ResultExtensions.ok(isAnonymous?.(outcome.value) ? null : outcome.value);
    },
    async signOut(context: AuthResolveContext): Promise<Result<void, AppError>> {
      if (signOutPath === null) return ResultExtensions.ok(undefined);
      return client.post(signOutPath, { ...context, response: 'empty' });
    },
  };

  if (signIn) {
    strategy.signIn = (input: TSignInInput, context: AuthResolveContext) => signIn(input, { ...context, client });
  }

  return strategy;
}
