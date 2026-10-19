import { defineComponent, h } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AuthProvider,
  AuthStatus,
  createAuthBridge,
  createBearerStrategy,
  createCookieStrategy,
  useAuth,
  type AuthApi,
  type AuthStrategy,
} from '@src/auth';
import {
  createFeedbackBus,
  feedbackQueryErrors,
  feedbackSessionExpiry,
  NoticeTone,
  SessionExpiredNotice,
  type PublishedNotice,
} from '@src/feedback';
import { ApiFailureFactory, createApiClient, type ApiClient } from '@src/foundation/http';
import { ResultExtensions as R, type Result } from '@src/foundation/results';
import { createQueryClient, queryPlugin, useAppMutation, useAppQuery, type AppQueryClient } from '@src/query';
import { createAppRouter, requireAuth, resolveReturnTo, RouterHistoryMode, signInRedirect } from '@src/router';

/*
 * One app, wired the way the auth convention prescribes, behind a server whose session ends mid-use. The
 * dashboard deliberately stays mounted after sign-out (no gate), so its rebinding queries keep sending 401s:
 * the worst case for an error-toast stream.
 */

interface Profile {
  readonly id: string;
}

const Parallel = 5;
const ReturnUrl = '/servers?env=prod';

const decodeProfile = (value: unknown): Result<Profile, ReturnType<typeof ApiFailureFactory.create>> =>
  typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string'
    ? R.ok({ id: value.id })
    : R.fail(ApiFailureFactory.create('protocol'));

/** A server holding one session: answers while it is valid and 401s once it ends. */
function createServer(isValid: (request: Request) => boolean) {
  const unauthorized: string[] = [];
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(new URL(String(input), 'http://app.test'), init);
    if (!isValid(request)) {
      unauthorized.push(request.headers.get('authorization') ?? 'none');
      return new Response(null, { status: 401 });
    }
    const path = new URL(request.url).pathname;
    if (request.method === 'POST') return new Response(null, { status: 204 });
    return Response.json({ data: path === '/api/identity/me' ? { id: 'alice' } : { id: path } });
  });
  return { fetch, unauthorized };
}

interface Harness {
  readonly auth: AuthApi<Profile, string>;
  readonly queries: AppQueryClient;
  readonly notices: PublishedNotice[];
  readonly expired: ReturnType<typeof vi.fn>;
  readonly replace: ReturnType<typeof vi.spyOn>;
  readonly router: ReturnType<typeof createAppRouter>;
  readonly restart: () => Promise<Result<void, unknown>>;
}

const cleanups: Array<() => void> = [];
afterEach(() => cleanups.splice(0).forEach((cleanup) => cleanup()));

async function mountApp(
  bridge: ReturnType<typeof createAuthBridge<Profile>>,
  http: ApiClient,
  strategy: AuthStrategy<Profile, string>,
): Promise<Harness> {
  const bus = createFeedbackBus();
  const notices: PublishedNotice[] = [];
  bus.subscribe((notice) => notices.push(notice));
  const queries = createQueryClient({ scope: bridge.scope, onError: feedbackQueryErrors(bus) });
  const Page = defineComponent({ render: () => null });
  const router = createAppRouter(
    [
      { path: '/login', component: Page },
      { path: '/servers', component: Page, guard: requireAuth(bridge.isAuthenticated) },
    ],
    { history: RouterHistoryMode.Memory, routePersistence: false, scrollRestoration: false },
  );
  const expired = vi.fn();
  // The app's whole expiry wiring: one neutral notice and one sign-in redirect.
  bridge.subscribeExpired(expired);
  bridge.subscribeExpired(feedbackSessionExpiry(bus));
  bridge.subscribeExpired(signInRedirect(router));
  const replace = vi.spyOn(router, 'replace');

  let auth!: AuthApi<Profile, string>;
  let restart!: () => Promise<Result<void, unknown>>;
  const Dashboard = defineComponent({
    setup() {
      auth = useAuth<Profile, string>();
      for (let index = 0; index < Parallel; index += 1) {
        useAppQuery({
          key: ['servers', index],
          queryFn: ({ signal }) => http.get(`/api/servers/${index}`, { signal, decode: decodeProfile }),
        });
      }
      const mutation = useAppMutation({
        mutationFn: (_: void, { signal }) => http.post('/api/servers/restart', { signal, response: 'empty' }),
      });
      restart = () => mutation.mutateAsync();
      return () => null;
    },
  });
  const wrapper = mount(AuthProvider<Profile, string>, {
    props: { bridge, strategy, canResolveOnMount: false },
    slots: { default: () => h(Dashboard) },
    global: { plugins: [queryPlugin(queries), router] },
  });
  cleanups.push(() => {
    wrapper.unmount();
    queries.dispose();
  });
  await flushPromises();
  return { auth, queries, notices, expired, replace, router, restart };
}

