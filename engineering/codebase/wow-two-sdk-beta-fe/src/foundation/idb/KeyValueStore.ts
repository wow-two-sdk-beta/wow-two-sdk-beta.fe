// The 90% API: one object store, typed, addressed like a `Map`. Almost every real use of IndexedDB is a
// keyed cache — offline documents, draft attachments, decoded media, a query cache that must survive a
// reload — and none of it needs indexes, ranges, or multi-store transactions. Those stay reachable
// (`openDatabase` + `withTransaction` + `iterate` are exported unchanged for the other 10%); this is the
// surface that keeps a caller from hand-rolling the boilerplate for the common case.
//
// ERROR CONTRACT — ONE MODEL, NO MIXING: **every method rejects with a normalized `Error` on failure, and
// nothing here ever throws synchronously.** Deliberately unlike `foundation/storage`, whose broker swallows
// failures and degrades a bad read to a miss. That is right for `localStorage`: the payload is small, cheap
// to re-derive, and a lost preference is a shrug. It is wrong here — the payloads are large, often the only
// copy (an unsent draft, a queued upload), and a write that silently vanishes is data loss the caller was
// never told about. Quota exhaustion, in particular, is a real and recoverable condition that a caller can
// only handle if it is told. Absence is NOT failure: `get` resolves `undefined` for a missing key, `has`
// answers the ambiguous case (IndexedDB can store `undefined` as a value), and both are normal results.
//
// CONNECTION LIFECYCLE. The database is opened lazily on the first operation, never at construction — so
// `createKeyValueStore` is safe to call at module scope under SSR, where nothing may touch `indexedDB`. The
// open promise is cached and shared by concurrent callers, and dropped again whenever the connection dies:
// a failed open (so the next call retries rather than replaying a stale rejection), a `versionchange` from
// another tab (`openDatabase` closes the handle to avoid deadlocking it — see that file's header), or a
// browser-forced `close`. The next operation transparently re-opens. That is what makes a store held in a
// module-scope `const` survive a second tab upgrading the schema underneath it.

import { toError } from '../errors';
import { requestToPromise } from './IdbPromises';
import { openDatabase, type IdbUpgradeHandler } from './OpenDatabase';
import { iterate, withTransaction, type IdbCursorVisitor } from './Transactions';

/** The object store name used when none is given. */
export const DefaultKeyValueStoreName = 'keyval';

/** Configures {@link createKeyValueStore}. */
export interface KeyValueStoreOptions {
  /** The IndexedDB database to open. One database may host several stores. */
  readonly databaseName: string;

  /** The object store to address; defaults to {@link DefaultKeyValueStoreName}. Created automatically. */
  readonly storeName?: string;

  /**
   * The schema version. Raise it when `upgrade` must run again — for example to add a second store or an
   * index to an existing database. Defaults to the browser's (1 for a fresh database).
   */
  readonly version?: number;

  /**
   * Extra schema work, run after this store's own object store is ensured to exist. Only needed for
   * additional stores, indexes, or data migrations; a plain key/value store needs no `upgrade` at all.
   * Synchronous, like every upgrade handler.
   */
  readonly upgrade?: IdbUpgradeHandler;

  /** Called when another tab forces this connection closed for its own upgrade or delete. */
  readonly onVersionChange?: () => void;
}

/**
 * A typed, asynchronous key/value view over one IndexedDB object store. Values are persisted by
 * **structured clone**, not JSON: `Blob`, `File`, `ArrayBuffer`, typed arrays, `Map`, `Set`, `Date`,
 * `RegExp`, and cyclic object graphs all round-trip intact, and the store is bounded by the origin's
 * storage quota rather than `localStorage`'s ~5MB. A value the algorithm rejects (a function, a DOM node, a
 * class instance carrying methods) rejects the write with a `DataCloneError`.
 */
export interface KeyValueStore<TValue, TKey extends IDBValidKey = string> {
  /** The database this store lives in. */
  readonly databaseName: string;

  /** The object store being addressed. */
  readonly storeName: string;

