import { vi } from 'vitest';
import { AuthStatus, type AuthSession, type AuthStrategyHost, type BffUser } from '@src/auth';
import { ResultExtensions as R, type AppError, type Result } from '@src/foundation/results';

export const Minute = 60_000;
export const Anonymous: AuthSession<BffUser> = { status: AuthStatus.Anonymous, user: null };

export function user(expiresInMs: number | null, sub = 'alice'): BffUser {
  return {
    person: { sub, name: null, email: null, phoneNumber: null },
    organization: { id: 'org-1', role: 'admin' },
    permissions: [],
    expiresAt: expiresInMs === null ? null : new Date(Date.now() + expiresInMs).toISOString(),
  };
}
export const signedIn = (value: BffUser): AuthSession<BffUser> => ({ status: AuthStatus.Authenticated, user: value });

export type Revalidate = () => Promise<Result<BffUser | null, AppError>>;

/** A provider stand-in: holds a session, notifies subscribers, and answers `revalidate` as the test scripts it. */
export function fakeHost(initial: AuthSession<BffUser>) {
  let session = initial;
  const listeners = new Set<(session: AuthSession<BffUser>) => void>();
  const host: FakeHost = {
    getSession: () => session,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // Default: the server still holds the same user; applying it republishes the snapshot, as the provider does.
    revalidate: vi.fn<Revalidate>(async () => {
      const found = session.user;
      if (found !== null) host.set(signedIn({ ...found }));
      return R.ok(found);
    }),
    set: (next) => {
      session = next;
      for (const listener of [...listeners]) listener(next);
    },
    listenerCount: () => listeners.size,
  };
  return host;
}
export interface FakeHost extends AuthStrategyHost<BffUser> {
  revalidate: ReturnType<typeof vi.fn<Revalidate>>;
  readonly set: (next: AuthSession<BffUser>) => void;
  readonly listenerCount: () => number;
}
