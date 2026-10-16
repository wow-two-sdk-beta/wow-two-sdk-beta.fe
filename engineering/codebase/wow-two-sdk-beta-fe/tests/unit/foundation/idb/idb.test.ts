import { describe, expect, it } from 'vitest';
import { DefaultProbeTimeoutMs, isIndexedDbAvailable, probeIndexedDb } from '@src/foundation/idb';

/*
 * Smoke depth, `unit` project (node — no IndexedDB, and that is the point).
 *
 * The slice's premise is that reading the ambient factory is itself unsafe: a sandboxed iframe
 * throws a `SecurityError` from the getter, and Firefox private mode exposes a complete API
 * whose `open()` fails. So the contract worth asserting is the ONE this environment can prove —
 * on a runtime with no IndexedDB at all, both gates answer `false` and neither throws or hangs.
 * A regression here is a server render that dies on an import, so it is worth its own file even
 * though everything past the gate needs a browser.
 */

describe('the absent-runtime contract', () => {
  it('answers false from the synchronous gate rather than throwing', () => {
    expect(() => isIndexedDbAvailable()).not.toThrow();
    expect(isIndexedDbAvailable()).toBe(false);
  });

  it('resolves false from the async probe rather than rejecting or hanging', async () => {
    await expect(probeIndexedDb()).resolves.toBe(false);
  });

  it('ships a bounded default probe timeout', () => {
    expect(DefaultProbeTimeoutMs).toBeGreaterThan(0);
  });
});
