import { describe, expect, it, vi } from 'vitest';
import {
  AuthStatus,
  BffSessionExtensions,
  createAuthBridge,
  createBffStrategy,
  decodeBffLogout,
  decodeBffSession,
  type BffUser,
} from '@src/auth';
import { createApiClient } from '@src/foundation/http';
import { ResultExtensions as R } from '@src/foundation/results';
import { createFakeBff, EndSessionUrl } from '../../support/FakeBff';

/*
 * The framework-free half of the BFF strategy against a mocked fetch: the session read, the CSRF echo through the
 * HTTP layer, the 401 redirect, and the logout round trip. Sync, refresh and the provider live in the sibling files.
 */

function setup(options: Parameters<typeof createBffStrategy>[0] = {}) {
  const server = createFakeBff();
  const navigate = vi.fn();
  const bff = createBffStrategy({ fetch: server.fetch, navigate, sync: false, refresh: false, ...options });
  return { server, navigate, bff };
}

async function user(bff: ReturnType<typeof createBffStrategy>): Promise<BffUser> {
  const outcome = await bff.resolveUser({});
  if (!outcome.ok || outcome.value === null) throw new Error('expected a signed-in user');
  return outcome.value;
}

describe('BFF session read', () => {
  it('exposes person, organization, role and permissions', async () => {
    const { server, bff } = setup();
    server.signIn({ role: 'owner', permissions: ['reports.read'] });

    const signedIn = await user(bff);

    expect(signedIn.person).toEqual({
      sub: 'alice',
      name: 'Alice',
      email: 'alice@app.test',
      phoneNumber: '+998901234567',
    });
    expect(signedIn.organization).toEqual({ id: 'org-1', role: 'owner' });
    expect(signedIn.permissions).toEqual(['reports.read']);
    expect(Number.isFinite(Date.parse(signedIn.expiresAt ?? ''))).toBe(true);
    expect(BffSessionExtensions.hasPermission(signedIn, 'reports.read')).toBe(true);
    expect(BffSessionExtensions.hasPermission(signedIn, 'reports.write')).toBe(false);
    expect(BffSessionExtensions.hasPermission(null, 'reports.read')).toBe(false);
    expect(server.calls).toEqual([{ method: 'GET', path: '/auth/session', csrf: null }]);
  });

  it('resolves a signed-out answer to no user and no token', async () => {
    const { server, bff } = setup();
    server.signIn();
    await bff.resolveUser({});
    expect(bff.getCsrfToken()).toBe('csrf-1');

    server.endSession();

    expect(await bff.resolveUser({})).toEqual(R.ok(null));
    expect(bff.getCsrfToken()).toBeNull();
  });

  it('reads a person acting in no organization', async () => {
    const { server, bff } = setup();
    server.signIn({ organizationId: null });
    expect((await user(bff)).organization).toBeNull();
  });

  it('treats a 401 from the session route as signed out and keeps other failures', async () => {
    const { server, bff } = setup();
    server.failWith(() => new Response(null, { status: 401 }));
    expect(await bff.resolveUser({})).toEqual(R.ok(null));

    server.failWith(() => new Response(null, { status: 503 }));
    expect(await bff.resolveUser({})).toMatchObject({ ok: false, failure: { code: 'http', status: 503 } });
  });

  it('fails a payload that breaks the contract instead of guessing', () => {
    const valid = {
      isAuthenticated: true,
      person: { sub: 'alice' },
      csrfToken: 'token',
      permissions: ['a'],
      expiresAt: '2030-01-01T00:00:00Z',
    };
    for (const broken of [
      null,
      { data: 1 },
      { isAuthenticated: 'yes' },
      { ...valid, person: {} },
      { ...valid, csrfToken: '' },
      { ...valid, permissions: 'a' },
      { ...valid, permissions: [1] },
      { ...valid, organization: { role: 'admin' } },
    ]) {
      expect(decodeBffSession(broken)).toMatchObject({ ok: false, failure: { code: 'protocol' } });
    }
    expect(decodeBffSession(valid)).toMatchObject({ ok: true });
  });

  it('defaults an absent permission list and drops an expiry that does not parse', () => {
    const decoded = decodeBffSession({
      isAuthenticated: true,
      person: { sub: 'alice' },
      csrfToken: 'token',
      expiresAt: 'tomorrow-ish',
    });
    expect(decoded).toMatchObject({
      ok: true,
      value: { user: { permissions: [], expiresAt: null, person: { name: null, email: null } } },
    });
    expect(decoded.ok && Object.isFrozen(decoded.value.user?.permissions)).toBe(true);
  });

  it('keys identity by person and organization so a refresh keeps caches and a switch drops them', async () => {
    const { server, bff } = setup();
    server.signIn();
    const first = await user(bff);
    server.update({ permissions: ['reports.read'], expiresAt: new Date(Date.now() + 60_000).toISOString() });
    const refreshed = await user(bff);
    server.signIn({ organizationId: 'org-2' });
    const switched = await user(bff);

    expect(refreshed).not.toBe(first);
    expect(BffSessionExtensions.identity(refreshed)).toBe(BffSessionExtensions.identity(first));
    expect(BffSessionExtensions.identity(switched)).not.toBe(BffSessionExtensions.identity(first));

    const bridge = createAuthBridge<BffUser>({ getIdentity: BffSessionExtensions.identity });
    const invalidated = vi.fn();
    bridge.scope.subscribe(invalidated);
    bridge.publishSession({ status: AuthStatus.Authenticated, user: first });
    bridge.publishSession({ status: AuthStatus.Authenticated, user: refreshed });
    expect(invalidated).toHaveBeenCalledTimes(1);
    bridge.publishSession({ status: AuthStatus.Authenticated, user: switched });
    expect(invalidated).toHaveBeenCalledTimes(2);
  });

  it('cancels a read that a sign-out overtook and never restores its token', async () => {
    const { server, bff } = setup();
    server.signIn();
    const pending = bff.resolveUser({});
    await bff.signOut!({});
    expect(await pending).toMatchObject({ ok: false, failure: { type: 'cancelled' } });
    expect(bff.getCsrfToken()).toBeNull();
  });
});

