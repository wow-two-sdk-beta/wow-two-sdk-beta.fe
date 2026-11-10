import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthProvider,
  AuthStatus,
  BffSessionExtensions,
  createAuthBridge,
  createBffStrategy,
  useBffAuth,
  type BffAuthApi,
  type BffStrategy,
  type BffSyncMessage,
  type BffUser,
} from '@src/auth';
import { memorySyncHub, type MemorySyncHub } from '@src/foundation/channels';
import { createApiClient } from '@src/foundation/http';
import { ResultExtensions as R, type AppError, type Result } from '@src/foundation/results';
import { user } from '../../support/FakeAuthHost';
import { createFakeBff, EndSessionUrl, type FakeBff } from '../../support/FakeBff';

/*
 * One app per "tab": the provider, the bridge, the BFF strategy and an HTTP client wired the way the auth
 * convention prescribes, against a mocked BFF. Tabs share the server, the cookie-less session and an in-process hub.
 */

const Minute = 60_000;
const ReturnUrl = '/servers?env=prod';
const SignInUrl = '/api/identity/sign-in?returnUrl=%2Fservers%3Fenv%3Dprod';

interface Tab {
  readonly api: BffAuthApi;
  readonly bff: BffStrategy;
  readonly bridge: ReturnType<typeof createAuthBridge<BffUser>>;
  readonly http: ReturnType<typeof createApiClient>;
  readonly navigate: ReturnType<typeof vi.fn>;
  readonly statuses: AuthStatus[];
  readonly resolveErrors: unknown[];
  readonly invalidated: ReturnType<typeof vi.fn>;
  readonly unmount: () => void;
  readonly setStrategy: (strategy: BffStrategy) => Promise<void>;
}

const wrappers: Array<() => void> = [];
const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};
const focus = (): boolean => window.dispatchEvent(new Event('focus'));

beforeEach(() => vi.useFakeTimers({ now: new Date('2030-01-01T00:00:00Z') }));
afterEach(() => {
  for (const unmount of wrappers.splice(0)) unmount();
  vi.useRealTimers();
});

async function openTab(
  server: FakeBff,
  options: { hub?: MemorySyncHub; strategy?: (bff: BffStrategy) => BffStrategy } = {},
): Promise<Tab> {
  const navigate = vi.fn();
  const sync = options.hub ? { open: (name: string) => options.hub!.channel<BffSyncMessage>(name) } : false;
  const bff = createBffStrategy({ fetch: server.fetch, navigate, sync });
  const bridge = createAuthBridge<BffUser>({
    getIdentity: BffSessionExtensions.identity,
    getReturnUrl: () => ReturnUrl,
  });
  bridge.subscribeExpired(bff.redirectToSignIn);
  const invalidated = vi.fn();
  bridge.scope.subscribe(invalidated);
  const http = createApiClient({
    fetch: server.fetch,
    scope: bridge.scope,
    onUnauthorized: bridge.onUnauthorized,
    antiforgery: bff.antiforgery,
  });
  const statuses: AuthStatus[] = [];
  const resolveErrors: unknown[] = [];
  let api!: BffAuthApi;
  const Probe = defineComponent({
    setup() {
      api = useBffAuth();
      return () => h('p', api.person?.name ?? 'signed out');
    },
  });
  const wrapper = mount(AuthProvider<BffUser, string | undefined>, {
    props: {
      strategy: options.strategy ? options.strategy(bff) : bff,
      bridge,
      onSessionChange: (session) => statuses.push(session.status),
      onResolveError: (error) => resolveErrors.push(error),
    },
    slots: { default: () => h(Probe) },
  });
  wrappers.push(() => wrapper.unmount());
  await settle();
  return {
    api,
    bff,
    bridge,
    http,
    navigate,
    statuses,
    resolveErrors,
    invalidated,
    unmount: () => wrapper.unmount(),
    setStrategy: async (strategy) => {
      await wrapper.setProps({ strategy });
      await settle();
    },
  };
}

