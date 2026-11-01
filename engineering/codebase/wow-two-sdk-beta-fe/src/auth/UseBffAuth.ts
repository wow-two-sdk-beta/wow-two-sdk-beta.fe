import type { AppError, Result } from '../foundation/results';
import type { AuthStatus } from './AuthSession';
import { BffSessionExtensions, type BffOrganization, type BffPerson, type BffUser } from './BffSession';
import { useAuth } from './providers/AuthContext';

/**
 * Defines the session API of a BFF app, returned by {@link useBffAuth}. Every member reads the provider's session
 * live, as {@link AuthApi} does — bind to the object (`bff.person`, `bff.hasPermission('x')`) in a template or a
 * `computed`; destructuring takes a one-time copy.
 */
export interface BffAuthApi {
  readonly status: AuthStatus;
  readonly isAuthenticated: boolean;
  /** Whether the session has not settled yet — render a splash, not the sign-in gate. */
  readonly isPending: boolean;
  readonly user: BffUser | null;
  readonly person: BffPerson | null;
  readonly organization: BffOrganization | null;
  /** The role in the current organization; `null` while signed out or in no organization. */
  readonly role: string | null;
  /** The granted permissions; empty while signed out. */
  readonly permissions: readonly string[];
  /** Whether the session grants `permission`. A UX decision only — the BFF authorizes every request. */
  hasPermission(permission: string): boolean;
  /** Navigates to the BFF sign-in with the current page (or `returnUrl`) as the destination. */
  signIn(returnUrl?: string): Promise<Result<BffUser | null, AppError>>;
  /** Signs out through the BFF, then navigates to the identity provider's end-session URL. */
  signOut(): Promise<Result<void, AppError>>;
  /** Re-reads the session, through `resolving`. */
  refresh(): Promise<Result<BffUser | null, AppError>>;
}

/** Accesses the session of a BFF app. Must be used within an `AuthProvider` running {@link createBffStrategy}. */
export function useBffAuth(): BffAuthApi {
  const auth = useAuth<BffUser, string | undefined>();
  return {
    get status() {
      return auth.status;
    },
    get isAuthenticated() {
      return auth.isAuthenticated;
    },
    get isPending() {
      return auth.isPending;
    },
    get user() {
      return auth.user;
    },
    get person() {
      return auth.user?.person ?? null;
    },
    get organization() {
      return auth.user?.organization ?? null;
    },
    get role() {
      return auth.user?.organization?.role ?? null;
    },
    get permissions() {
      return auth.user?.permissions ?? [];
    },
    hasPermission: (permission) => BffSessionExtensions.hasPermission(auth.user, permission),
    signIn: (returnUrl) => auth.signIn(returnUrl),
    signOut: () => auth.signOut(),
    refresh: () => auth.refresh(),
  };
}
