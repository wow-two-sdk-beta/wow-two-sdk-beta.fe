import { vi } from 'vitest';

/** One request the fake BFF received. */
export interface FakeBffCall {
  readonly method: string;
  readonly path: string;
  /** The `X-Csrf-Token` header, or `null` when the request carried none. */
  readonly csrf: string | null;
}

export interface FakeBffSession {
  readonly sub: string;
  /** The person's picture link, or `null` for a person without one. */
  readonly picture: string | null;
  readonly organizationId: string | null;
  /** The organization's display name, or `null` for a token that names none. */
  readonly organizationName: string | null;
  /** The organization's handle, or `null` for a token that names none. */
  readonly organizationSlug: string | null;
  readonly role: string;
  readonly permissions: readonly string[];
  readonly csrfToken: string;
  readonly expiresAt: string;
}

export const EndSessionUrl = 'https://idp.test/connect/endsession';

/**
 * A mocked BFF with one server-side session and the Identity `Client` package's `/api/identity/*` routes.
 * Other `/api/*` calls answer 401 when signed out and 403 for an unsafe request without the session's CSRF token.
 */
export function createFakeBff(prefix = '/api/identity') {
  let issued = 0;
  let session: FakeBffSession | null = null;
  let fail: ((path: string) => Response | null) | null = null;
  const calls: FakeBffCall[] = [];

  const json = (body: unknown, status = 200): Response => Response.json(body, { status });

  function issue(overrides: Partial<FakeBffSession> = {}): FakeBffSession {
    issued += 1;
    return {
      sub: 'alice',
      picture: 'https://cdn.app.test/alice.png',
      organizationId: 'org-1',
      organizationName: 'Acme Travel',
      organizationSlug: 'acme-travel',
      role: 'admin',
      permissions: ['reports.read', 'reports.write'],
      csrfToken: `csrf-${issued}`,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      ...overrides,
    };
  }

  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(new URL(String(input), 'http://app.test'), init);
    const url = new URL(request.url);
    const csrf = request.headers.get('X-Csrf-Token');
    calls.push({ method: request.method, path: url.pathname, csrf });
    const injected = fail?.(url.pathname);
    if (injected) return injected;

    if (url.pathname === `${prefix}/session`) {
      if (session === null) return json({ data: { isAuthenticated: false } });
      return json({
        data: {
          isAuthenticated: true,
          person: {
            sub: session.sub,
            name: 'Alice',
            picture: session.picture,
            email: 'alice@app.test',
            phoneNumber: '+998901234567',
          },
          organization:
            session.organizationId === null
              ? null
              : {
                  id: session.organizationId,
                  name: session.organizationName,
                  slug: session.organizationSlug,
                  role: session.role,
                },
          permissions: session.permissions,
          csrfToken: session.csrfToken,
          expiresAt: session.expiresAt,
        },
      });
    }
    if (session === null) return new Response(null, { status: 401 });
    if (request.method !== 'GET' && csrf !== session.csrfToken) return json({ title: 'Forbidden' }, 403);
    if (url.pathname === `${prefix}/sign-out`) {
      session = null;
      return json({ data: { endSessionUrl: EndSessionUrl } });
    }
    return json({ data: { path: url.pathname } });
  });

  return {
    fetch,
    calls,
    /** Starts a server session, replacing any earlier one, and returns it. */
    signIn: (overrides: Partial<FakeBffSession> = {}): FakeBffSession => (session = issue(overrides)),
    /** Ends the server session without telling the client — an idle timeout or a sign-out elsewhere. */
    endSession: (): void => {
      session = null;
    },
    /** Changes the live session (permissions, expiry, role) without rotating the CSRF token. */
    update: (changes: Partial<FakeBffSession>): void => {
      if (session !== null) session = { ...session, ...changes };
    },
    /** Answers matching paths with `response` instead of the route — a transport or server fault. */
    failWith: (next: ((path: string) => Response | null) | null): void => {
      fail = next;
    },
    current: (): FakeBffSession | null => session,
    count: (method: string, path: string): number =>
      calls.filter((call) => call.method === method && call.path === path).length,
  };
}

export type FakeBff = ReturnType<typeof createFakeBff>;
