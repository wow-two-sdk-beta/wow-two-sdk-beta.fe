// idb — foundation seam. IndexedDB without the event plumbing: promise wrappers over `IDBRequest` /
// `IDBTransaction`, `openDatabase` with real upgrade + `blocked` handling, `withTransaction` / `iterate` for
// store-level work, and `createKeyValueStore` — the typed `Map`-shaped surface that covers almost every real
// use. No dependency: the raw API is verbose, and wrapping it is exactly the work this SDK exists to do.
//
// SCOPE BOUNDARY vs `foundation/storage` — the two are siblings, not competitors, and the split is by the
// shape of the data, not by preference:
//
//   | | `foundation/storage` | `foundation/idb` (here) |
//   |---|---|---|
//   | Backing store | `localStorage` | IndexedDB |
//   | Timing | **synchronous** — readable during render | **asynchronous** — always awaited |
//   | Wire format | JSON | **structured clone** |
//   | Holds | strings, numbers, plain objects | + `Blob` · `File` · `ArrayBuffer` · typed arrays |
//   |  |  | + `Map` · `Set` · `Date` · `RegExp` · cyclic graphs |
//   | Capacity | ~5MB per origin, hard wall | the origin's storage quota (typically GBs) |
//   | On failure | swallows — a bad read degrades to a miss | **rejects** with a normalized `Error` |
//
// Reach for `storage` when the value is small, durable, and needed synchronously — a theme id, a sidebar
// width, a feature flag, anything a component reads on first paint. Reach for `idb` when the value is large,
// binary, structurally rich, or too numerous to hold in memory — cached documents, offline attachments, a
// draft queue, decoded media, a persisted query cache.
//
// The interfaces do NOT converge, on purpose. `StorageBroker` is synchronous by contract; IndexedDB cannot
// be made synchronous, and faking it (an in-memory mirror hydrated in the background) would hand callers a
// broker that silently misses on first read after a reload — the exact bug the sync contract exists to
// prevent. So nothing here re-implements `StorageBroker`, and no adapter between them is offered.
//
// SSR: import-safe. Nothing touches `globalThis.indexedDB` at module scope, `createKeyValueStore` opens
// lazily on first use, and `isIndexedDbAvailable()` answers `false` instead of throwing where there is no
// IndexedDB. Failures surface as rejections, never as synchronous throws.
//
// The one hazard worth reading before writing any transaction code: an IndexedDB transaction commits itself
// as soon as control returns to the event loop with no IDB work pending, so awaiting a `fetch` (or any
// non-IDB promise) inside one silently kills it. Explained with an example in `IdbPromises.ts`.

export { DefaultProbeTimeoutMs, isIndexedDbAvailable, probeIndexedDb } from './IndexedDbSupport';

export { requestToPromise, transactionToPromise } from './IdbPromises';

export {
  DefaultBlockedTimeoutMs,
  type DeleteDatabaseOptions,
  type IdbUpgradeContext,
  type IdbUpgradeHandler,
  type OpenDatabaseOptions,
  deleteDatabase,
  openDatabase,
} from './OpenDatabase';

export { type IdbCursorVisitor, type IdbEntry, type IterateOptions, iterate, withTransaction } from './Transactions';

export {
  DefaultKeyValueStoreName,
  type KeyValueStore,
  type KeyValueStoreOptions,
  createKeyValueStore,
} from './KeyValueStore';