/** Ends the server session, then fires every query and a mutation at once. */
async function expireMidUse(app: Harness, endSession: () => void): Promise<Result<void, unknown>> {
  await app.router.push(ReturnUrl);
  await flushPromises();
  expect(
    app.queries
      .getQueryCache()
      .getAll()
      .every((query) => query.state.status === 'success'),
  ).toBe(true);
  endSession();
  const write = app.restart();
  void app.queries.invalidateQueries();
  const outcome = await write;
  await flushPromises();
  return outcome;
}

function expectSignedOutOnce(app: Harness, unauthorized: ReadonlyArray<string>): void {
  // More 401s than queries: the rebinding observers fired again after sign-out and were swallowed.
  expect(unauthorized.length).toBeGreaterThan(Parallel);
  expect(app.expired).toHaveBeenCalledOnce();
  expect(app.expired).toHaveBeenCalledWith(
    expect.objectContaining({ error: expect.objectContaining({ status: 401 }) }),
  );
  expect(app.auth.status).toBe(AuthStatus.Anonymous);
  expect(app.notices).toEqual([SessionExpiredNotice]);
  expect(app.notices.some((notice) => notice.tone === NoticeTone.Danger)).toBe(false);
  expect(app.replace).toHaveBeenCalledOnce();
  expect(app.router.currentRoute.value.path).toBe('/login');
  expect(app.router.currentRoute.value.query['returnTo']).toBe(ReturnUrl);
  expect(
    app.queries
      .getQueryCache()
      .getAll()
      .some((query) => query.state.data !== undefined),
  ).toBe(false);
}

async function expectReturnAfterSignIn(app: Harness, signIn: () => Promise<unknown>): Promise<void> {
  await signIn();
  await app.router.replace(resolveReturnTo(app.router.currentRoute.value.query));
  await flushPromises();
  expect(app.auth.status).toBe(AuthStatus.Authenticated);
  expect(app.router.currentRoute.value.fullPath).toBe(ReturnUrl);
  expect(app.notices).toEqual([SessionExpiredNotice]);
}

describe('session expiry', () => {
  it('signs a cookie session out once across parallel 401s and returns to the page after sign-in', async () => {
    let sessionValid = true;
    const server = createServer(() => sessionValid);
    const bridge = createAuthBridge<Profile>({ getIdentity: (user) => user.id });
    const http = createApiClient({ scope: bridge.scope, onUnauthorized: bridge.onUnauthorized, fetch: server.fetch });
    const app = await mountApp(
      bridge,
      http,
      createCookieStrategy<Profile, string>({ client: http, decodeUser: decodeProfile }),
    );
    // Waits through the cookie me-resolve, like the app's mount.
    await app.auth.refresh();

    const write = await expireMidUse(app, () => {
      sessionValid = false;
    });

    expect(write).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    expectSignedOutOnce(app, server.unauthorized);

    await expectReturnAfterSignIn(app, async () => {
      sessionValid = true;
      await app.auth.refresh();
    });
  });

  it('clears a bearer token once across parallel 401s and stops sending it', async () => {
    let revoked = false;
    const server = createServer((request) => !revoked && request.headers.get('authorization') === 'Bearer token-alice');
    const bridge = createAuthBridge<Profile>({ getIdentity: (user) => user.id });
    const strategy = createBearerStrategy<Profile, string>({
      authenticate: async (id) => R.ok({ token: `token-${id}`, user: { id } }),
    });
    const http = createApiClient({
      scope: bridge.scope,
      onUnauthorized: bridge.onUnauthorized,
      getAuthToken: strategy.getAuthToken,
      fetch: server.fetch,
    });
    const app = await mountApp(bridge, http, strategy);
    await app.auth.signIn('alice');

    const write = await expireMidUse(app, () => {
      revoked = true;
    });

    expect(write).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    expect(strategy.getAuthToken()).toBeNull();
    expect(server.unauthorized.filter((header) => header === 'none').length).toBeGreaterThan(0);
    expectSignedOutOnce(app, server.unauthorized);

    await expectReturnAfterSignIn(app, async () => {
      revoked = false;
      await app.auth.signIn('alice');
    });
  });
});