  /** Reads the value stored under `key`, or `undefined` when no record exists. */
  get(key: TKey): Promise<TValue | undefined>;

  /** Reads several keys in one transaction, resolving values positionally — `undefined` for each miss. */
  getMany(keys: ReadonlyArray<TKey>): Promise<(TValue | undefined)[]>;

  /** Writes `value` under `key`, replacing any existing record; resolves once the transaction commits. */
  set(key: TKey, value: TValue): Promise<void>;

  /** Writes every entry in one transaction — all of them commit, or none do. */
  setMany(entries: readonly (readonly [TKey, TValue])[]): Promise<void>;

  /** Removes the record under `key`; removing a missing key succeeds. */
  delete(key: TKey): Promise<void>;

  /** Removes every listed key in one transaction. */
  deleteMany(keys: ReadonlyArray<TKey>): Promise<void>;

  /** Removes every record in the store. */
  clear(): Promise<void>;

  /** Reports whether a record exists under `key` — the unambiguous test, since a stored value may be `undefined`. */
  has(key: TKey): Promise<boolean>;

  /** Counts the records in the store. */
  count(): Promise<number>;

  /** Reads every key, in ascending key order. */
  keys(): Promise<TKey[]>;

  /** Reads every value, in ascending key order. Materializes the store — prefer {@link iterateEntries} when large. */
  values(): Promise<TValue[]>;

  /** Reads every entry, in ascending key order. Materializes the store — prefer {@link iterateEntries} when large. */
  entries(): Promise<[TKey, TValue][]>;

  /**
   * Streams every record through `visit` with a cursor, at constant memory, and resolves with the number
   * visited. The way to walk a store of Blobs without holding them all at once. `visit` must be
   * synchronous, and returning `false` stops the walk early.
   */
  iterateEntries(visit: IdbCursorVisitor<TValue, TKey>): Promise<number>;

  /**
   * Releases the underlying connection. Call it before deleting the database — an open connection blocks a
   * delete. The store stays usable: the next operation re-opens transparently.
   */
  close(): void;
}

/**
 * Builds a {@link KeyValueStore} over one object store, creating the database and store on first use.
 *
 * Returns synchronously and touches nothing ambient, so it is safe at module scope and under SSR; the first
 * *operation* is where an unavailable IndexedDB surfaces, as a rejection.
 *
 * @example
 * const drafts = createKeyValueStore<Blob>({ databaseName: 'editor', storeName: 'attachments' });
 * await drafts.set('cover.png', file);        // a Blob — no JSON round trip, no base64 inflation
 * const restored = await drafts.get('cover.png');
 */
