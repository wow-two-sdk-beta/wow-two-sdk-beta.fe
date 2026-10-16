import { AppErrorFactory, ResultExtensions, type AppError, type Result } from '../foundation/results';
import type { AuthResolveContext, AuthStrategy } from './AuthSession';
import { createMemoryTokenStorage, type TokenStorage } from './TokenStorage';

/** Defines the outcome of a bearer credential exchange. */
export interface BearerCredentials<TUser> {
  /** The bearer token stored and sent on subsequent requests. */
  readonly token: string;

  /** The signed-in user the session becomes. */
  readonly user: TUser;
}

/** Defines the options for {@link createBearerStrategy}. */
export interface CreateBearerStrategyOptions<TUser, TSignInInput = unknown> {
  /** Exchanges credentials for a token + user — expected failure is returned for the sign-in form. */
  readonly authenticate: (
    input: TSignInInput,
    context: AuthResolveContext,
  ) => Promise<Result<BearerCredentials<TUser>, AppError>>;

  /** Where the token lives. Default `createMemoryTokenStorage()` — never persisted, a reload requires re-login. */
  readonly tokenStorage?: TokenStorage;

  /**
   * Restores the user behind a persisted token (me-resolve with the token). Without it, a token
   * found on mount is discarded — sessions restore only when the user can be rebuilt.
   */
  readonly resolveUser?: (
    context: AuthResolveContext & { readonly token: string },
  ) => Promise<Result<TUser | null, AppError>>;

  /** An optional server-side revoke called on sign-out — the token clears locally regardless of the outcome. */
  readonly signOut?: (context: AuthResolveContext) => Promise<Result<void, AppError>> | Result<void, AppError>;
}

/** Defines the bearer strategy — an {@link AuthStrategy} plus the `getAuthToken` reader that feeds the api client. */
export interface BearerStrategy<TUser, TSignInInput = unknown> extends AuthStrategy<TUser, TSignInInput> {
  /** Feeds `createApiClient({ getAuthToken })` — re-read per request, so headers reflect the live session. */
  readonly getAuthToken: () => string | null;

  /** The storage behind the strategy — exposed for tests and advanced wiring. */
  readonly tokenStorage: TokenStorage;
}

/**
 * Creates the bearer-token strategy — the token lives in a {@link TokenStorage} delegate
 * (in-memory by default), `signIn` runs the credential exchange, and a bridged 401 clears the
 * token before the session flips to anonymous. Wire the api client with the returned
 * `getAuthToken`. Covers the secrets-vault shape.
 */
export function createBearerStrategy<TUser, TSignInInput = unknown>(
  options: CreateBearerStrategyOptions<TUser, TSignInInput>,
): BearerStrategy<TUser, TSignInInput> {
  const storage = options.tokenStorage ?? createMemoryTokenStorage();

  let generation = 0;
  const cancelled = () => ResultExtensions.fail(AppErrorFactory.cancelled());

  return {
    tokenStorage: storage,
    getAuthToken: () => storage.get(),

    async resolveUser(context: AuthResolveContext): Promise<Result<TUser | null, AppError>> {
      const current = ++generation;
      const token = storage.get();
      if (token == null) return ResultExtensions.ok(null);
      if (!options.resolveUser) {
        storage.set(null);
        return ResultExtensions.ok(null);
      }
      const outcome = await options.resolveUser({ ...context, token });
      if (current !== generation || context.signal?.aborted) return cancelled();
      if (outcome.ok && outcome.value === null && storage.get() === token) storage.set(null);
      return outcome;
    },
    async signIn(input: TSignInInput, context: AuthResolveContext): Promise<Result<TUser, AppError>> {
      const current = ++generation;
      const outcome = await options.authenticate(input, context);
      if (current !== generation || context.signal?.aborted) return cancelled();
      if (!outcome.ok) return outcome;
      storage.set(outcome.value.token);
      return ResultExtensions.ok(outcome.value.user);
    },
    async signOut(context: AuthResolveContext): Promise<Result<void, AppError>> {
      const current = ++generation;
      storage.set(null);
      try {
        return (await options.signOut?.(context)) ?? ResultExtensions.ok(undefined);
      } finally {
        if (current === generation) storage.set(null);
      }
    },
    onUnauthorized(): void {
      generation += 1;
      storage.set(null);
    },
  };
}
