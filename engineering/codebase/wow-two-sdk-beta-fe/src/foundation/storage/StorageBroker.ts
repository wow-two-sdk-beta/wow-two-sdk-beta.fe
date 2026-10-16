// Generic, domain-agnostic client-side persistence seam. A `StorageBroker` is the sole surface the
// persistence hooks touch, so a component tree can swap `localStorage` for an in-memory map (tests) or a
// no-op (SSR) without any hook change. JSON is the wire format; every method is failure-tolerant — a quota,
// serialization, or parse error degrades to a miss, never a throw.

/** Defines a JSON key/value persistence seam the storage hooks read and write through. */
export interface StorageBroker {
  /** Reads and parses the value stored under `key`, or null when absent or unreadable. */
  read<T>(key: string): T | null;

  /** Serializes and writes `value`; reports false when storage or serialization is unavailable. */
  write<T>(key: string, value: T): boolean;

  /** Removes any value stored under `key`; reports false when storage is unavailable. */
  remove(key: string): boolean;
}

/** Resolves the ambient `localStorage`, or null when unavailable — SSR, private mode, security exception. */
function resolveLocalStorage(): Storage | null {
  // `typeof window === 'undefined'` guards SSR; the try/catch guards a `localStorage` getter that throws
  // (Safari private mode, sandboxed iframes) rather than merely being absent.
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The production broker — persists through the browser's `localStorage` as JSON, SSR-safe and failure-tolerant.
 * A read that is absent, malformed, or blocked returns null; a write that exceeds quota or fails to serialize is
 * swallowed. Never throws, so a caller never has to guard the storage call.
 */
export const localStorageStorageBroker: StorageBroker = {
  read<T>(key: string): T | null {
    const store = resolveLocalStorage();
    if (store === null) return null;

    try {
      const raw = store.getItem(key);
      return raw === null ? null : (JSON.parse(raw) as T);
    } catch {
      return null;
    }
  },

  write<T>(key: string, value: T): boolean {
    const store = resolveLocalStorage();
    if (store === null) return false;

    try {
      const serialized = JSON.stringify(value);
      if (serialized === undefined) return false;
      store.setItem(key, serialized);
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): boolean {
    const store = resolveLocalStorage();
    if (store === null) return false;

    try {
      store.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

/** Builds an isolated in-memory `StorageBroker` backed by a `Map` — the test double: no cross-tab sync, no DOM. */
export function memoryStorageBroker(): StorageBroker {
  const store = new Map<string, string>();

  return {
    read<T>(key: string): T | null {
      const raw = store.get(key);
      if (raw === undefined) return null;

      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },

    write<T>(key: string, value: T): boolean {
      try {
        const serialized = JSON.stringify(value);
        if (serialized === undefined) return false;
        store.set(key, serialized);
        return true;
      } catch {
        return false;
      }
    },

    remove(key: string): boolean {
      store.delete(key);
      return true;
    },
  };
}