describe('CSRF through the HTTP layer', () => {
  it('echoes the session token on unsafe requests and never on reads', async () => {
    const { server, bff } = setup();
    server.signIn();
    await bff.resolveUser({});
    const http = createApiClient({ fetch: server.fetch, antiforgery: bff.antiforgery });

    expect(await http.post('/api/reports', { body: {} })).toMatchObject({ ok: true });
    await http.get('/api/reports');
    await http.put('/api/reports/1', { body: {} });
    await http.delete('/api/reports/1');

    const api = server.calls.filter((call) => call.path.startsWith('/api'));
    expect(api.map((call) => [call.method, call.csrf])).toEqual([
      ['POST', 'csrf-1'],
      ['GET', null],
      ['PUT', 'csrf-1'],
      ['DELETE', 'csrf-1'],
    ]);
  });

  it('follows a refreshed token and sends none while signed out', async () => {
    const { server, bff } = setup();
    const http = createApiClient({ fetch: server.fetch, antiforgery: bff.antiforgery });
    await http.post('/api/reports', { body: {} });
    expect(server.calls.at(-1)?.csrf).toBeNull();

    server.signIn();
    await bff.resolveUser({});
    server.signIn();
    await bff.resolveUser({});
    expect(await http.post('/api/reports', { body: {} })).toMatchObject({ ok: true });
    expect(server.calls.at(-1)?.csrf).toBe('csrf-2');
  });

  it('honours a custom header name', async () => {
    const { server, bff } = setup({ csrfHeaderName: 'X-Other' });
    server.signIn();
    await bff.resolveUser({});
    const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json({ data: 1 }));
    await createApiClient({ fetch, antiforgery: bff.antiforgery }).post('/api/x', { body: {} });
    expect(new Headers(fetch.mock.calls[0]?.[1]?.headers).get('X-Other')).toBe('csrf-1');
  });
});