describe('BFF app session', () => {
  it('shows person, organization, role and permissions once the session resolves', async () => {
    const server = createFakeBff();
    server.signIn({ role: 'owner', permissions: ['reports.read'] });
    const tab = await openTab(server);

    expect(tab.statuses).toEqual([AuthStatus.Unknown, AuthStatus.Resolving, AuthStatus.Authenticated]);
    expect(tab.api.isAuthenticated).toBe(true);
    expect(tab.api.person).toMatchObject({
      sub: 'alice',
      name: 'Alice',
      picture: 'https://cdn.app.test/alice.png',
      email: 'alice@app.test',
    });
    expect(tab.api.organization).toEqual({ id: 'org-1', name: 'Acme Travel', slug: 'acme-travel', role: 'owner' });
    expect(tab.api.role).toBe('owner');
    expect(tab.api.permissions).toEqual(['reports.read']);
    expect(tab.api.hasPermission('reports.read')).toBe(true);
    expect(tab.api.hasPermission('reports.write')).toBe(false);
  });

  it('reads as signed out with empty accessors', async () => {
    const tab = await openTab(createFakeBff());

    expect(tab.api.status).toBe(AuthStatus.Anonymous);
    expect(tab.api.person).toBeNull();
    expect(tab.api.role).toBeNull();
    expect(tab.api.permissions).toEqual([]);
    expect(tab.api.hasPermission('reports.read')).toBe(false);
  });

  it('echoes the CSRF token on writes and sends the person to sign-in once when every call 401s', async () => {
    const server = createFakeBff();
    server.signIn();
    const tab = await openTab(server);
    expect(await tab.http.post('/api/reports', { body: {} })).toMatchObject({ ok: true });
    expect(server.calls.at(-1)).toMatchObject({ method: 'POST', path: '/api/reports', csrf: 'csrf-1' });

    server.endSession();
    const outcomes = await Promise.all([tab.http.get('/api/a'), tab.http.get('/api/b'), tab.http.post('/api/c', {})]);

    expect(outcomes.every((outcome) => !outcome.ok && outcome.failure.code === 'cancelled')).toBe(true);
    expect(tab.navigate).toHaveBeenCalledOnce();
    expect(tab.navigate).toHaveBeenCalledWith(SignInUrl);
    expect(tab.api.status).toBe(AuthStatus.Anonymous);
    expect(tab.bff.getCsrfToken()).toBeNull();
  });

  it('signs out through the logout route with the token, then navigates to the end-session URL', async () => {
    const server = createFakeBff();
    server.signIn();
    const tab = await openTab(server);

    expect(await tab.api.signOut()).toEqual(R.ok(undefined));

    expect(server.calls.at(-1)).toEqual({ method: 'POST', path: '/api/identity/sign-out', csrf: 'csrf-1' });
    expect(tab.navigate).toHaveBeenCalledOnce();
    expect(tab.navigate).toHaveBeenCalledWith(EndSessionUrl);
    expect(tab.api.status).toBe(AuthStatus.Anonymous);
  });

  it('signs in by navigating to the BFF login with the given path', async () => {
    const tab = await openTab(createFakeBff());
    await tab.api.signIn('/reports');
    expect(tab.navigate).toHaveBeenCalledWith('/api/identity/sign-in?returnUrl=%2Freports');
    expect(tab.api.status).toBe(AuthStatus.Anonymous);
  });
});

