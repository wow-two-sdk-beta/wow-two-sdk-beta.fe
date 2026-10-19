import { createRequestScope, type RequestScope, type RequestSnapshot } from '../foundation/http/RequestScope';
import { AuthStatus, type AuthSession } from './AuthSession';

export type UnauthorizedListener = (error?: unknown) => void;
export type SessionListener<TUser = unknown> = (session: AuthSession<TUser>) => void;

/** The one expiry of a signed-in session: the app signs out and asks for sign-in again. */
export interface SessionExpiry {
  /** Where sign-in returns to: `getReturnUrl()`, else the browser's `path + search + hash` at expiry. */
  readonly returnUrl: string;
  /** The 401 failure, or the reason the auth module passed to `expire`. */
  readonly error?: unknown;
}
export type SessionExpiredListener = (expiry: SessionExpiry) => void;

/** A mounted provider's ownership lease; old owners cannot publish or detach their replacement. */
export interface AuthBridgeOwner<TUser> {
  readonly publishSession: (session: AuthSession<TUser>) => void;
  readonly subscribeUnauthorized: (listener: UnauthorizedListener) => () => void;
  readonly detach: () => void;
}
/** Explicit session wiring shared by HTTP, query clients, guards and the auth provider. */
export interface AuthBridge<TUser = unknown> {
  readonly scope: RequestScope;
  readonly attach: () => AuthBridgeOwner<TUser>;
  /** Routes a 401: a signed-in session expires once, an unsettled resolve settles anonymous, the rest is swallowed. */
  readonly onUnauthorized: (error?: unknown, origin?: RequestSnapshot) => void;
  /** Expires a signed-in session once — the auth module's own signal; a no-op while signed out. */
  readonly expire: (error?: unknown) => void;
  readonly isAuthenticated: (signal?: AbortSignal) => Promise<boolean>;
  readonly getSession: () => AuthSession<TUser>;
  readonly publishSession: (session: AuthSession<TUser>) => void;
  readonly subscribeUnauthorized: (listener: UnauthorizedListener) => () => void;
  readonly subscribeSession: (listener: SessionListener<TUser>) => () => void;
  /** Receives each expiry after the session settled anonymous and its scope was invalidated. */
  readonly subscribeExpired: (listener: SessionExpiredListener) => () => void;
}
export interface AuthBridgeOptions<TUser> {
  /** Stable user/tenant identity. Omitted compares user identity with Object.is. */
  readonly getIdentity?: (user: TUser) => unknown;
  readonly scope?: RequestScope;
  /** Reads the return location at expiry. Omitted reads `window.location`, or `/` without a browser. */
  readonly getReturnUrl?: () => string;
}
function isSettled(session: AuthSession<unknown>): boolean {
  return session.status === AuthStatus.Authenticated || session.status === AuthStatus.Anonymous;
}
function browserLocation(): string {
  if (typeof window === 'undefined') return '/';
  const { pathname, search, hash } = window.location;
  return pathname + search + hash;
}
/** Creates an app-owned bridge. No session/cache/credential state is shared between apps or SSR requests. */
export function createAuthBridge<TUser = unknown>(options: AuthBridgeOptions<TUser> = {}): AuthBridge<TUser> {
  const scope = options.scope ?? createRequestScope();
  let session: AuthSession<TUser> = { status: AuthStatus.Unknown, user: null };
  const anonymous = Symbol('anonymous');
  let identity: unknown = anonymous;
  let owner: symbol | undefined;
  const unauthorizedListeners = new Set<UnauthorizedListener>();
  const sessionListeners = new Set<SessionListener<TUser>>();
  const expiredListeners = new Set<SessionExpiredListener>();
  const waiters = new Set<(authenticated: boolean) => void>();
  const publish = (next: AuthSession<TUser>, invalidate = true): void => {
    const nextIdentity =
      next.status === AuthStatus.Authenticated
        ? options.getIdentity
          ? options.getIdentity(next.user as TUser)
          : next.user
        : next.status === AuthStatus.Anonymous || next.status === AuthStatus.Unknown
          ? anonymous
          : identity;
    const changed = !Object.is(identity, nextIdentity);
    identity = nextIdentity;
    session = next;
    const failures: unknown[] = [];
    if (changed && invalidate) {
      try {
        scope.invalidate();
      } catch (error) {
        failures.push(error);
      }
    }
    for (const listener of [...sessionListeners]) {
      try {
        listener(next);
      } catch (error) {
        failures.push(error);
      }
    }
    if (isSettled(next)) {
      for (const waiter of [...waiters]) waiter(next.status === AuthStatus.Authenticated);
      waiters.clear();
    }
    if (failures.length) throw new AggregateError(failures, 'A session listener failed.');
  };
  const subscribeUnauthorized = (listener: UnauthorizedListener): (() => void) => {
    unauthorizedListeners.add(listener);
    return () => {
      unauthorizedListeners.delete(listener);
    };
  };
  const fanOut = <T>(listeners: ReadonlySet<(value: T) => void>, value: T, failures: unknown[]): void => {
    for (const listener of [...listeners]) {
      try {
        listener(value);
      } catch (failure) {
        failures.push(failure);
      }
    }
  };
  // The identity latch makes expiry single-shot: the first call settles anonymous, later calls find no session;
  // `expiring` holds the latch while listeners re-enter.
  let expiring = false;
  const expire = (error?: unknown): void => {
    if (expiring || identity === anonymous) return;
    expiring = true;
    const failures: unknown[] = [];
    try {
      const returnUrl = (options.getReturnUrl ?? browserLocation)();
      // A provider clears strategy credentials and settles first; a bare bridge settles itself.
      fanOut(unauthorizedListeners, error, failures);
      if (identity !== anonymous) {
        try {
          publish({ status: AuthStatus.Anonymous, user: null });
        } catch (failure) {
          failures.push(failure);
        }
      }
      fanOut(expiredListeners, { returnUrl, error }, failures);
    } finally {
      expiring = false;
    }
    if (failures.length) throw new AggregateError(failures, 'A session expiry listener failed.');
  };
  return {
    scope,
    attach: () => {
      const token = Symbol('auth-owner');
      if (owner || session.status !== AuthStatus.Unknown) {
        try {
          scope.invalidate();
        } finally {
          publish({ status: AuthStatus.Unknown, user: null }, false);
        }
      }
      owner = token;
      return {
        publishSession: (next) => {
          if (owner === token) publish(next);
        },
        subscribeUnauthorized: (listener) =>
          subscribeUnauthorized((error) => {
            if (owner === token) listener(error);
          }),
        detach: () => {
          if (owner !== token) return;
          owner = undefined;
          try {
            scope.invalidate();
          } finally {
            publish({ status: AuthStatus.Anonymous, user: null }, false);
          }
        },
      };
    },
    onUnauthorized: (error, origin) => {
      if (origin && !origin.isCurrent()) return;
      if (identity !== anonymous) return expire(error);
      if (session.status === AuthStatus.Anonymous) return;
      const failures: unknown[] = [];
      fanOut(unauthorizedListeners, error, failures);
      if (failures.length) throw new AggregateError(failures, 'An authentication listener failed.');
    },
    expire,
    isAuthenticated: (signal) => {
      if (signal?.aborted) return Promise.resolve(false);
      if (isSettled(session)) return Promise.resolve(session.status === AuthStatus.Authenticated);
      return new Promise<boolean>((resolve) => {
        const finish = (value: boolean): void => {
          waiters.delete(finish);
          signal?.removeEventListener('abort', abort);
          resolve(value);
        };
        const abort = (): void => finish(false);
        waiters.add(finish);
        signal?.addEventListener('abort', abort, { once: true });
      });
    },
    getSession: () => session,
    publishSession: publish,
    subscribeUnauthorized,
    subscribeSession: (listener) => {
      sessionListeners.add(listener);
      return () => {
        sessionListeners.delete(listener);
      };
    },
    subscribeExpired: (listener) => {
      expiredListeners.add(listener);
      return () => {
        expiredListeners.delete(listener);
      };
    },
  };
}
