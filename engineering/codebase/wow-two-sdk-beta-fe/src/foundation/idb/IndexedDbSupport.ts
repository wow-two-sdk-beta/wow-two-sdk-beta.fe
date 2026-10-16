// IndexedDB resolution + capability probes — the single place this slice reads the ambient
// `globalThis.indexedDB`. Isolated for the same two reasons as `foundation/crypto`'s `WebCrypto`, plus one
// that is specific to IndexedDB.
//
// 1. The global is read at CALL time, never cached at module scope. Caching would freeze an `undefined`
//    captured during SSR into the module for the page's lifetime, and would block a test from stubbing the
//    factory to exercise a failure path. This is also what keeps the slice import-safe under SSR: nothing
//    here runs until a caller asks.
// 2. Merely READING `globalThis.indexedDB` can throw. A sandboxed iframe without `allow-same-origin` raises
//    a `SecurityError` from the getter itself, so the read is inside a try/catch — a bare `in` check or a
//    `typeof` test would still throw there.
// 3. **Presence does not imply usability.** Firefox in private browsing exposes a complete `indexedDB`
//    object whose `open()` fails — historically a synchronous `InvalidStateError`, later an async `error`
//    event on the request. Some Safari/WebView builds behave similarly after a storage eviction. So a
//    structural check answers "is the API here?", NOT "does it work?", and the two need separate probes:
//      - `isIndexedDbAvailable()` — synchronous, structural, free. The fast gate.
//      - `probeIndexedDb()`       — asynchronous, functional: actually opens and deletes a throwaway
//                                   database. The only answer that is true in private mode.
//    A feature that must not half-work (an offline cache, a draft queue) should gate on the async probe
//    once at startup and cache the result; everything else can use the sync gate.

/** The throwaway database `probeIndexedDb` opens and deletes — namespaced so it cannot collide with an app database. */
const ProbeDatabaseName = '__wow-two-idb-probe__';

/** The default ceiling, in milliseconds, `probeIndexedDb` waits for a verdict before answering `false`. */
export const DefaultProbeTimeoutMs = 2000;

/**
 * Reads the ambient `IDBFactory`, or `undefined` when the runtime has none (SSR, a worker without the
 * API) or when reading it throws (a sandboxed iframe raising `SecurityError` from the getter).
 */
export function resolveIndexedDb(): IDBFactory | undefined {
  // Widened through an optional-property view: `globalThis.indexedDB` is typed non-optional by lib.dom, so
  // a direct `=== undefined` check would be a TS2367 "no overlap" error even though absence is exactly the
  // case this function exists to handle.
  try {
    return (globalThis as { indexedDB?: IDBFactory }).indexedDB;
  } catch {
    return undefined;
  }
}

/**
 * Reports whether an `IDBFactory` is present and structurally usable — the synchronous gate. True in every
 * browser; false under SSR, in a sandboxed iframe, and in runtimes without the API (plain Node).
 *
 * **Not a guarantee that a database will open.** Firefox private browsing exposes the full API and fails on
 * `open()`; only {@link probeIndexedDb} detects that. Use this to skip work that would obviously fail, and
 * the async probe before committing a feature to IndexedDB.
 */
export function isIndexedDbAvailable(): boolean {
  return typeof resolveIndexedDb()?.open === 'function';
}

/**
 * Reports whether IndexedDB actually **works**, by opening a throwaway database and deleting it again.
 * Catches the private-mode case {@link isIndexedDbAvailable} cannot: an API that is present but whose
 * `open()` throws or errors.
 *
 * Never throws and never hangs — a synchronous throw, an `error` event, a `blocked` open, and a runtime
 * that simply never answers all resolve to `false` once `timeoutMs` elapses. Cache the result; the probe
 * costs a real database round trip.
 */
export function probeIndexedDb(timeoutMs: number = DefaultProbeTimeoutMs): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const factory = resolveIndexedDb();
    if (factory === undefined || typeof factory.open !== 'function') {
      resolve(false);
      return;
    }

    let settled = false;
    /** Answers once, clears the timer, and best-effort removes the probe database. */
    const answer = (supported: boolean, database?: IDBDatabase): void => {
      if (settled) {
        database?.close();
        return;
      }
      settled = true;
      clearTimeout(timer);

      try {
        database?.close();
        factory.deleteDatabase(ProbeDatabaseName);
      } catch {
        // Cleanup is best-effort: a leftover empty probe database is harmless, and failing to remove it
        // must never change the verdict we already reached.
      }
      resolve(supported);
    };

    const timer = setTimeout(() => {
      answer(false);
    }, timeoutMs);

    try {
      const request = factory.open(ProbeDatabaseName);
      request.onsuccess = () => {
        answer(true, request.result);
      };
      request.onerror = () => {
        answer(false);
      };
      // A `blocked` probe means another tab holds this name open — impossible for a name we always delete,
      // but treat it as unusable rather than waiting for the timeout.
      request.onblocked = () => {
        answer(false);
      };
    } catch {
      // Firefox private browsing: `open()` throws synchronously.
      answer(false);
    }
  });
}

/**
 * Returns the ambient `IDBFactory`, throwing a diagnostic `Error` when unavailable. Internal — every public
 * entry point in this slice is promise-returning, so this throw always surfaces to the caller as a
 * **rejection**, never a synchronous throw. Not exported from the barrel.
 */
export function requireIndexedDb(): IDBFactory {
  const factory = resolveIndexedDb();
  if (factory === undefined || typeof factory.open !== 'function') {
    throw new Error(
      'IndexedDB is unavailable: `globalThis.indexedDB` is missing or unusable. This runtime cannot open a ' +
        'database — SSR, a sandboxed iframe, or a browser with storage disabled. Guard with ' +
        '`isIndexedDbAvailable()`, or `probeIndexedDb()` to also cover private-mode failures.',
    );
  }

  return factory;
}
