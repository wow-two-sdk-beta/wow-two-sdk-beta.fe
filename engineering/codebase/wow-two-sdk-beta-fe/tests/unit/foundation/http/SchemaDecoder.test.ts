import { describe, expect, it, vi } from 'vitest';
import * as v from 'valibot';
import { z } from 'zod';
import { ApiDecoderExtensions, createApiClient, decodeWarned } from '@src/foundation/http';
import { array, number, object, string, type StandardSchemaV1 } from '@src/foundation/validators';

const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const clientFor = (body: unknown) => createApiClient({ fetch: vi.fn().mockResolvedValue(json(body)) });

describe('ApiDecoderExtensions.fromSchema', () => {
  it('decodes an enveloped payload through the SDK validators, zod and valibot alike', async () => {
    const payload = { data: [{ id: 'c1', scans: 3 }] };
    const schemas = [
      array(object({ id: string(), scans: number() })),
      z.array(z.object({ id: z.string(), scans: z.number() })),
      v.array(v.object({ id: v.string(), scans: v.number() })),
    ];
    for (const schema of schemas) {
      expect(await clientFor(payload).get('/api/codes', { decode: ApiDecoderExtensions.fromSchema(schema) })).toEqual({
        ok: true,
        value: [{ id: 'c1', scans: 3 }],
      });
    }
  });

  it('keeps the schema output, transforms included, and types it from the schema', async () => {
    const schema = z.object({ createdAt: z.string().transform((text) => text.slice(0, 4)) });
    const result = await clientFor({ data: { createdAt: '2026-10-26' } }).get('/api/code', {
      decode: ApiDecoderExtensions.fromSchema(schema),
    });
    expect(result).toEqual({ ok: true, value: { createdAt: '2026' } });
    if (result.ok) expect(result.value.createdAt.length).toBe(4);
  });

  it('returns a protocol failure for a rejected payload and hands its issues to onIssues only', async () => {
    const onIssues = vi.fn();
    const decode = ApiDecoderExtensions.fromSchema(z.object({ id: z.string() }), { onIssues });
    const result = await clientFor({ data: { id: 7 } }).get('/api/code', { decode });
    expect(result).toMatchObject({ ok: false, failure: { code: 'protocol', status: 0, problem: null } });
    if (!result.ok) expect(result.failure.message).not.toContain('id');
    expect(onIssues).toHaveBeenCalledTimes(1);
    expect(onIssues.mock.calls[0]![0]).toEqual([expect.objectContaining({ path: ['id'] })]);
  });

  it('composes with decodeWarned for a write that answers with warnings', async () => {
    const decode = decodeWarned(ApiDecoderExtensions.fromSchema(object({ name: string() })));
    expect(await clientFor({ data: { name: 'Menu' } }).post('/api/codes', { body: {}, unwrap: false, decode })).toEqual(
      { ok: true, value: { data: { name: 'Menu' }, warnings: [] } },
    );
  });

  it('throws for an asynchronous schema instead of guessing an outcome', () => {
    const rejecting: StandardSchemaV1<unknown, string> = {
      '~standard': { version: 1, vendor: 'test', validate: () => Promise.reject(new Error('async')) },
    };
    expect(() => ApiDecoderExtensions.fromSchema(rejecting)('x')).toThrow(TypeError);
    const refined = z.string().refine(async (text) => text.length > 0);
    expect(() => ApiDecoderExtensions.fromSchema(refined)('x')).toThrow(/synchronous schema/);
  });
});