describe('background refresh', () => {
  it('refreshes before expiresAt without leaving authenticated or dropping the caches', async () => {
    const server = createFakeBff();
    server.signIn({ expiresAt: new Date(Date.now() + 10 * Minute).toISOString() });
    const tab = await openTab(server);
    const first = tab.api.user;
    tab.invalidated.mockClear();
    server.update({ permissions: ['reports.read'], expiresAt: new Date(Date.now() + 40 * Minute).toISOString() });

    await vi.advanceTimersByTimeAsync(9 * Minute);

    expect(server.count('GET', '/api/identity/session')).toBe(2);
    expect(tab.statuses).toEqual([
      AuthStatus.Unknown,
      AuthStatus.Resolving,
      AuthStatus.Authenticated,
      AuthStatus.Authenticated,
    ]);
    expect(tab.api.user).not.toBe(first);
    expect(tab.api.permissions).toEqual(['reports.read']);
    expect(tab.invalidated).not.toHaveBeenCalled();
  });

  it('settles at one refresh pair per expiry when the server never extends the session', async () => {
    const server = createFakeBff();
    server.signIn({ expiresAt: new Date(Date.now() + 10 * Minute).toISOString() });
    await openTab(server);

    await vi.advanceTimersByTimeAsync(5 * 24 * 60 * Minute);

    // The read on mount, the pre-expiry refresh and the check at expiry.
    expect(server.count('GET', '/api/identity/session')).toBe(3);
  });

  it('refreshes a stale session on focus without a resolving flash', async () => {
    const server = createFakeBff();
    server.signIn();
    const tab = await openTab(server);
    server.update({ role: 'viewer' });

    await vi.advanceTimersByTimeAsync(31_000);
    focus();
    await settle();

    expect(tab.api.role).toBe('viewer');
    expect(tab.statuses.filter((status) => status === AuthStatus.Resolving)).toHaveLength(1);
  });

  it('expires the session once when the server ended it, then stays quiet', async () => {
    const server = createFakeBff();
    server.signIn();
    const tab = await openTab(server);
    tab.invalidated.mockClear();
    server.endSession();

    await vi.advanceTimersByTimeAsync(31_000);
    focus();
    await settle();

    expect(tab.api.status).toBe(AuthStatus.Anonymous);
    expect(tab.navigate).toHaveBeenCalledOnce();
    expect(tab.navigate).toHaveBeenCalledWith(SignInUrl);
    expect(tab.invalidated).toHaveBeenCalledOnce();
    expect(tab.statuses.filter((status) => status === AuthStatus.Resolving)).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(31_000);
    focus();
    await settle();
    expect(tab.navigate).toHaveBeenCalledOnce();
  });

  it('keeps the session and reports when the check itself fails', async () => {
    const server = createFakeBff();
    server.signIn();
    const tab = await openTab(server);
    server.failWith(() => new Response(null, { status: 503 }));

    await vi.advanceTimersByTimeAsync(31_000);
    focus();
    await settle();

    expect(tab.api.status).toBe(AuthStatus.Authenticated);
    expect(tab.navigate).not.toHaveBeenCalled();
    expect(tab.resolveErrors).toHaveLength(1);
  });

  it('keeps the session when a background check throws', async () => {
    const server = createFakeBff();
    server.signIn();
    const resolveUser = vi.fn<BffStrategy['resolveUser']>();
    const tab = await openTab(server, {
      strategy: (bff) => {
        resolveUser.mockImplementationOnce(bff.resolveUser).mockRejectedValue(new Error('decoder bug'));
        return { ...bff, resolveUser };
      },
    });

    await vi.advanceTimersByTimeAsync(31_000);
    focus();
    await settle();

    expect(resolveUser).toHaveBeenCalledTimes(2);
    expect(tab.api.status).toBe(AuthStatus.Authenticated);
    expect(tab.navigate).not.toHaveBeenCalled();
  });

  it('does not cancel a sign-in that is in flight', async () => {
    const server = createFakeBff();
    let resolveExchange!: (result: Result<BffUser, AppError>) => void;
    const exchange = new Promise<Result<BffUser, AppError>>((resolve) => (resolveExchange = resolve));
    const tab = await openTab(server, {
      strategy: (bff) => ({ ...bff, signIn: () => exchange }),
    });

    const pending = tab.api.signIn();
    await vi.advanceTimersByTimeAsync(31_000);
    focus();
    await settle();
    const found = user(30 * Minute);
    resolveExchange(R.ok(found));

    expect(await pending).toEqual(R.ok(found));
    expect(tab.api.status).toBe(AuthStatus.Authenticated);
  });
});

