import { describe, expect, it, vi } from 'vitest';
import { computed, effectScope, watch } from 'vue';
import {
  createPersistentRef,
  localStorageStorageBroker,
  memoryStorageBroker,
  type StorageBroker,
} from '@src/foundation/storage';

/*
 * `unit` project (node — no `localStorage`). The shared ref's contract over a memory broker: it adopts a decoded
 * stored value, rejects what the decoder refuses, writes through on a changed assignment only, and reads never
 * write. The node environment also proves the `localStorage` default is SSR-safe at module scope.
 */

/** Spies on a memory broker's writes. */
function spiedBroker(): StorageBroker & { readonly writes: ReturnType<typeof vi.fn> } {
  const inner = memoryStorageBroker();
  const writes = vi.fn((key: string, value: unknown) => inner.write(key, value));
  return {
    read: (key) => inner.read(key),
    write: writes as StorageBroker['write'],
    remove: (key) => inner.remove(key),
    writes,
  };
}

const isBoolean = (stored: unknown): boolean | undefined => (typeof stored === 'boolean' ? stored : undefined);

describe('createPersistentRef', () => {
  it('reads the stored value when created', () => {
    const broker = memoryStorageBroker();
    broker.write('sidebar', true);

    expect(createPersistentRef('sidebar', false, { broker, decode: isBoolean }).value).toBe(true);
  });

  it('answers initial for a miss and a stored null', () => {
    const broker = memoryStorageBroker();
    broker.write('last', null);

    expect(createPersistentRef('absent', 'cards', { broker }).value).toBe('cards');
    expect(createPersistentRef<string | null>('last', 'none', { broker }).value).toBe('none');
  });

  it('answers initial for a value the decoder rejects or throws on', () => {
    const broker = memoryStorageBroker();
    broker.write('sidebar', 'yes');

    expect(createPersistentRef('sidebar', false, { broker, decode: isBoolean }).value).toBe(false);

    const throwing = createPersistentRef('sidebar', false, {
      broker,
      decode: () => {
        throw new Error('bad shape');
      },
    });
    expect(throwing.value).toBe(false);
  });

  it('adopts what the decoder returns, null included', () => {
    const broker = memoryStorageBroker();
    broker.write('ids', ['a', 7, 'b']);
    broker.write('env', 'staging');

    const ids = createPersistentRef<string[]>('ids', [], {
      broker,
      decode: (stored) => (Array.isArray(stored) ? stored.filter((item) => typeof item === 'string') : undefined),
    });
    const env = createPersistentRef<'dev' | 'prod' | null>('env', 'dev', {
      broker,
      decode: (stored) => (stored === 'dev' || stored === 'prod' ? stored : null),
    });

    expect(ids.value).toEqual(['a', 'b']);
    expect(env.value).toBeNull();
  });

  it('trusts the stored value without a decoder', () => {
    const broker = memoryStorageBroker();
    broker.write('last', { slug: 'pin', tab: null });

    expect(createPersistentRef('last', null as unknown, { broker }).value).toEqual({ slug: 'pin', tab: null });
  });

  it('writes a changed assignment through and never writes on read', () => {
    const broker = spiedBroker();
    const collapsed = createPersistentRef('groups', [] as string[], { broker });

    void collapsed.value;
    expect(broker.writes).not.toHaveBeenCalled();

    collapsed.value = ['w-ventures'];
    expect(broker.writes).toHaveBeenCalledTimes(1);
    expect(broker.read('groups')).toEqual(['w-ventures']);

    const same = collapsed.value;
    collapsed.value = same;
    expect(broker.writes).toHaveBeenCalledTimes(1);
  });

  it('notifies every reader of one shared ref', () => {
    const broker = memoryStorageBroker();
    const shared = createPersistentRef('inactive', false, { broker, decode: isBoolean });
    const label = computed(() => (shared.value ? 'shown' : 'hidden'));
    const seen: boolean[] = [];

    const scope = effectScope();
    scope.run(() => watch(shared, (next) => seen.push(next), { flush: 'sync' }));

    expect(label.value).toBe('hidden');
    shared.value = true;
    expect(label.value).toBe('shown');
    expect(seen).toEqual([true]);
    scope.stop();
  });

  it('keeps an assignment for the visit when the write fails', () => {
    const broker: StorageBroker = { read: () => null, write: () => false, remove: () => false };
    const view = createPersistentRef('view', 'cards', { broker });

    view.value = 'rows';
    expect(view.value).toBe('rows');
  });

  it('degrades to initial over localStorage when no Storage exists', () => {
    const view = createPersistentRef('view', 'cards', { broker: localStorageStorageBroker });

    expect(view.value).toBe('cards');
    view.value = 'rows';
    expect(view.value).toBe('rows');
  });
});
