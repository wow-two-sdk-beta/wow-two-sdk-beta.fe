import { describe, expect, it } from 'vitest';
import { AuthStatus, createAuthBridge, createMemoryTokenStorage } from '@src/auth';

/*
 * Smoke depth, `unit` project (node). `AuthProvider` is an SFC and is already swept by the
 * providers smoke tier; what has no coverage at all is the PLUMBING under it — the bridge the
 * api client, the router guards, and the provider all share.
 *
 * The bridge's defining contract is that it is safe to call with NO provider mounted: the api
 * client is constructed at module scope and may fire a 401 before anything has rendered, so
 * `onUnauthorized` on a bare bridge has to be a no-op rather than a crash.
 */

describe('createMemoryTokenStorage', () => {
  it('round-trips a token and starts empty', () => {
    const storage = createMemoryTokenStorage();

    expect(storage.get()).toBeNull();
    storage.set('token-abc');
    expect(storage.get()).toBe('token-abc');
  });

  it('clears on null', () => {
    const storage = createMemoryTokenStorage();
    storage.set('token-abc');
    storage.set(null);

    expect(storage.get()).toBeNull();
  });

  it('keeps two storages independent', () => {
    const first = createMemoryTokenStorage();
    const second = createMemoryTokenStorage();
    first.set('mine');

    expect(second.get()).toBeNull();
  });
});

describe('createAuthBridge', () => {
  it('is inert with no listener attached', () => {
    expect(() => createAuthBridge().onUnauthorized(new Error('401'))).not.toThrow();
  });

  it('reports an unknown session until a provider publishes one', () => {
    expect(createAuthBridge().getSession().status).toBe(AuthStatus.Unknown);
  });

  it('fans a 401 out to its subscribers, and stops on unsubscribe', () => {
    const bridge = createAuthBridge();
    const seen: unknown[] = [];
    const unsubscribe = bridge.subscribeUnauthorized((error) => seen.push(error));

    bridge.onUnauthorized('first');
    unsubscribe();
    bridge.onUnauthorized('second');

    expect(seen).toEqual(['first']);
  });

  it('publishes a session snapshot to its subscribers and to `getSession`', () => {
    const bridge = createAuthBridge<{ id: string }>();
    const seen: string[] = [];
    bridge.subscribeSession((session) => seen.push(session.status));

    bridge.publishSession({ status: AuthStatus.Authenticated, user: { id: 'u1' } });

    expect(seen).toEqual([AuthStatus.Authenticated]);
    expect(bridge.getSession().status).toBe(AuthStatus.Authenticated);
  });

  it('waits for an unsettled session before answering isAuthenticated', async () => {
    const bridge = createAuthBridge<{ id: string }>();
    const verdict = bridge.isAuthenticated();

    bridge.publishSession({ status: AuthStatus.Anonymous, user: null });

    await expect(verdict).resolves.toBe(false);
  });

  it('answers immediately once the session has settled', async () => {
    const bridge = createAuthBridge<{ id: string }>();
    bridge.publishSession({ status: AuthStatus.Authenticated, user: { id: 'u1' } });

    await expect(bridge.isAuthenticated()).resolves.toBe(true);
  });
});
