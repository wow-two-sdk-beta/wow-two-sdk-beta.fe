// A `StorageBroker` decorator that prefixes every key with a namespace. Wrapping a shared broker (one
// `localStorage`) in a namespace keeps unrelated features — or two tenants in the same app — from colliding on
// a bare key like `"draft"`, without any hook change: the persistence hooks still see a plain `StorageBroker`.
// Composes with any broker (production, memory, or another namespace) since it only rewrites keys.

import type { StorageBroker } from './StorageBroker';

/** The separator between a namespace and the caller's key. */
const NamespaceSeparator = ':';

/**
 * Wraps `inner` so every key is transparently prefixed with `namespace` (joined by `:`). Reads, writes, and
 * removes all address the namespaced key, so two brokers with distinct namespaces over the same backing store
 * never observe each other's values. Delegates JSON handling and failure-tolerance to `inner` unchanged.
 */
export function namespacedBroker(inner: StorageBroker, namespace: string): StorageBroker {
  const scope = (key: string): string => `${namespace}${NamespaceSeparator}${key}`;

  return {
    read<T>(key: string): T | null {
      return inner.read<T>(scope(key));
    },

    write<T>(key: string, value: T): boolean {
      return inner.write(scope(key), value);
    },

    remove(key: string): boolean {
      return inner.remove(scope(key));
    },
  };
}