describe('401 sends the person to sign-in', () => {
  function signedInApp(navigate = vi.fn()) {
    const { server, bff } = setup({ navigate });
    const bridge = createAuthBridge<BffUser>({
      getIdentity: BffSessionExtensions.identity,
      getReturnUrl: () => '/servers?env=prod',
    });
    bridge.subscribeExpired(bff.redirectToLogin);
    bridge.subscribeUnauthorized(() => bff.onUnauthorized?.());
    const http = createApiClient({
      fetch: server.fetch,
      scope: bridge.scope,
      onUnauthorized: bridge.onUnauthorized,
      antiforgery: bff.antiforgery,
    });
    return { server, bff, bridge, http, navigate };
  }

  it('navigates once to /auth/login with the page as returnUrl across parallel 401s', async () => {
    const { server, bff, bridge, http, navigate } = signedInApp();
    server.signIn();
    bridge.publishSession({ status: AuthStatus.Authenticated, user: await user(bff) });

    server.endSession();
    const outcomes = await Promise.all(Array.from({ length: 4 }, (_, index) => http.get(`/api/items/${index}`)));

    expect(outcomes.every((outcome) => !outcome.ok && outcome.failure.code === 'cancelled')).toBe(true);
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/auth/login?returnUrl=%2Fservers%3Fenv%3Dprod');
    expect(bridge.getSession().status).toBe(AuthStatus.Anonymous);
    expect(bff.getCsrfToken()).toBeNull();
  });

  it('does not navigate for a 401 while signed out', async () => {
    const { bridge, http, navigate } = signedInApp();
    bridge.publishSession({ status: AuthStatus.Anonymous, user: null });
    expect(await http.get('/api/items')).toMatchObject({ ok: false, failure: { status: 401 } });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('falls back to / for a return path that is not local', () => {
    const { bff, navigate } = setup();
    for (const returnUrl of ['https://evil.test', '//evil.test', '/\\evil.test', '/a\nb']) {
      bff.redirectToLogin({ returnUrl });
    }
    expect(navigate.mock.calls.map(([url]) => url)).toEqual(Array(4).fill('/auth/login?returnUrl=%2F'));
  });

  it('honours a prefix and a base URL', () => {
    const { bff } = setup({ prefix: '/identity/', baseUrl: 'https://bff.test' });
    expect(bff.loginUrl('/a?b=1')).toBe('https://bff.test/identity/login?returnUrl=%2Fa%3Fb%3D1');
  });
});

describe('sign-in', () => {
  it('navigates to the BFF login with the given local path', async () => {
    const { bff, navigate } = setup();
    expect(await bff.signIn!('/account?x=1', {})).toEqual(R.ok(undefined));
    expect(navigate).toHaveBeenCalledWith('/auth/login?returnUrl=%2Faccount%3Fx%3D1');
  });

  it('reads / as the current page without a browser and rejects remote or malformed paths', async () => {
    const { bff, navigate } = setup();
    expect(await bff.signIn!(undefined, {})).toEqual(R.ok(undefined));
    expect(navigate).toHaveBeenCalledWith('/auth/login?returnUrl=%2F');
    navigate.mockClear();

    for (const target of ['https://other.test', '//other.test', '/\\other.test', '/a\n']) {
      expect(await bff.signIn!(target, {})).toMatchObject({ ok: false, failure: { type: 'validation' } });
    }
    expect(navigate).not.toHaveBeenCalled();
  });

  it('reports itself unavailable instead of throwing when it cannot navigate', async () => {
    const bff = createBffStrategy({ sync: false, refresh: false });
    expect(await bff.signIn!('/a', {})).toMatchObject({ ok: false, failure: { type: 'unavailable' } });
  });
});

describe('sign-out', () => {
  it('posts the logout route with the CSRF token, then navigates to the end-session URL', async () => {
    const { server, bff, navigate } = setup();
    server.signIn();
    await bff.resolveUser({});

    expect(await bff.signOut!({})).toEqual(R.ok(undefined));

    expect(server.calls.at(-1)).toEqual({ method: 'POST', path: '/auth/logout', csrf: 'csrf-1' });
    expect(server.current()).toBeNull();
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(EndSessionUrl);
    expect(bff.getCsrfToken()).toBeNull();
  });

  it('navigates only after the logout answered', async () => {
    const { server, bff, navigate } = setup();
    server.signIn();
    await bff.resolveUser({});
    let release!: () => void;
    const held = new Promise<void>((resolve) => (release = resolve));
    const respond = server.fetch.getMockImplementation()!;
    server.fetch.mockImplementation(async (input, init) => {
      await held;
      return respond(input, init);
    });

    const pending = bff.signOut!({});
    await Promise.resolve();
    expect(navigate).not.toHaveBeenCalled();
    release();
    await pending;
    expect(navigate).toHaveBeenCalledWith(EndSessionUrl);
  });

  it('returns a server failure, drops the token and does not navigate', async () => {
    const { server, bff, navigate } = setup();
    server.signIn();
    await bff.resolveUser({});
    server.failWith((path) => (path === '/auth/logout' ? new Response(null, { status: 500 }) : null));

    expect(await bff.signOut!({})).toMatchObject({ ok: false, failure: { status: 500 } });
    expect(navigate).not.toHaveBeenCalled();
    expect(bff.getCsrfToken()).toBeNull();
  });

  it('counts a 401 as already signed out', async () => {
    const { server, bff, navigate } = setup();
    server.signIn();
    await bff.resolveUser({});
    server.endSession();

    expect(await bff.signOut!({})).toEqual(R.ok(undefined));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('refuses an end-session URL the page may not navigate to', async () => {
    for (const endSessionUrl of ['javascript:alert(1)', 'data:text/html,x', '//evil.test', '', 7, undefined]) {
      expect(decodeBffLogout({ endSessionUrl })).toMatchObject({ ok: false, failure: { code: 'protocol' } });
    }
    for (const endSessionUrl of ['https://idp.test/end?x=1', 'http://localhost:5000/end', '/signed-out']) {
      expect(decodeBffLogout({ endSessionUrl })).toEqual(R.ok({ endSessionUrl }));
    }

    const { server, bff, navigate } = setup();
    server.signIn();
    await bff.resolveUser({});
    server.failWith((path) =>
      path === '/auth/logout' ? Response.json({ data: { endSessionUrl: 'javascript:x' } }) : null,
    );
    expect(await bff.signOut!({})).toMatchObject({ ok: false, failure: { code: 'protocol' } });
    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears the token on a bridged 401', async () => {
    const { server, bff } = setup();
    server.signIn();
    await bff.resolveUser({});
    bff.onUnauthorized!();
    expect(bff.getCsrfToken()).toBeNull();
  });
});
