import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import { createApiClient, createRequestScope, type ApiFailure, type ApiResponseValue } from '@src/foundation/http';
import { ResultExtensions as R, type Result } from '@src/foundation/results';
import { LosslessJson } from '@src/foundation/json';
import { DefaultRetryPolicy } from '@src/foundation/resilience';

const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify({ data: value }), {
    status,
    headers: { 'content-type': 'application/json', etag: 'v2', 'x-request-id': 'request-2' },
  });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe('request lifetime and response metadata', () => {
  it('keeps scope revisions isolated and makes disposal permanent', () => {
    const a = createRequestScope();
    const b = createRequestScope();
    const old = a.capture();
    const untouched = b.capture();
    const cleanup = vi.fn();
    a.subscribe(cleanup);
    a.invalidate();
    expect(old.signal.aborted).toBe(true);
    expect(old.isCurrent()).toBe(false);
    expect(a.capture().isCurrent()).toBe(true);
    expect(untouched.isCurrent()).toBe(true);
    a.dispose();
    a.dispose();
    a.invalidate();
    expect(a.capture().signal.aborted).toBe(true);
    expect(a.capture().isCurrent()).toBe(false);
    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it.each(['AbortError', 'TimeoutError'])('settles a hanging credential resolver on %s', async (name) => {
    const credentials = deferred<string>();
    const fetch = vi.fn();
    const abort = new AbortController();
    const request = createApiClient({ getAuthToken: () => credentials.promise, fetch }).get('/private', {
      signal: abort.signal,
    });
    await Promise.resolve();
    abort.abort(new DOMException('stop', name));
    expect(await request).toMatchObject({
      ok: false,
      failure: { code: name === 'TimeoutError' ? 'timeout' : 'cancelled' },
    });
    credentials.reject(new Error('late credential failure'));
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('captures session scope before resolving credentials and ignores its eventual result', async () => {
    const scope = createRequestScope();
    const credentials = deferred<string>();
    const fetch = vi.fn();
    const request = createApiClient({ scope, getAuthToken: () => credentials.promise, fetch }).get('/private');
    await Promise.resolve();
    scope.invalidate();
    expect(await request).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    credentials.resolve('old');
    await Promise.resolve();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('settles fetch and body delegates that ignore cancellation', async () => {
    for (const stage of ['fetch', 'body']) {
      const abort = new AbortController();
      const never = new Promise<never>(() => {});
      const body = response('value');
      vi.spyOn(body, 'text').mockReturnValue(never);
      const fetch = vi.fn().mockReturnValue(stage === 'fetch' ? never : Promise.resolve(body));
      const request = createApiClient({ fetch }).get('/slow', { signal: abort.signal });
      await Promise.resolve();
      await Promise.resolve();
      abort.abort();
      expect(await request).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    }
  });

  it('suppresses an old 401 after the session changes', async () => {
    const scope = createRequestScope();
    const pending = deferred<Response>();
    const unauthorized = vi.fn();
    const request = createApiClient({
      scope,
      fetch: vi.fn().mockReturnValue(pending.promise),
      onUnauthorized: unauthorized,
    }).get('/me');
    await Promise.resolve();
    scope.invalidate();
    pending.resolve(response(null, 401));
    expect(await request).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('retries malformed diagnostic bodies and resolves credentials once for every attempt', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('<html>upstream unavailable</html>', { status: 503 }))
      .mockResolvedValueOnce(response('ok'));
    const token = vi.fn().mockResolvedValueOnce('alice').mockResolvedValue('bob');
    const client = createApiClient({
      json: LosslessJson,
      fetch,
      getAuthToken: token,
      retry: { ...DefaultRetryPolicy, baseDelayMs: 0, maxRetries: 1 },
    });
    expect(await client.get('/retry')).toEqual(R.ok('ok'));
    expect(token).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map((call) => new Headers(call[1].headers).get('authorization'))).toEqual([
      'Bearer alice',
      'Bearer alice',
    ]);
  });

  it('preserves failure metadata when reading diagnostic bodies fails', async () => {
    const failed = new Response(null, { status: 503, headers: { 'retry-after': '5' } });
    vi.spyOn(failed, 'text').mockRejectedValue(new Error('stream closed'));
    expect(
      await createApiClient({ json: LosslessJson, fetch: vi.fn().mockResolvedValue(failed) }).get('/x'),
    ).toMatchObject({
      ok: false,
      failure: { code: 'http', status: 503, headers: { 'retry-after': '5' } },
    });
  });

  it('returns decoded success metadata without changing ordinary payload methods', async () => {
    const client = createApiClient({ fetch: vi.fn().mockImplementation(async () => response(42)) });
    const detailed = await client.detailed.get('/count', { decode: (value) => R.ok(Number(value)) });
    expect(detailed).toEqual(
      R.ok({
        value: 42,
        status: 200,
        headers: { 'content-type': 'application/json', etag: 'v2', 'x-request-id': 'request-2' },
        url: '',
      }),
    );
    if (detailed.ok) expect(Object.isFrozen(detailed.value.headers)).toBe(true);
    expect(await client.get('/count')).toEqual(R.ok(42));
  });

  it('preserves detailed response types for empty, text, binary and decoded bodies', async () => {
    const client = createApiClient({ fetch: vi.fn().mockImplementation(async () => response(42)) });
    const check = () => {
      expectTypeOf(client.detailed.get('/x', { decode: () => R.ok(1) })).toEqualTypeOf<
        Promise<Result<ApiResponseValue<number>, ApiFailure>>
      >();
      expectTypeOf(client.detailed.get('/x', { response: 'empty' })).toEqualTypeOf<
        Promise<Result<ApiResponseValue<void>, ApiFailure>>
      >();
      expectTypeOf(client.detailed.get('/x', { response: 'text' })).toEqualTypeOf<
        Promise<Result<ApiResponseValue<string>, ApiFailure>>
      >();
      expectTypeOf(client.detailed.get('/x', { response: 'blob' })).toEqualTypeOf<
        Promise<Result<ApiResponseValue<Blob>, ApiFailure>>
      >();
      expectTypeOf(client.detailed.get('/x', { response: 'arrayBuffer' })).toEqualTypeOf<
        Promise<Result<ApiResponseValue<ArrayBuffer>, ApiFailure>>
      >();
      // @ts-expect-error A type argument cannot assert an undecoded payload.
      client.detailed.get<number>('/x');
      // @ts-expect-error A text body cannot claim a numeric decoder.
      client.detailed.get<number>('/x', { response: 'text', decode: () => R.ok(1) });
      // @ts-expect-error Binary payload inference must not become an arbitrary string.
      const text: Promise<Result<ApiResponseValue<string>, ApiFailure>> = client.detailed.get('/x', {
        response: 'blob',
      });
      void text;
    };
    expect(check).toBeTypeOf('function');
    const result = await createApiClient({
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 204, headers: { etag: 'v3' } })),
    }).detailed.delete('/x', { response: 'empty' });
    expect(result).toMatchObject({ ok: true, value: { value: undefined, status: 204, headers: { etag: 'v3' } } });
  });
});