export function createKeyValueStore<TValue, TKey extends IDBValidKey = string>(
  options: KeyValueStoreOptions,
): KeyValueStore<TValue, TKey> {
  const { databaseName, storeName = DefaultKeyValueStoreName, version, upgrade, onVersionChange } = options;

  let connection: Promise<IDBDatabase> | null = null;

  /** Drops the cached connection, but only if `target` is still the current one — a later re-open must survive. */
  function invalidate(target: Promise<IDBDatabase>): void {
    if (connection === target) connection = null;
  }

  /** Opens (or reuses) the connection. Concurrent callers share one open; a failed open is never cached. */
  function connect(): Promise<IDBDatabase> {
    const existing = connection;
    if (existing !== null) return existing;

    const pending: Promise<IDBDatabase> = openDatabase(databaseName, {
      version,
      upgrade: (database, context) => {
        // `contains` matters: the store may already exist from an earlier version, and `createObjectStore`
        // on an existing name throws `ConstraintError`, which would abort the whole migration.
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
        upgrade?.(database, context);
      },
      onVersionChange: () => {
        // `openDatabase` closes the handle right after this; drop it so the next call re-opens at the new
        // version instead of using a dead connection.
        invalidate(pending);
        onVersionChange?.();
      },
    })
      .then((database) => {
        // Fired when the browser force-closes the connection (storage eviction, a hard delete elsewhere).
        // Not fired by an explicit `close()`, which `close()` below handles itself.
        database.addEventListener('close', () => {
          invalidate(pending);
        });
        return database;
      })
      .catch((error: unknown) => {
        invalidate(pending);
        throw toError(error);
      });

    connection = pending;
    return pending;
  }

  /** Runs `body` against this store inside one transaction, resolving when it commits. */
  async function run<TResult>(
    mode: IDBTransactionMode,
    body: (store: IDBObjectStore) => Promise<TResult>,
  ): Promise<TResult> {
    const database = await connect();
    return withTransaction(database, storeName, mode, (transaction) => body(transaction.objectStore(storeName)));
  }

  return {
    databaseName,
    storeName,

    async get(key: TKey): Promise<TValue | undefined> {
      // `get` resolves `undefined` for a missing record — the cast narrows lib.dom's `any` result, it does
      // not change behaviour.
      return run('readonly', (store) => requestToPromise(store.get(key) as IDBRequest<TValue | undefined>));
    },

    async getMany(keys: ReadonlyArray<TKey>): Promise<(TValue | undefined)[]> {
      return run('readonly', (store) => {
        // Every request is issued synchronously in the map, BEFORE the first await — that is what keeps the
        // transaction alive across the `Promise.all`.
        const reads = keys.map((key) => requestToPromise(store.get(key) as IDBRequest<TValue | undefined>));
        return Promise.all(reads);
      });
    },

    async set(key: TKey, value: TValue): Promise<void> {
      await run('readwrite', (store) => requestToPromise(store.put(value, key)));
    },

    async setMany(entries: readonly (readonly [TKey, TValue])[]): Promise<void> {
      await run('readwrite', (store) => {
        const writes = entries.map(([key, value]) => requestToPromise(store.put(value, key)));
        return Promise.all(writes);
      });
    },

    async delete(key: TKey): Promise<void> {
      await run('readwrite', (store) => requestToPromise(store.delete(key)));
    },

    async deleteMany(keys: ReadonlyArray<TKey>): Promise<void> {
      await run('readwrite', (store) => {
        const removals = keys.map((key) => requestToPromise(store.delete(key)));
        return Promise.all(removals);
      });
    },

    async clear(): Promise<void> {
      await run('readwrite', (store) => requestToPromise(store.clear()));
    },

    async has(key: TKey): Promise<boolean> {
      const found = await run('readonly', (store) => requestToPromise(store.count(key)));
      return found > 0;
    },

    async count(): Promise<number> {
      return run('readonly', (store) => requestToPromise(store.count()));
    },

    async keys(): Promise<TKey[]> {
      // Narrowed after the await, not through the request type: `IDBRequest<T>` is invariant in `result`,
      // so asserting the request itself is a TS2352 the element-wise assertion avoids.
      const stored = await run('readonly', (store) => requestToPromise(store.getAllKeys()));
      return stored as TKey[];
    },

    async values(): Promise<TValue[]> {
      return run('readonly', (store) => requestToPromise(store.getAll() as IDBRequest<TValue[]>));
    },

    async entries(): Promise<[TKey, TValue][]> {
      // A cursor rather than zipping `getAllKeys()` with `getAll()`: one pass, and no chance of the two
      // arrays being paired wrongly.
      const collected: [TKey, TValue][] = [];
      await run('readonly', async (store) => {
        await iterate<TValue, TKey>(store, (entry) => {
          collected.push([entry.key, entry.value]);
        });
      });
      return collected;
    },

    async iterateEntries(visit: IdbCursorVisitor<TValue, TKey>): Promise<number> {
      return run('readonly', (store) => iterate<TValue, TKey>(store, visit));
    },

    close(): void {
      const existing = connection;
      connection = null;
      if (existing === null) return;

      void existing.then(
        (database) => {
          database.close();
        },
        () => {
          // The open failed; there is no connection to close and the rejection was already delivered to
          // whoever awaited the operation that triggered it.
        },
      );
    },
  };
}
