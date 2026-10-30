// A persisted ref shared by every reader. `usePersistentState` gives each component its own copy hydrated on mount;
// an app-wide view choice — a sidebar fold, a filter switch, the last page opened — needs one value that every
// component reads and any of them writes. `createPersistentRef` builds it once, at module scope, over the broker,
// and decodes what storage holds before adopting it: a value written by older code, another app or a hand edit is
// rejected to `initial`, never trusted as `T`.

import { customRef, getCurrentScope, onScopeDispose, type Ref } from 'vue';

import { localStorageStorageBroker, type StorageBroker } from './StorageBroker';

/** Accepts a stored JSON value as `T`, or answers `undefined` for a shape it does not recognise. */
export type PersistentDecoder<T> = (stored: unknown) => T | undefined;

/** Tunes where a persistent ref stores and what it accepts back. */
export interface PersistentRefOptions<T> {
  /** Validates a stored value before it is adopted; a rejection or a throw reads as `initial`. Defaults to trust. */
  readonly decode?: PersistentDecoder<T>;

  /** The persistence seam to read and write through; defaults to `localStorageStorageBroker`. */
  readonly broker?: StorageBroker;

  /** Whether another tab's write under the same key is adopted; defaults to true. Only `localStorage` reports one. */
  readonly syncTabs?: boolean;
}

/**
 * Creates a ref mirrored into a `StorageBroker` under `key`, meant to be created once and shared by every reader.
 * It reads storage when created: a miss, a stored `null`, a value `decode` rejects or a throwing `decode` yields
 * `initial`. Assigning a different value writes it through at once; reading never writes, and a failed write keeps the
 * value for this visit. Backed by `localStorage`, it adopts a decoded write from another tab and returns to `initial`
 * when another tab removes the key or clears storage.
 *
 * The ref is shallow: replace an array or object to persist it, never mutate it in place. Created inside an effect
 * scope (a component's `setup`, an `effectScope`), its tab listener detaches with the scope; at module scope it lives
 * as long as the page.
 */
export function createPersistentRef<T>(key: string, initial: T, options: PersistentRefOptions<T> = {}): Ref<T> {
  const { decode, broker = localStorageStorageBroker, syncTabs = true } = options;

  /** The stored value, decoded; `initial` for a miss, a rejection or a throwing decoder. */
  function readStored(): T {
    const stored = broker.read<unknown>(key);
    if (stored === null) return initial;
    if (decode === undefined) return stored as T;

    try {
      const decoded = decode(stored);
      return decoded === undefined ? initial : decoded;
    } catch {
      return initial;
    }
  }

  let current = readStored();
  let notify = (): void => undefined;

  const value = customRef<T>((track, trigger) => {
    notify = trigger;
    return {
      get() {
        track();
        return current;
      },
      set(next) {
        if (Object.is(next, current)) return;
        current = next;
        broker.write(key, next);
        trigger();
      },
    };
  });

  if (syncTabs && broker === localStorageStorageBroker && typeof window !== 'undefined') {
    // Adoption assigns `current` directly, never through the setter, so another tab's write is never echoed back.
    const onStorage = (event: StorageEvent): void => {
      if (event.storageArea !== null && event.storageArea !== window.localStorage) return;
      if (event.key !== null && event.key !== key) return;
      const next = event.newValue === null ? initial : readStored();
      if (Object.is(next, current)) return;
      current = next;
      notify();
    };

    window.addEventListener('storage', onStorage);
    if (getCurrentScope()) onScopeDispose(() => window.removeEventListener('storage', onStorage));
  }

  return value;
}
