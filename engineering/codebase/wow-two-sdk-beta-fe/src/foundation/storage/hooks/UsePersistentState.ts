import {
  computed,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type ShallowRef,
  type WritableComputedRef,
} from 'vue';

import { localStorageStorageBroker, type StorageBroker } from '../StorageBroker';

/** Defines the options that tune where and how `usePersistentState` persists. */
export interface PersistentStateOptions {
  /** The persistence seam to read and write through; defaults to `localStorageStorageBroker`. */
  readonly broker?: StorageBroker;
}

/** A setter that accepts a next value or an updater fn, mirroring the original's `useState` dispatch. */
export type SetPersistentState<T> = (next: T | ((previous: T) => T)) => void;

/** The persistent-state handle — a writable value plus the updater-accepting setter it delegates to. */
export interface PersistentState<T> {
  /**
   * The live value. Writable: `value.value = next` runs the same write-through path as `setValue(next)`.
   * A writable computed rather than a plain ref, so persistence is driven by the assignment itself —
   * mutating a nested field in place does not persist, exactly as the original required a setter call.
   */
  readonly value: WritableComputedRef<T>;

  /** Sets the next value — or derives it from the previous one — and writes it through the broker. */
  readonly setValue: SetPersistentState<T>;
}

/**
 * Resolves whether cross-tab sync is available — the `storage` event fires only for the shared
 * `localStorage`, and only in a browser.
 */
function canSyncAcrossTabs(broker: StorageBroker): boolean {
  return broker === localStorageStorageBroker && typeof window !== 'undefined';
}

/**
 * Manages a piece of state mirrored into a `StorageBroker` under `key`. Hydrates from the broker on
 * mount (SSR-safe: the first render always uses `initial`, then a mount hook adopts any persisted value, so
 * server and client markup match), writes through on every set, and — when backed by `localStorage` —
 * adopts writes from other tabs via the window `storage` event.
 *
 * Returns `{ value, setValue }` rather than a tuple: `value` is writable (`state.value = next`), and
 * `setValue` is kept because it additionally accepts an updater fn. `key` may be a ref or getter — changing
 * it re-hydrates from the new slot.
 */
export function usePersistentState<T>(
  key: MaybeRefOrGetter<string>,
  initial: T,
  options?: PersistentStateOptions,
): PersistentState<T> {
  const broker = options?.broker ?? localStorageStorageBroker;

  // `initial` is the first-paint value on both server and client; a mount hook reconciles it with storage,
  // so hydration never diverges. Cast: `shallowRef`'s return type is a conditional over an unresolved `T`.
  const state = shallowRef(initial) as ShallowRef<T>;

  const setValue: SetPersistentState<T> = (next) => {
    const resolved = typeof next === 'function' ? (next as (previous: T) => T)(state.value) : (next as T);
    broker.write(toValue(key), resolved);
    state.value = resolved;
  };

  const value = computed<T>({
    get: () => state.value,
    set: setValue,
  });

  /** Adopts the persisted value for the current key — a hit wins over what is held, a miss leaves it alone. */
  function hydrate(): void {
    const persisted = broker.read<T>(toValue(key));
    state.value = persisted ?? initial;
  }

  onMounted(hydrate);
  // A key swap re-reads from the new slot. Adoption assigns `state` directly, never through `setValue`, so
  // reading a value never writes it back.
  watch(() => toValue(key), hydrate, { flush: 'sync' });

  // Adopt writes made under the same key in another tab. Guarded so a non-localStorage or SSR context attaches
  // no listener. `event.newValue === null` means the key was removed elsewhere — fall back to `initial`.
  let detachStorage: (() => void) | null = null;

  onMounted(() => {
    if (!canSyncAcrossTabs(broker)) return;

    function onStorage(event: StorageEvent): void {
      const currentKey = toValue(key);
      if (event.storageArea !== null && event.storageArea !== window.localStorage) return;
      if (event.key !== null && event.key !== currentKey) return;
      state.value = event.newValue === null ? initial : (broker.read<T>(currentKey) ?? initial);
    }

    window.addEventListener('storage', onStorage);
    detachStorage = () => window.removeEventListener('storage', onStorage);
  });

  // Registered at setup level — `onScopeDispose` only binds to the component's effect scope while that scope
  // is current, which it is not inside `onMounted`.
  onScopeDispose(() => {
    detachStorage?.();
    detachStorage = null;
  });

  return { value, setValue };
}
