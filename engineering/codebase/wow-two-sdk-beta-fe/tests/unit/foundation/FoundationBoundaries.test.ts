import { expect, it } from 'vitest';
import { deepEqual, omitKeys } from '@src/foundation/collections';
import { createCommandRegistry } from '@src/foundation/commands';
import { base64ToBytes, base64UrlToBytes, sha256Hex, stableStringify } from '@src/foundation/crypto';
import { Guid } from '@src/foundation/identifiers';
import { createLogger, memoryLogSink } from '@src/foundation/logger';
import { createAnalytics, memoryAnalyticsProvider } from '@src/analytics';
import { EmojiCatalog } from '@src/domain/emoji';
import { ExactNumber } from '@src/foundation/numbers';
import { LosslessJson } from '@src/foundation/json';

it('omits numeric own keys using JavaScript property-key normalization', () => {
  expect(omitKeys({ 1: 'one', two: 'two' }, [1])).toEqual({ two: 'two' });
});

it('compares opaque objects by identity without confusing hidden state', () => {
  expect(deepEqual(new URL('https://one.test'), new URL('https://two.test'))).toBe(false);
  expect(deepEqual(new Map([['a', 1]]), new Map([['a', 1]]))).toBe(true);
  expect(deepEqual(new Set([{ a: 1 }]), new Set([{ a: 1 }]))).toBe(true);
  expect(deepEqual(new WeakMap(), new WeakMap())).toBe(false);
  const first: { parent?: unknown; value: number } = { value: 1 };
  const second: { parent?: unknown; value: number } = { value: 1 };
  first.parent = first;
  second.parent = second;
  expect(deepEqual(first, second)).toBe(true);
  second.value = 2;
  expect(deepEqual(first, second)).toBe(false);
});

it('keeps newer registrations even when the exact same command object is reused', () => {
  const registry = createCommandRegistry();
  const command = { id: 'save', title: 'Save', run: () => undefined };
  const old = registry.register(command);
  const latest = registry.register(command);
  old();
  expect(registry.get('save')).toBe(command);
  latest();
  expect(registry.get('save')).toBeUndefined();
  const batch = registry.registerAll([command]);
  const single = registry.register(command);
  batch();
  expect(registry.get('save')).toBe(command);
  single();
  expect(registry.get('save')).toBeUndefined();
});

it('rejects noncanonical base64 padding bits while supporting unpadded canonical input', () => {
  expect(base64ToBytes('YQ')).toEqual(new Uint8Array([97]));
  expect(() => base64ToBytes('YR==')).toThrow('padding bits');
  expect(() => base64UrlToBytes('YR')).toThrow('padding bits');
});

it('rejects UUIDv7 timestamps that cannot fit their specified wire field', () => {
  for (const timestamp of [-1, 1.5, NaN, Infinity, 2 ** 48]) expect(() => Guid.createV7(timestamp)).toThrow(RangeError);
  expect(Guid.createV7(2 ** 48 - 1).startsWith('ffffffff-ffff-7')).toBe(true);
});

it('owns configured redaction keys and queued identity traits', () => {
  const keys = ['private'];
  const sink = memoryLogSink();
  const logger = createLogger({ sinks: [sink], redactKeys: keys });
  keys.length = 0;
  logger.info('message', { private: 'secret' });
  expect(sink.records[0]?.context.private).toBe('[redacted]');
  const analytics = createAnalytics();
  const traits = { role: 'reader' };
  analytics.identify('user', traits);
  traits.role = 'admin';
  const memory = memoryAnalyticsProvider();
  analytics.register(memory);
  expect(memory.identities[0]?.traits?.role).toBe('reader');
  for (const maxQueueSize of [NaN, Infinity, -1, 0.5])
    expect(() => createAnalytics({ maxQueueSize })).toThrow(RangeError);
});

it('prevents one consumer from rewriting the shared emoji catalog', () => {
  expect(Object.isFrozen(EmojiCatalog.all)).toBe(true);
  expect(Object.isFrozen(EmojiCatalog.all[0])).toBe(true);
  expect(Object.isFrozen(EmojiCatalog.all[0]?.tags)).toBe(true);
});

it('pretty prints exact JSON without altering numeric tokens or reserved keys', () => {
  const parsed = ExactNumber.parse('9007199254740993.125');
  if (!parsed.ok) throw new Error('fixture');
  const result = LosslessJson.stringify({ ['__proto__']: parsed.value, nested: [true] }, { space: 2 });
  expect(result).toEqual({
    ok: true,
    value: '{\n  "__proto__": 9007199254740993.125,\n  "nested": [\n    true\n  ]\n}',
  });
  if (result.ok) expect(LosslessJson.parse(result.value).ok).toBe(true);
});

it('hashes shared-buffer byte views by taking a supported ArrayBuffer snapshot', async () => {
  const shared = new Uint8Array(new SharedArrayBuffer(3));
  shared.set([97, 98, 99]);
  await expect(sha256Hex(shared)).resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

it('hash representations preserve exact values and reject silently lossy inputs', () => {
  const parsed = ExactNumber.parse('9007199254740993.125');
  if (!parsed.ok) throw new Error('fixture');
  expect(stableStringify({ z: parsed.value, a: 1 })).toBe('{"a":1,"z":9007199254740993.125}');
  for (const value of [new Map(), new Set(), { lost: undefined }, 0.1, new Date()]) {
    expect(() => stableStringify(value)).toThrow(TypeError);
  }
});
