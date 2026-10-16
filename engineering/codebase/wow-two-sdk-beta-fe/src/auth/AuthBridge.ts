import { createRequestScope, type RequestScope, type RequestSnapshot } from '../foundation/http/RequestScope';
import { AuthStatus, type AuthSession } from './AuthSession';

export type UnauthorizedListener = (error?: unknown) => void;
export type SessionListener<TUser = unknown> = (session: AuthSession<TUser>) => void;

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
  readonly onUnauthorized: (error?: unknown, origin?: RequestSnapshot) => void;
  readonly isAuthenticated: (signal?: AbortSignal) => Promise<boolean>;
  readonly getSession: () => AuthSession<TUser>;
  readonly publishSession: (session: AuthSession<TUser>) => void;
  readonly subscribeUnauthorized: (listener: UnauthorizedListener) => () => void;
  readonly subscribeSession: (listener: SessionListener<TUser>) => () => void;
}
export interface AuthBridgeOptions<TUser> {
  /** Stable user/tenant identity. Omitted compares user identity with Object.is. */
  readonly getIdentity?: (user: TUser) => unknown;
  readonly scope?: RequestScope;
}
function isSettled(session: AuthSession<unknown>): boolean {
  return session.status === AuthStatus.Authenticated || session.status === AuthStatus.Anonymous;
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
      if ((origin && !origin.isCurrent()) || session.status === AuthStatus.Anonymous) return;
      const failures: unknown[] = [];
      for (const listener of [...unauthorizedListeners]) {
        try {
          listener(error);
        } catch (failure) {
          failures.push(failure);
        }
      }
      if (failures.length) throw new AggregateError(failures, 'An authentication listener failed.');
    },
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
  };
}
