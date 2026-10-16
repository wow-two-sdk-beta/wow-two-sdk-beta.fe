import { describe, expect, it, vi } from 'vitest';
import { ApiFailureFactory, createApiClient, decodeWarned } from '@src/foundation/http';
import { ResultExtensions } from '@src/foundation/results';

const json = (value: unknown) =>
  new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const decodeName = (value: unknown) =>
  typeof value === 'object' && value !== null && typeof (value as { name?: unknown }).name === 'string'
    ? ResultExtensions.ok((value as { name: string }).name)
    : ResultExtensions.fail(ApiFailureFactory.create('validation'));

describe('decodeWarned', () => {
  it('returns the decoded data beside the envelope warnings', async () => {
    const warning = { property: 'rules[0].content.url', message: 'Uses HTTP.', code: 'RedirectTargetInsecure' };
    const client = createApiClient({
      fetch: vi.fn().mockResolvedValue(json({ data: { name: 'Menu' }, warnings: [warning] })),
    });

    expect(await client.post('/api/codes', { body: {}, unwrap: false, decode: decodeWarned(decodeName) })).toEqual({
      ok: true,
      value: { data: 'Menu', warnings: [{ ...warning, severity: 'warning' }] },
    });
  });

  it('reads a missing warnings member as none', () => {
    expect(decodeWarned(decodeName)({ data: { name: 'Menu' } })).toEqual({
      ok: true,
      value: { data: 'Menu', warnings: [] },
    });
  });

  it('rejects a missing envelope or malformed warnings, and keeps data failures', () => {
    expect(decodeWarned(decodeName)({ name: 'Menu' })).toMatchObject({ ok: false, failure: { code: 'protocol' } });
    expect(decodeWarned(decodeName)({ data: { name: 'Menu' }, warnings: [{ code: 1 }] })).toMatchObject({
      ok: false,
      failure: { code: 'protocol' },
    });
    expect(decodeWarned(decodeName)({ data: { name: 2 } })).toMatchObject({
      ok: false,
      failure: { code: 'validation' },
    });
  });
});
