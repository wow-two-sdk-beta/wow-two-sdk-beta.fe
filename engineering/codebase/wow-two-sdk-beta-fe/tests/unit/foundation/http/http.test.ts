import { describe, expect, it, vi } from 'vitest';
import { ApiError, ApiFailureFactory, createApiClient, fieldErrors, rawEnvelope } from '@src/foundation/http';
import { DefaultRetryPolicy } from '@src/foundation/resilience';
import { ResultExtensions } from '@src/foundation/results';

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'r1' },
  });
const clientFor = (response: Response) => createApiClient({ fetch: vi.fn().mockResolvedValue(response) });

describe('HTTP outcomes', () => {
  it('preserves wire strings without guessing Temporal or numeric encodings', async () => {
    expect(await clientFor(json({ data: { date: '2026-09-09', id: '9007199254740993' } })).get('/x')).toEqual({
      ok: true,
      value: { date: '2026-09-09', id: '9007199254740993' },
    });
  });
  it('requires decoding for typed values and returns schema failure', async () => {
    const decode = (value: unknown) =>
      typeof value === 'string'
        ? ResultExtensions.ok(value.length)
        : ResultExtensions.fail(ApiFailureFactory.create('validation'));
    expect(await clientFor(json({ data: 'abc' })).get('/x', { decode })).toEqual({ ok: true, value: 3 });
    expect(await clientFor(json({ data: 4 })).get('/x', { decode })).toMatchObject({
      ok: false,
      failure: { code: 'validation' },
    });
  });
  it('keeps decoder programmer errors exceptional', async () => {
    await expect(
      clientFor(json({ data: 1 })).get('/x', {
        decode: () => {
          throw new Error('decoder bug');
        },
      }),
    ).rejects.toThrow('decoder bug');
  });
  it('treats empty success as void only when declared', async () => {
    expect(await clientFor(new Response(null, { status: 204 })).delete('/x', { response: 'empty' })).toEqual({
      ok: true,
      value: undefined,
    });
    expect(await clientFor(new Response(null, { status: 204 })).get('/x')).toMatchObject({
      ok: false,
      failure: { code: 'protocol' },
    });
    expect(await clientFor(json({ data: 1 })).get('/x', { response: 'empty' })).toMatchObject({
      ok: false,
      failure: { code: 'protocol' },
    });
  });
  it('returns declared text, blob, and array-buffer bodies without JSON coercion', async () => {
    const svg = '<svg viewBox="0 0 1 1" />';
    expect(
      await clientFor(new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } })).get('/preview', {
        response: 'text',
      }),
    ).toEqual(ResultExtensions.ok(svg));

    const blobResult = await clientFor(new Response('png', { headers: { 'Content-Type': 'image/png' } })).get(
      '/image',
      { response: 'blob' },
    );
    expect(blobResult.ok && blobResult.value.type).toBe('image/png');
    expect(blobResult.ok && (await blobResult.value.text())).toBe('png');

    const bufferResult = await clientFor(new Response(new Uint8Array([1, 2, 3]))).get('/file', {
      response: 'arrayBuffer',
    });
    expect(bufferResult.ok && [...new Uint8Array(bufferResult.value)]).toEqual([1, 2, 3]);
  });

  it('still decodes problem details when a non-JSON success body was requested', async () => {
    const outcome = await clientFor(json({ title: 'conflict' }, 409)).get('/preview', { response: 'text' });
    expect(outcome).toMatchObject({ ok: false, failure: { code: 'http', status: 409 } });
  });
  it('rejects malformed JSON, wrong content types, and missing envelopes', async () => {
    for (const response of [
      new Response('{', { headers: { 'Content-Type': 'application/json' } }),
      new Response('hi'),
      json({ other: 1 }),
    ]) {
      expect(await clientFor(response).get('/x')).toMatchObject({ ok: false, failure: { code: 'protocol' } });
    }
    expect(
      await createApiClient({ envelope: rawEnvelope, fetch: vi.fn().mockResolvedValue(json(null)) }).get('/x'),
    ).toEqual({ ok: true, value: null });
  });
  it('separates safe display text from problem diagnostics and headers', async () => {
    const onUnauthorized = vi.fn();
    const outcome = await createApiClient({
      fetch: vi.fn().mockResolvedValue(json({ detail: 'secret', errors: { name: ['Required'] } }, 401)),
      onUnauthorized,
    }).get('/x');
    expect(outcome).toMatchObject({
      ok: false,
      failure: {
        code: 'http',
        status: 401,
        message: 'Sign in to continue.',
        headers: { 'x-request-id': 'r1' },
        problem: { detail: 'secret' },
      },
    });
    expect(onUnauthorized).toHaveBeenCalledOnce();
    if (!outcome.ok) expect(fieldErrors(outcome.failure)).toEqual({ name: ['Required'] });
  });
  it('names the endpoint behind a failure, never its parameters', async () => {
    const outcome = await createApiClient({
      baseUrl: 'https://api.test',
      fetch: vi.fn().mockResolvedValue(json({ title: 'down' }, 503)),
    }).delete('/servers/42', { query: { token: 'secret', force: true } });
    expect(outcome).toMatchObject({
      ok: false,
      failure: { request: { method: 'DELETE', url: 'https://api.test/servers/42' } },
    });
    const offline = await createApiClient({ fetch: vi.fn().mockRejectedValue(new TypeError('network')) }).get('/x');
    expect(offline).toMatchObject({ ok: false, failure: { code: 'transport', request: { method: 'GET', url: '/x' } } });
  });
  it('distinguishes network, caller cancellation, and timeout', async () => {
    expect(
      await createApiClient({ fetch: vi.fn().mockRejectedValue(new TypeError('network')) }).get('/x'),
    ).toMatchObject({ ok: false, failure: { code: 'transport' } });
    for (const [name, code] of [
      ['AbortError', 'cancelled'],
      ['TimeoutError', 'timeout'],
    ]) {
      const controller = new AbortController();
      controller.abort(new DOMException('stop', name));
      const fetch = vi.fn();
      expect(await createApiClient({ fetch }).get('/x', { signal: controller.signal })).toMatchObject({
        ok: false,
        failure: { code },
      });
      expect(fetch).not.toHaveBeenCalled();
    }
  });
  it('never retries mutations and never leaks problem titles through ApiError', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ title: 'private server text' }, 503));
    const outcome = await createApiClient({ fetch, retry: { ...DefaultRetryPolicy, maxRetries: 2 } }).post('/x');
    expect(fetch).toHaveBeenCalledOnce();
    if (!outcome.ok) expect(new ApiError(outcome.failure).message).not.toContain('private');
  });
});
