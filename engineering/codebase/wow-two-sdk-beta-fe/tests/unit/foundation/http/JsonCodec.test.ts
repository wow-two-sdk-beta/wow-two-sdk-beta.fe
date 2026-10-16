import { describe, expect, it, vi } from 'vitest';
import { ApiFailureFactory, createApiClient, type ApiJsonCodec } from '@src/foundation/http';
import { LosslessJson } from '@src/foundation/json';
import { ExactNumber } from '@src/foundation/numbers';
import { DefaultRetryPolicy } from '@src/foundation/resilience';
import { ResultExtensions } from '@src/foundation/results';

const rawJson = (text: string, status = 200) =>
  new Response(text, {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Request-Id': 'exact-1' },
  });
const exact = (token: string) => {
  const result = ExactNumber.parse(token);
  if (!result.ok) throw new Error('Invalid numeric test fixture');
  return result.value;
};
const IdToken = '9223372036854775807';
const AmountToken = '12345678901234567890.123456789012345678901234567890';

describe('opt-in HTTP JSON codecs', () => {
  it.each([IdToken, '-9223372036854775808'])(
    'delivers original numeric tokens (%s) before any native conversion',
    async (idToken) => {
      const decode = vi.fn((input: unknown) => {
        if (input === null || typeof input !== 'object' || !('id' in input) || !('amount' in input))
          return ResultExtensions.fail(ApiFailureFactory.create('validation'));
        if (!ExactNumber.isExactNumber(input.id) || !ExactNumber.isExactNumber(input.amount))
          return ResultExtensions.fail(ApiFailureFactory.create('validation'));
        return ResultExtensions.ok({ id: input.id, amount: input.amount });
      });
      const client = createApiClient({
        json: LosslessJson,
        fetch: vi.fn().mockResolvedValue(rawJson(`{"data":{"id":${idToken},"amount":${AmountToken}}}`)),
      });
      const result = await client.get('/money', { decode });
      expect(decode).toHaveBeenCalledOnce();
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.id.toString()).toBe(idToken);
        expect(result.value.id.toBigInt()).toEqual(ResultExtensions.ok(BigInt(idToken)));
        expect(result.value.amount.toString()).toBe(AmountToken);
      }
    },
  );

  it('writes exact numeric tokens as bare JSON numbers and sets the JSON content type', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createApiClient({ json: LosslessJson, fetch });
    expect(
      await client.post('/money', {
        body: { id: exact(IdToken), amount: exact(AmountToken) },
        response: 'empty',
      }),
    ).toEqual(ResultExtensions.ok(undefined));
    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBe(`{"id":${IdToken},"amount":${AmountToken}}`);
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('keeps the native default for ordinary clients during the trial', async () => {
    const fetch = vi.fn().mockResolvedValue(rawJson('{"data":{"value":0.125}}'));
    const client = createApiClient({ fetch });
    expect(await client.post('/native', { body: { count: 3 } })).toEqual(ResultExtensions.ok({ value: 0.125 }));
    expect((fetch.mock.calls[0]?.[1] as RequestInit).body).toBe('{"count":3}');
  });

  it('selects lossless JSON per request without changing native sibling endpoints', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(rawJson(`{"data":{"id":${IdToken}}}`))
      .mockResolvedValueOnce(rawJson('{"data":{"ratio":0.125}}'));
    const client = createApiClient({ fetch });
    const exactResult = await client.get('/exact', {
      json: LosslessJson,
      decode: (value) => ResultExtensions.ok(value as { id: unknown }),
    });
    const nativeResult = await client.get('/native');
    expect(exactResult.ok && ExactNumber.isExactNumber(exactResult.value.id)).toBe(true);
    expect(nativeResult).toEqual(ResultExtensions.ok({ ratio: 0.125 }));
  });

  it('selects native JSON per request on a lossless client', async () => {
    const fetch = vi.fn().mockResolvedValue(rawJson('{"data":{"ratio":0.125}}'));
    const client = createApiClient({ json: LosslessJson, fetch });
    expect(await client.get('/native', { json: null })).toEqual(ResultExtensions.ok({ ratio: 0.125 }));
  });

  it.each([200, 422])(
    'keeps malformed %i JSON classification at the correct success/error boundary',
    async (status) => {
      const fetch = vi.fn().mockResolvedValue(rawJson('{"data":9223372036854775807,', status));
      const decode = vi.fn((value: unknown) => ResultExtensions.ok(value));
      const client = createApiClient({ json: LosslessJson, fetch, retry: { ...DefaultRetryPolicy, maxRetries: 2 } });
      expect(await client.get('/broken', { decode })).toMatchObject({
        ok: false,
        failure: { code: status === 200 ? 'protocol' : 'http', status },
      });
      expect(decode).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledOnce();
    },
  );

  it('preserves exact numeric failure diagnostics without changing the safe display failure', async () => {
    const client = createApiClient({
      json: LosslessJson,
      fetch: vi
        .fn()
        .mockResolvedValue(
          rawJson(`{"status":409,"detail":"private","extensions":{"id":${IdToken},"amount":${AmountToken}}}`, 409),
        ),
    });
    const result = await client.post('/money');
    expect(result).toMatchObject({
      ok: false,
      failure: { code: 'http', status: 409, headers: { 'x-request-id': 'exact-1' } },
    });
    if (!result.ok) {
      expect(result.failure.message).not.toContain('private');
      expect(ExactNumber.isExactNumber(result.failure.problem?.['status'])).toBe(true);
      expect(String(result.failure.problem?.['status'])).toBe('409');
      expect(result.failure.status).toBe(409);
      const fields = result.failure.problem?.['extensions'] as Record<string, unknown>;
      expect(ExactNumber.isExactNumber(fields['id'])).toBe(true);
      expect(ExactNumber.isExactNumber(fields['amount'])).toBe(true);
      expect(String(fields['id'])).toBe(IdToken);
      expect(String(fields['amount'])).toBe(AmountToken);
    }
  });

  it('rejects an unencodable request before fetch and before retry scheduling', async () => {
    const fetch = vi.fn();
    const onRetry = vi.fn();
    const stringify = vi.fn(LosslessJson.stringify);
    const client = createApiClient({
      json: { ...LosslessJson, stringify },
      fetch,
      retry: { ...DefaultRetryPolicy, maxRetries: 2, onRetry },
    });
    expect(await client.get('/invalid', { body: { value: Number.NaN } })).toMatchObject({
      ok: false,
      failure: { code: 'validation', status: 0 },
    });
    expect(stringify).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('sends multipart bodies unchanged without calling the JSON serializer or setting content type', async () => {
    const body = new FormData();
    body.append('name', 'original');
    const stringify = vi.fn(LosslessJson.stringify);
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const client = createApiClient({ json: { ...LosslessJson, stringify }, fetch });
    expect(await client.post('/upload', { body, response: 'empty' })).toEqual(ResultExtensions.ok(undefined));
    const init = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBe(body);
    expect(new Headers(init.headers).has('Content-Type')).toBe(false);
    expect(stringify).not.toHaveBeenCalled();
  });

  it('preserves programmer codec exceptions on success, diagnostics and serialization paths', async () => {
    const bug = new Error('codec bug');
    const parse = (): never => {
      throw bug;
    };
    for (const status of [200, 422]) {
      const client = createApiClient({
        json: { ...LosslessJson, parse },
        fetch: vi.fn().mockResolvedValue(rawJson('{}', status)),
      });
      await expect(client.get('/parse')).rejects.toBe(bug);
    }
    const fetch = vi.fn();
    const client = createApiClient({ json: { ...LosslessJson, stringify: parse }, fetch });
    await expect(client.post('/encode', { body: {} })).rejects.toBe(bug);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('gives an already-aborted request precedence over serialization and fetch', async () => {
    const controller = new AbortController();
    controller.abort();
    const stringify = vi.fn(LosslessJson.stringify);
    const fetch = vi.fn();
    expect(
      await createApiClient({ json: { ...LosslessJson, stringify }, fetch }).post('/x', {
        signal: controller.signal,
        body: { value: Number.NaN },
      }),
    ).toMatchObject({ ok: false, failure: { code: 'cancelled' } });
    expect(stringify).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['parse', 'stringify'] as const)(
    'keeps abort precedence when %s returns an expected codec failure',
    async (stage) => {
      const controller = new AbortController();
      const failAndAbort = () => {
        controller.abort();
        return ResultExtensions.fail('expected codec failure');
      };
      const codec: ApiJsonCodec = { ...LosslessJson, [stage]: failAndAbort };
      const fetch = vi.fn().mockResolvedValue(rawJson('{"data":1}'));
      const client = createApiClient({ json: codec, fetch });
      expect(
        await client.post('/abort', { signal: controller.signal, ...(stage === 'stringify' ? { body: {} } : {}) }),
      ).toMatchObject({
        ok: false,
        failure: { code: 'cancelled' },
      });
      expect(fetch).toHaveBeenCalledTimes(stage === 'parse' ? 1 : 0);
    },
  );
});
