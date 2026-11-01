import type { AppError, Result } from '../foundation/results';
/** Defines the lifecycle phase of the app session state machine. */
export const AuthStatus = {
  /** Refers to a session not yet examined — provider mounted with `resolveOnMount: false`, no action run yet. */
  Unknown: 'unknown',
  /** Refers to an in-flight me-resolve — render a splash/spinner, not the login gate. */
  Resolving: 'resolving',
  /** Refers to a settled, signed-in session carrying a user. */
  Authenticated: 'authenticated',
  /** Refers to a settled, signed-out session. */
  Anonymous: 'anonymous',
} as const;

export type AuthStatus = (typeof AuthStatus)[keyof typeof AuthStatus];

/** Defines a snapshot of the session — `user` is non-null exactly when `status` is `authenticated`. */
export interface AuthSession<TUser = unknown> {
  /** The current machine phase (`unknown → resolving → authenticated | anonymous`). */
  readonly status: AuthStatus;

  /** The signed-in user, or `null` outside `authenticated`. */
  readonly user: TUser | null;
}

/** Defines the call context passed to strategy delegates — forward `signal` to the transport when present. */
export interface AuthResolveContext {
  /** An optional cancellation signal for the underlying request. */
  readonly signal?: AbortSignal;
}

/**
 * Defines what the provider lends a strategy once it runs in a browser: the session to read and watch, and a
 * silent re-read. Absent under SSR — the provider connects from `onMounted`.
 */
export interface AuthStrategyHost<TUser = unknown> {
  /** Reads the current snapshot. */
  readonly getSession: () => AuthSession<TUser>;

  /** Receives every snapshot after it is applied; returns a disposer. */
  readonly subscribe: (listener: (session: AuthSession<TUser>) => void) => () => void;

  /**
   * Re-runs the me-resolve without leaving a settled session for `resolving`, so a background check never
   * unmounts the page. A found user replaces the snapshot; a signed-out answer ends a signed-in session as an
   * expiry; an expected failure keeps the session and reports through `onResolveError`. Resolves cancelled while
   * a sign-in or sign-out runs or after a newer operation.
   */
  readonly revalidate: () => Promise<Result<TUser | null, AppError>>;
}

/**
 * Defines the pluggable transport half of the session — how the current user is resolved,
 * established, and torn down. Ship shapes: `createCookieStrategy` (me-resolve over a cookie
 * session), `createBearerStrategy` (token storage + `getAuthToken` wiring), and
 * `createRedirectStrategy` (sign-in = full-page OAuth redirect), and `createBffStrategy` (a BFF session with
 * CSRF, tab sync and refresh). Any object matching this
 * contract works — write delegates directly for bespoke flows.
 */
export interface AuthStrategy<TUser = unknown, TSignInInput = unknown> {
  /**
   * Resolves the current user — a successful `null` means signed out; an expected failure settles anonymous
   * (reported via the provider's `onResolveError`).
   */
  resolveUser(context: AuthResolveContext): Promise<Result<TUser | null, AppError>>;

  /**
   * Establishes a session. Return a successful user to authenticate immediately; return successful `null`/`void`
   * to leave state unchanged (redirect flows navigate away instead).
   */
  signIn?(
    input: TSignInInput,
    context: AuthResolveContext,
  ): Promise<Result<TUser | null | void, AppError>> | Result<TUser | null | void, AppError>;

  /** Tears the session down (server sign-out, token revoke) — state flips to anonymous regardless. */
  signOut?(context: AuthResolveContext): Promise<Result<void, AppError>> | Result<void, AppError>;

  /** Reacts to a bridged 401 (e.g. clears a stored bearer token) just before the session flips to anonymous. */
  onUnauthorized?(): void;

  /**
   * Starts background work that needs the live session — cross-tab sync, refresh timers, focus checks. The
   * provider calls it once mounted (and again for a replacement strategy), then calls the returned disposer on
   * unmount or replacement.
   */
  connect?(host: AuthStrategyHost<TUser>): () => void;
}