describe('tabs', () => {
  it('signs a second tab out after the first signed out, reading the session only once the server answered', async () => {
    const hub = memorySyncHub();
    const server = createFakeBff();
    server.signIn();
    const a = await openTab(server, { hub });
    const b = await openTab(server, { hub });
    expect(b.api.isAuthenticated).toBe(true);
    const before = server.calls.length;

    await a.api.signOut();
    await settle();

    expect(b.api.status).toBe(AuthStatus.Anonymous);
    expect(b.navigate).toHaveBeenCalledOnce();
    expect(b.navigate).toHaveBeenCalledWith(SignInUrl);
    expect(a.navigate).toHaveBeenCalledOnce();
    expect(a.navigate).toHaveBeenCalledWith(EndSessionUrl);
    expect(server.calls.slice(before).map((call) => `${call.method} ${call.path}`)).toEqual([
      'POST /api/identity/sign-out',
      'GET /api/identity/session',
    ]);
  });

  it('signs an anonymous tab in after a sign-in landed in another tab, without echoing', async () => {
    const hub = memorySyncHub();
    const server = createFakeBff();
    const a = await openTab(server, { hub });
    const b = await openTab(server, { hub });
    expect(a.api.status).toBe(AuthStatus.Anonymous);
    server.signIn();

    const landed = await openTab(server, { hub });
    await settle();

    expect(landed.api.isAuthenticated).toBe(true);
    expect(a.api.isAuthenticated).toBe(true);
    expect(b.api.isAuthenticated).toBe(true);
    expect(a.invalidated).toHaveBeenCalledOnce();
    // Three reads on mount, then one hint-driven read in each of the other two tabs — nothing echoes back.
    expect(server.count('GET', '/api/identity/session')).toBe(5);
    await vi.advanceTimersByTimeAsync(5 * Minute);
    expect(server.count('GET', '/api/identity/session')).toBe(5);
  });

  it('tells the other tabs when one tab discovers the session ended', async () => {
    const hub = memorySyncHub();
    const server = createFakeBff();
    server.signIn();
    const a = await openTab(server, { hub });
    const b = await openTab(server, { hub });
    server.endSession();

    await a.http.get('/api/anything');
    await settle();

    expect(a.api.status).toBe(AuthStatus.Anonymous);
    expect(b.api.status).toBe(AuthStatus.Anonymous);
    expect(b.navigate).toHaveBeenCalledOnce();
    expect(a.navigate).toHaveBeenCalledOnce();
  });
});

describe('lifetime', () => {
  it('releases the channel, listeners and timer on unmount', async () => {
    const hub = memorySyncHub();
    const server = createFakeBff();
    server.signIn();
    const tab = await openTab(server, { hub });
    expect(hub.openCount).toBe(1);
    expect(vi.getTimerCount()).toBe(1);

    tab.unmount();

    expect(hub.openCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    const reads = server.count('GET', '/api/identity/session');
    focus();
    await vi.advanceTimersByTimeAsync(60 * Minute);
    expect(server.count('GET', '/api/identity/session')).toBe(reads);
  });

  it('moves to a replacement strategy: the old one disconnects, the new one connects', async () => {
    const hub = memorySyncHub();
    const server = createFakeBff();
    server.signIn();
    const tab = await openTab(server, { hub });
    const replacement = createBffStrategy({
      fetch: server.fetch,
      navigate: vi.fn(),
      sync: { open: (name) => hub.channel<BffSyncMessage>(name) },
    });

    await tab.setStrategy(replacement);

    expect(hub.openCount).toBe(1);
    expect(tab.api.isAuthenticated).toBe(true);
    expect(replacement.getCsrfToken()).toBe('csrf-1');
    expect(vi.getTimerCount()).toBe(1);
  });
});
