// Store-level operations: run a unit of work inside one transaction, and walk a store with a cursor.
//
// WHY `withTransaction` RESOLVES ON COMMIT, NOT ON THE LAST REQUEST. A `put` reports success as soon as the
// value is accepted, well before the transaction commits — and a transaction can still abort afterwards
// (quota exceeded, a constraint violation from a sibling request, an explicit `abort()`). Resolving on the
// last request's success would therefore report writes as durable that a moment later never happened. The
// completion listener is attached synchronously at creation, BEFORE the work runs, because `complete` can
// fire the instant the work function returns; attaching it after would race the event.
//
// FAILURE => ROLLBACK, ALWAYS. If the work function throws or rejects, the transaction is aborted rather
// than left to commit whatever it managed to do first. The error that surfaces is the work function's, not
// the resulting `AbortError`: the cause the caller can act on is "your callback threw", not "something
// rolled back". The completion rejection is deliberately absorbed in that path so it does not resurface as
// an unhandled rejection.
//
// THE AUTO-CLOSE HAZARD APPLIES INSIDE `fn` — awaiting anything that is not an IDB request promise commits
// the transaction out from under the rest of the callback. Full explanation and worked example:
// `IdbPromises.ts` header, TRAP 1.
//
// WHY `iterate` EXISTS ALONGSIDE `getAll`. `getAll()` materializes every record into one array: fine for a
// few hundred small rows, ruinous for a store holding thousands of Blobs, where the peak is the whole store
// resident in memory at once. A cursor streams one record at a time at constant memory, and can stop early.
// It cannot reuse `requestToPromise` — a cursor request re-fires `success` on every `continue()`, and a
// settle-once wrapper would silently truncate the walk to a single record — so it runs its own loop.

import { toError } from '../errors';
import { transactionToPromise } from './IdbPromises';

/** One record surfaced by {@link iterate}. */
export interface IdbEntry<TValue, TKey extends IDBValidKey = IDBValidKey> {
  /** The cursor's key — the index key when iterating an index, otherwise the primary key. */
  readonly key: TKey;

  /** The record's primary key in the object store; identical to `key` unless iterating an index. */
  readonly primaryKey: IDBValidKey;

  /** The stored value. */
  readonly value: TValue;
}

/**
 * Visits one record during {@link iterate}. **Must be synchronous** — returning a promise, or awaiting
 * anything inside, commits the transaction mid-walk and the next `continue()` throws
 * `TransactionInactiveError`. Collect into an array here and do the async work after `iterate` resolves.
 *
 * Return `false` to stop the walk early; any other return value continues it.
 */
export type IdbCursorVisitor<TValue, TKey extends IDBValidKey = IDBValidKey> = (
  entry: IdbEntry<TValue, TKey>,
) => void | boolean;

/** Narrows an {@link iterate} walk to a subset of the key space, in a chosen direction. */
export interface IterateOptions {
  /** Restricts the walk to a single key or a key range; omitted walks every record. */
  readonly query?: IDBValidKey | IDBKeyRange | null;

  /** Cursor direction — `'next'` (ascending, the default), `'prev'`, or the `unique` variants. */
  readonly direction?: IDBCursorDirection;
}

/**
 * Runs `fn` inside a single transaction over `storeNames` and resolves with its result **once the
 * transaction commits**, so a resolved promise means the writes are durable.
 *
 * Rejects — never throws synchronously — when the transaction cannot be created (database closed, unknown
 * store), when `fn` fails (the transaction is aborted first, so nothing partial is committed), and when the
 * transaction itself errors or aborts. Every rejection value is normalized through `toError`.
 *
 * `fn` may await IDB request promises freely, but nothing else; see the file header.
 */
export async function withTransaction<TResult>(
  database: IDBDatabase,
  storeNames: string | ReadonlyArray<string>,
  mode: IDBTransactionMode,
  fn: (transaction: IDBTransaction) => TResult | Promise<TResult>,
): Promise<TResult> {
  // Copied to a mutable array because lib.dom's older overload accepts `string | string[]`, not a readonly
  // array; the copy also stops a caller mutating the list mid-transaction.
  const names = typeof storeNames === 'string' ? storeNames : [...storeNames];

  let transaction: IDBTransaction;
  try {
    transaction = database.transaction(names, mode);
  } catch (error: unknown) {
    // `InvalidStateError` (connection closed, typically after a `versionchange`) or `NotFoundError` (no such
    // store) — both arrive synchronously and must surface as a rejection like every other failure here.
    throw toError(error);
  }

  // Attached before `fn` runs: `complete` can fire in the same turn the work finishes.
  const completion = transactionToPromise(transaction);
  // Observe aborts immediately while a delegate may still be waiting for its own async work.
  void completion.catch(() => undefined);

  let result: TResult;
  try {
    result = await fn(transaction);
  } catch (error: unknown) {
    try {
      transaction.abort();
    } catch {
      // Already finished or aborting — the original error below is still the useful one.
    }
    // The abort makes `completion` reject; nobody awaits it on this path, so absorb it rather than let it
    // surface as an unhandled rejection.
    completion.catch(() => undefined);
    throw toError(error);
  }

  try {
    await completion;
  } catch (error: unknown) {
    throw toError(error);
  }

  return result;
}

/**
 * Walks `source` with a cursor, calling `visit` once per record, and resolves with the number of records
 * visited. Constant memory regardless of store size — the reason to prefer it over `getAll` for anything
 * large — and stoppable early by returning `false` from `visit`.
 *
 * Runs inside whatever transaction `source` belongs to, so it composes with {@link withTransaction}. `visit`
 * must be synchronous; see {@link IdbCursorVisitor}.
 */
export function iterate<TValue, TKey extends IDBValidKey = IDBValidKey>(
  source: IDBObjectStore | IDBIndex,
  visit: IdbCursorVisitor<TValue, TKey>,
  options: IterateOptions = {},
): Promise<number> {
  const { query = null, direction = 'next' } = options;

  return new Promise<number>((resolve, reject) => {
    let visited = 0;
    let settled = false;

    let request: IDBRequest<IDBCursorWithValue | null>;
    try {
      request = source.openCursor(query, direction);
    } catch (error: unknown) {
      reject(toError(error));
      return;
    }

    // Not `requestToPromise`: this request fires `success` once per record (see the file header).
    request.onsuccess = () => {
      if (settled) return;

      const cursor = request.result;
      if (cursor === null) {
        // Null cursor = the walk is over. This is the ONLY successful exit.
        settled = true;
        resolve(visited);
        return;
      }

      let keepGoing: void | boolean;
      try {
        keepGoing = visit({
          key: cursor.key as TKey,
          primaryKey: cursor.primaryKey,
          value: cursor.value as TValue,
        });
      } catch (error: unknown) {
        // A throwing visitor stops the walk. The transaction is left alone — `withTransaction` decides
        // whether to abort it, since it owns the transaction and this function does not.
        settled = true;
        reject(toError(error));
        return;
      }

      visited++;
      if (keepGoing === false) {
        settled = true;
        resolve(visited);
        return;
      }

      try {
        cursor.continue();
      } catch (error: unknown) {
        // Almost always `TransactionInactiveError` from an async visitor having yielded to the event loop.
        settled = true;
        reject(toError(error));
      }
    };

    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(request.error ?? new Error('IndexedDB cursor failed without reporting an error.'));
    };
  });
}
