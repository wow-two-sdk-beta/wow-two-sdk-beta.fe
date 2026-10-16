// The event -> promise adapters every other file in this slice is built on. IndexedDB predates promises: an
// `IDBRequest` reports through `onsuccess` / `onerror`, an `IDBTransaction` through `oncomplete` / `onerror`
// / `onabort`. Bridging them is mechanical but has three traps worth stating once, here.
//
// TRAP 1 — THE TRANSACTION AUTO-CLOSE HAZARD. This is the defining constraint of the whole slice. A
// transaction stays alive only while the browser can see IndexedDB work pending on it; once control returns
// to the event loop with no pending request, it commits and any later use throws `TransactionInactiveError`.
// A promise built from an IDB request is safe to `await` — it settles inside the request's own event
// callback, and the spec keeps the transaction active for that callback plus the microtask checkpoint that
// follows it. Awaiting ANYTHING ELSE is not:
//
//   await withTransaction(db, 'items', 'readwrite', async (tx) => {
//     const store = tx.objectStore('items');
//     const current = await requestToPromise(store.get('k'));   // fine — IDB work keeps tx alive
//     const patch = await fetch('/api/patch').then((r) => r.json()); // ☠ tx commits during this await
//     await requestToPromise(store.put(patch, 'k'));            // throws TransactionInactiveError
//   });
//
// The rule: read everything you need, leave the transaction to do unrelated async work, then open a second
// transaction to write. `setTimeout(0)`, a `postMessage` round trip, an image decode, and an `await` on an
// already-resolved unrelated promise all trip this — it is not about elapsed time, it is about yielding to
// the event loop.
//
// TRAP 2 — SETTLE EXACTLY ONCE. `requestToPromise` guards against a second settle rather than relying on
// promise semantics to swallow it, because one request genuinely can fire `success` many times: a cursor
// request re-fires on every `continue()`. Resolving on the first record would silently truncate iteration to
// one row, so cursors get their own loop in `Transactions.ts` and must never be passed here.
//
// TRAP 3 — ATTACH IN THE CREATING TASK. Both wrappers must be called synchronously in the same task that
// created the request/transaction. Register a listener a task later and the event may already have fired,
// leaving a promise that never settles — the same shape of hang as an unhandled `blocked` event.

/**
 * Wraps a single-shot `IDBRequest` as a promise resolving to its `result`. Settles exactly once: on
 * `success` with the result, on `error` with the request's `DOMException` (normalized to an `Error` when the
 * browser leaves it null).
 *
 * Must be called in the same task the request was created in (TRAP 3), and must NOT be used for a cursor
 * request (TRAP 2) — use `iterate` instead.
 *
 * Rejecting here does **not** stop the failure from propagating: an unhandled request error bubbles to the
 * transaction and aborts it, which is IndexedDB's designed behaviour and usually what you want. A caller
 * that needs the transaction to survive a failed request must handle it inside the request's own event
 * callback, which this wrapper deliberately does not expose.
 */
export function requestToPromise<TResult>(request: IDBRequest<TResult>): Promise<TResult> {
  return new Promise<TResult>((resolve, reject) => {
    let settled = false;

    request.onsuccess = () => {
      if (settled) return;
      settled = true;
      resolve(request.result);
    };

    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(request.error ?? new Error('IndexedDB request failed without reporting an error.'));
    };
  });
}

/**
 * Wraps an `IDBTransaction` as a promise that resolves when it **commits** (`complete`) and rejects when it
 * fails (`error`) or is rolled back (`abort`). Settles exactly once.
 *
 * Resolving on `complete` rather than on the last request's success is the point: only `complete` means the
 * writes are durable. An `abort` — whether from an unhandled request error, an explicit `abort()` call, or a
 * quota failure — rejects, so a caller cannot mistake a rolled-back transaction for a committed one.
 *
 * Must be called in the same task the transaction was created in (TRAP 3).
 */
export function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    transaction.oncomplete = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    transaction.onerror = () => {
      if (settled) return;
      settled = true;
      reject(transaction.error ?? new Error('IndexedDB transaction failed without reporting an error.'));
    };

    transaction.onabort = () => {
      if (settled) return;
      settled = true;
      // A deliberate `abort()` leaves `transaction.error` null — there was no failure, the rollback WAS the
      // outcome. Report it as an error anyway: the caller asked for a commit and did not get one.
      reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
    };
  });
}
