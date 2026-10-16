import { describe, expect, it } from 'vitest';
import {
  createVersionedStore,
  localStorageStorageBroker,
  memoryStorageBroker,
  namespacedBroker,
} from '@src/foundation/storage';

/*
 * Smoke depth, `unit` project (node — no `localStorage`). Three contracts:
 * a broker round-trips JSON and answers `null` rather than throwing on a miss; the namespaced
 * wrapper actually prefixes; and the versioned store migrates a stale envelope up on read.
 *
 * The node environment is load-bearing for the `localStorageStorageBroker` case: with no
 * ambient `Storage`, a broker that forgot its SSR guard would throw on the first read, which is
 * exactly the shape that takes down a server render.
 */

describe('memoryStorageBroker', () => {
  it('round-trips a value and answers null for a key it never held', () => {
    const broker = memoryStorageBroker();
    expect(broker.write('user', { id: 7, name: 'ada' })).toBe(true);

    expect(broker.read<{ id: number; name: string }>('user')).toEqual({ id: 7, name: 'ada' });
    expect(broker.read('absent')).toBeNull();
  });

  it('forgets a removed key', () => {
    const broker = memoryStorageBroker();
    broker.write('k', 1);
    expect(broker.remove('k')).toBe(true);
    expect(broker.read('k')).toBeNull();
  });

  it('keeps two brokers independent', () => {
    const first = memoryStorageBroker();
    const second = memoryStorageBroker();
    first.write('k', 1);
    expect(second.read('k')).toBeNull();
  });

  it('reports serialization failure without throwing', () => {
    const broker = memoryStorageBroker();
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(broker.write('circular', circular)).toBe(false);
    expect(broker.read('circular')).toBeNull();
  });
});

describe('localStorageStorageBroker', () => {
  /* The SSR guard. Without it every read here throws, and so does every server render. */
  it('degrades to a no-op when no ambient Storage exists', () => {
    expect(localStorageStorageBroker.write('k', 1)).toBe(false);
    expect(localStorageStorageBroker.read('k')).toBeNull();
    expect(localStorageStorageBroker.remove('k')).toBe(false);
  });
});

describe('namespacedBroker', () => {
  it('writes under the prefixed key, so two namespaces cannot collide', () => {
    const inner = memoryStorageBroker();
    const alpha = namespacedBroker(inner, 'alpha');
    const beta = namespacedBroker(inner, 'beta');

    expect(alpha.write('token', 'a')).toBe(true);
    expect(beta.write('token', 'b')).toBe(true);

    expect(alpha.read('token')).toBe('a');
    expect(beta.read('token')).toBe('b');
    // The raw key is untouched — proof the prefix reached the inner broker.
    expect(inner.read('token')).toBeNull();
    expect(alpha.remove('token')).toBe(true);
    expect(alpha.read('token')).toBeNull();
  });
});

describe('createVersionedStore', () => {
  it('returns `initial` when nothing is stored', () => {
    const store = createVersionedStore({
      key: 'prefs',
      version: 1,
      initial: { theme: 'light' },
      broker: memoryStorageBroker(),
    });

    expect(store.read()).toEqual({ theme: 'light' });
  });

  it('round-trips a written value under the current version', () => {
    const store = createVersionedStore({
      key: 'prefs',
      version: 1,
      initial: { theme: 'light' },
      broker: memoryStorageBroker(),
    });

    store.write({ theme: 'dark' });
    expect(store.read()).toEqual({ theme: 'dark' });

    store.clear();
    expect(store.read()).toEqual({ theme: 'light' });
  });

  it('migrates a stale envelope up on read', () => {
    const broker = memoryStorageBroker();
    const v1 = createVersionedStore({ key: 'prefs', version: 1, initial: { theme: 'light' }, broker });
    v1.write({ theme: 'dark' });

    const v2 = createVersionedStore<{ theme: string; density: string }>({
      key: 'prefs',
      version: 2,
      initial: { theme: 'light', density: 'cozy' },
      broker,
      migrations: {
        1: (value) => ({ ...(value as { theme: string }), density: 'compact' }),
      },
    });

    expect(v2.read()).toEqual({ theme: 'dark', density: 'compact' });
  });
});
