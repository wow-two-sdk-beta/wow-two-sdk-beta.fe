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
 * Defines the pluggable transport half of the session — how the current user is resolved,
 * established, and torn down. Ship shapes: `createCookieStrategy` (me-resolve over a cookie
 * session), `createBearerStrategy` (token storage + `getAuthToken` wiring), and
 * `createRedirectStrategy` (sign-in = full-page OAuth redirect). Any object matching this
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
}
