import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, AuthStatus, createAuthBridge, useAuth, type AuthApi } from '@src/auth';
import { createApiClient } from '@src/foundation/http';
import { ResultExtensions as R } from '@src/foundation/results';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { resolve, promise };
}

describe('auth bridge ownership', () => {
  it('invalidates exactly once per identity change and keeps refreshes within their identity', () => {
    const bridge = createAuthBridge<{ id: string; name: string }>({ getIdentity: (user) => user.id });
    const invalidate = vi.fn();
    bridge.scope.subscribe(invalidate);
    bridge.publishSession({ status: AuthStatus.Authenticated, user: { id: 'a', name: 'A' } });
    bridge.publishSession({ status: AuthStatus.Resolving, user: null });
    bridge.publishSession({ status: AuthStatus.Authenticated, user: { id: 'a', name: 'Updated' } });
    expect(invalidate).toHaveBeenCalledTimes(1);
    bridge.publishSession({ status: AuthStatus.Authenticated, user: { id: 'b', name: 'B' } });
    bridge.publishSession({ status: AuthStatus.Anonymous, user: null });
    bridge.publishSession({ status: AuthStatus.Anonymous, user: null });
    expect(invalidate).toHaveBeenCalledTimes(3);
  });

  it('detaches only its own provider and settles unresolved guards on teardown', async () => {
    const bridge = createAuthBridge<string>();
    const first = bridge.attach();
    first.publishSession({ status: AuthStatus.Authenticated, user: 'alice' });
    const second = bridge.attach();
    const waiting = bridge.isAuthenticated();
    first.detach();
    first.publishSession({ status: AuthStatus.Authenticated, user: 'old' });
    expect(bridge.getSession().status).toBe(AuthStatus.Unknown);
    second.detach();
    expect(await waiting).toBe(false);
    expect(bridge.getSession()).toEqual({ status: AuthStatus.Anonymous, user: null });
  });

  it('supports cancelling an unresolved guard without changing the app session', async () => {
    const bridge = createAuthBridge();
    const abort = new AbortController();
    const waiting = bridge.isAuthenticated(abort.signal);
    abort.abort();
    expect(await waiting).toBe(false);
    expect(bridge.getSession().status).toBe(AuthStatus.Unknown);
  });

  it('keeps Bob authenticated when an Alice request returns 401 and detaches on provider disposal', async () => {
    const bridge = createAuthBridge<string>();
    let auth!: AuthApi<string, string>;
    const Child = defineComponent({
      setup() {
        auth = useAuth<string, string>();
        return () => null;
      },
    });
    const wrapper = mount(AuthProvider<string, string>, {
      props: { bridge, canResolveOnMount: false, strategy: { resolveUser: async () => R.ok(null) } },
      slots: { default: () => h(Child) },
    });
    auth.setUser('alice');
    const pending = deferred<Response>();
    const client = createApiClient({
      scope: bridge.scope,
      onUnauthorized: bridge.onUnauthorized,
      fetch: vi.fn().mockReturnValue(pending.promise),
    });
    const old = client.get('/alice');
    await flushPromises();
    auth.setUser('bob');
    pending.resolve(new Response(null, { status: 401 }));
    expect(await old).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    expect(auth.user).toBe('bob');
    expect(await bridge.isAuthenticated()).toBe(true);
    wrapper.unmount();
    expect(await bridge.isAuthenticated()).toBe(false);
  });

  it('settles an ignored strategy abort promptly when its provider unmounts', async () => {
    let auth!: AuthApi;
    const bridge = createAuthBridge();
    const Child = defineComponent({
      setup() {
        auth = useAuth();
        return () => null;
      },
    });
    const wrapper = mount(AuthProvider, {
      props: { bridge, canResolveOnMount: false, strategy: { resolveUser: () => new Promise<never>(() => {}) } },
      slots: { default: () => h(Child) },
    });
    const pending = auth.refresh();
    wrapper.unmount();
    expect(await pending).toMatchObject({ ok: false, failure: { type: 'cancelled' } });
    expect(await bridge.isAuthenticated()).toBe(false);
  });
});
