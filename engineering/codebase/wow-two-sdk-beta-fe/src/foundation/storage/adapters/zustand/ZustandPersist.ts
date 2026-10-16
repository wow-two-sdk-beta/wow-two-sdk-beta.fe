// zustand-persist adapter. Bridges a `StorageBroker` into the storage seam zustand's `persist` middleware
// expects, so a zustand store persists through the SAME swappable broker as the rest of the SDK: the in-memory
// double in tests, a `namespacedBroker` for isolation, or the SSR-safe `localStorage` broker in production — with
// no store change. Versioning/migration stays with zustand's own `version`/`migrate` persist options (this
// adapter is the *storage* seam, not a second migration system — use `createVersionedStore` for plain values).
//
// zustand is NOT a dependency here: the `PersistStorage`/`StorageValue` shapes below are a structural mirror of
// zustand v5's (`zustand/middleware`). The object returned by `brokerPersistStorage` is structurally assignable
// to zustand's real `PersistStorage<S>` on the consumer side, so the consumer simply brings zustand and passes
// this in: `persist(init, { name, storage: brokerPersistStorage(broker) })`. Keep these types in sync with zustand v5.

import type { StorageBroker } from '../../StorageBroker';

/** Persisted envelope zustand writes — store state plus its own persist version. Mirrors `zustand/middleware`. */
export interface StorageValue<S> {
  /** The persisted store state. */
  readonly state: S;

  /** zustand's persist schema version (owned by the store's `persist` options), if set. */
  readonly version?: number;
}

/**
 * The post-JSON storage contract zustand's `persist` reads and writes through (mirror of zustand v5's
 * `PersistStorage<S>`). Values are already-parsed `StorageValue` objects — no string encoding here, since the
 * backing `StorageBroker` owns JSON serialization.
 */
export interface PersistStorage<S> {
  /** Reads the persisted envelope for `name`, or null when absent or unreadable. */
  getItem(name: string): StorageValue<S> | null;

  /** Persists `value` under `name`. */
  setItem(name: string, value: StorageValue<S>): void;

  /** Removes any persisted value under `name`. */
  removeItem(name: string): void;
}

/**
 * Adapts `broker` into a zustand `PersistStorage<S>`. Because the broker already serializes to and from JSON,
 * the returned storage hands zustand the parsed `StorageValue` directly (no `createJSONStorage` wrapper needed).
 * It inherits the broker's failure-tolerance: an absent, malformed, or blocked read yields null, which zustand
 * treats as "no persisted state" and falls back to the store's initial state.
 *
 * @example
 * import { create } from 'zustand';
 * import { persist } from 'zustand/middleware';
 * import { localStorageStorageBroker } from '@wow-two-beta/ui-vue/foundation/storage';
 * import { brokerPersistStorage } from '@wow-two-beta/ui-vue/foundation/storage/zustand';
 *
 * const useStore = create(persist(init, { name: 'app', storage: brokerPersistStorage(localStorageStorageBroker) }));
 */
export function brokerPersistStorage<S>(broker: StorageBroker): PersistStorage<S> {
  return {
    getItem: (name) => broker.read<StorageValue<S>>(name),
    setItem: (name, value) => broker.write(name, value),
    removeItem: (name) => broker.remove(name),
  };
}
