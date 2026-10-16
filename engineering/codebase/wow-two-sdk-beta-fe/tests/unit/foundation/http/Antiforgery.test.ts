import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApiClient } from '@src/foundation/http';

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });

const rejection = () => json({ code: 'AntiforgeryValidationFailed', title: 'Bad Request' }, 400);

function header(fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>, call: number, name: string): string | null {
  return new Headers(fetch.mock.calls[call]?.[1]?.headers).get(name);
}

describe('antiforgery echo', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('echoes the decoded cookie on writes and never on reads', async () => {
    vi.stubGlobal('document', { cookie: 'theme=dark; XSRF-TOKEN=abc%2Bdef%3D' });
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json({ data: 1 }));
    const client = createApiClient({ fetch, antiforgery: {} });

    await client.post('/api/codes', { body: {} });
    await client.get('/api/codes');

    expect(header(fetch, 0, 'X-XSRF-TOKEN')).toBe('abc+def=');
    expect(header(fetch, 1, 'X-XSRF-TOKEN')).toBeNull();
  });

  it('refreshes a stale token once through the refresh path and retries the write', async () => {
    const document = { cookie: 'XSRF-TOKEN=before-sign-in' };
    vi.stubGlobal('document', document);
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockImplementationOnce(async () => rejection())
      .mockImplementationOnce(async () => {
        document.cookie = 'XSRF-TOKEN=after-sign-in';
        return json({ data: {} });
      })
      .mockImplementationOnce(async () => json({ data: 7 }));
    const client = createApiClient({ fetch, credentials: 'same-origin', antiforgery: { refreshPath: '/api/config' } });

    expect(await client.put('/api/codes/1', { body: {} })).toEqual({ ok: true, value: 7 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1]?.[0]).toBe('/api/config');
    expect(fetch.mock.calls[1]?.[1]).toMatchObject({ method: 'GET', credentials: 'same-origin', cache: 'no-store' });
    expect(header(fetch, 2, 'X-XSRF-TOKEN')).toBe('after-sign-in');
  });

  it('returns a second rejection and any other failure unchanged', async () => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=stale' });
    const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
      String(input) === '/api/config' ? json({ data: {} }) : rejection(),
    );
    const client = createApiClient({ fetch, antiforgery: { refreshPath: '/api/config' } });

    expect(await client.post('/api/codes', { body: {} })).toMatchObject({ ok: false, failure: { status: 400 } });
    expect(fetch).toHaveBeenCalledTimes(3);

    const plain = vi.fn<typeof globalThis.fetch>(async () => json({ title: 'Name is required.' }, 400));
    const other = createApiClient({ fetch: plain, antiforgery: { refreshPath: '/api/config' } });
    expect(await other.post('/api/codes', { body: {} })).toMatchObject({
      ok: false,
      failure: { status: 400, problem: { title: 'Name is required.' } },
    });
    expect(plain).toHaveBeenCalledTimes(1);
  });

  it('sends no token without a document and none when the option is absent', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => json({ data: 1 }));
    await createApiClient({ fetch, antiforgery: {} }).post('/x', { body: {} });
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=t' });
    await createApiClient({ fetch }).post('/x', { body: {} });

    expect(header(fetch, 0, 'X-XSRF-TOKEN')).toBeNull();
    expect(header(fetch, 1, 'X-XSRF-TOKEN')).toBeNull();
  });
});
