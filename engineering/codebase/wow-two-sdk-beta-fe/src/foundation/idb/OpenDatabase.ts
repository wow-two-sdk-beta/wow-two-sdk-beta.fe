// Opening and deleting a database — the two operations that can DEADLOCK, and the reason this file carries
// more machinery than a thin promise wrapper would suggest.
//
// THE BLOCKED DEADLOCK. A version upgrade (and a delete) needs exclusive access. If any other connection to
// the same database is still open — most often the same app in a second tab, running the previous deploy —
// the request cannot proceed. IndexedDB does not fail it: it fires `blocked` and then WAITS, indefinitely,
// for the other connection to close. A caller that only listens for `success` / `error` gets a promise that
// never settles, which surfaces as a spinner that spins forever with nothing in the console. It is the
// classic IndexedDB production bug, and it is invisible in single-tab development.
//
// Both sides of that deadlock are handled here:
//  - INBOUND, we time-box it. `blocked` starts a timer; if the open has not gone through by
//    `blockedTimeoutMs`, the promise rejects with an error that names the cause. A defined failure beats an
//    infinite wait — the app can prompt "close other tabs and reload" instead of hanging.
//  - OUTBOUND, we refuse to be the blocker. Every connection opened here gets a `versionchange` handler that
//    CLOSES it, so when another tab upgrades or deletes, this tab yields immediately instead of blocking it.
//    That is the reciprocal half most wrappers omit, and omitting it is what makes the deadlock common.
//
// The cost of yielding: after `versionchange` the handle is dead, and further use rejects with
// `InvalidStateError`. `createKeyValueStore` absorbs this by dropping its cached connection and re-opening
// on the next call; a caller holding a raw `IDBDatabase` should pass `onVersionChange` and re-open (or
// reload) itself.
//
// UPGRADE SEMANTICS. `upgrade` runs inside the browser's own version-change transaction. It is the ONLY
// place `createObjectStore` / `createIndex` / `deleteObjectStore` may be called, it must be synchronous
// (awaiting non-IDB work there commits the transaction out from under the schema — see `IdbPromises.ts`),
// and it may be called with any `oldVersion` from 0 (fresh database) upward, so migrations must be written
// as a ladder of `if (oldVersion < n)` steps rather than an if/else on the previous version.

import { toError } from '../errors';
import { requireIndexedDb } from './IndexedDbSupport';

/** The default ceiling, in milliseconds, an open or delete waits after `blocked` before rejecting. */
export const DefaultBlockedTimeoutMs = 3000;

/** Describes the version transition an {@link IdbUpgradeHandler} is being asked to apply. */
export interface IdbUpgradeContext {
  /** The version already on disk — `0` for a database being created for the first time. */
  readonly oldVersion: number;

  /** The version being upgraded to; `null` only when the database is being deleted. */
  readonly newVersion: number | null;

  /** The browser's version-change transaction — the only scope in which schema changes are legal. */
  readonly transaction: IDBTransaction;
}

/**
 * Creates or migrates the schema during a version change. Runs inside the version-change transaction, so it
 * must be **synchronous**: awaiting non-IDB work inside it commits the transaction and breaks the migration.
 * Throwing aborts the version change, leaving the on-disk schema untouched, and rejects the open.
 */
export type IdbUpgradeHandler = (database: IDBDatabase, context: IdbUpgradeContext) => void;

/** Configures {@link openDatabase}. */
export interface OpenDatabaseOptions {
  /** The schema version to open at; omitted opens whatever version exists (or creates v1). */
  readonly version?: number;

  /** Creates or migrates object stores and indexes when the requested version exceeds the stored one. */
  readonly upgrade?: IdbUpgradeHandler;

  /** How long to wait after a `blocked` event before rejecting; defaults to {@link DefaultBlockedTimeoutMs}. */
  readonly blockedTimeoutMs?: number;

  /** Called when another connection blocks this open — the hook for a "close your other tabs" prompt. */
  readonly onBlocked?: () => void;

  /**
   * Called when another connection needs this one closed for its own upgrade or delete. The connection is
   * closed immediately afterwards either way; this hook exists to warn the user or trigger a reload, not to
   * veto the close.
   */
  readonly onVersionChange?: (database: IDBDatabase) => void;
}

/** Configures {@link deleteDatabase}. */
export interface DeleteDatabaseOptions {
  /** How long to wait after a `blocked` event before rejecting; defaults to {@link DefaultBlockedTimeoutMs}. */
  readonly blockedTimeoutMs?: number;

  /** Called when an open connection blocks the delete. */
  readonly onBlocked?: () => void;
}

/**
 * Opens `name`, running `upgrade` when the stored version is below the requested one, and resolves with the
 * live connection.
 *
 * Rejects — never hangs and never throws synchronously — when IndexedDB is unavailable, when the open fails,
 * when `upgrade` throws (the version change is aborted first, so the schema is left intact), or when another
 * connection blocks the upgrade for longer than `blockedTimeoutMs`.
 *
 * The returned connection closes itself if another tab later needs a version change; see the file header for
 * why that is the safe default and what a caller must do about it.
 */
export function openDatabase(name: string, options: OpenDatabaseOptions = {}): Promise<IDBDatabase> {
  const { version, upgrade, blockedTimeoutMs = DefaultBlockedTimeoutMs, onBlocked, onVersionChange } = options;

  return new Promise<IDBDatabase>((resolve, reject) => {
    // Throws when IndexedDB is missing; inside the executor that becomes a rejection, upholding the slice's
    // "reject, never throw" contract.
    const factory = requireIndexedDb();

    let settled = false;
    let blockedTimer: ReturnType<typeof setTimeout> | undefined;

    /** Marks the promise settled and stops the blocked timer; returns false when someone got there first. */
    const claim = (): boolean => {
      if (settled) return false;
      settled = true;
      if (blockedTimer !== undefined) clearTimeout(blockedTimer);
      return true;
    };

    // `open(name, undefined)` is NOT the same as `open(name)` — passing an explicit undefined version is a
    // TypeError in some engines, so the two-argument form is only used when a version was actually given.
    const request = version === undefined ? factory.open(name) : factory.open(name, version);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      if (upgrade === undefined) return;

      // Non-null in an `upgradeneeded` callback by spec; lib.dom types it nullable because the property is
      // null outside one. Treat an absent transaction as a failure rather than casting the guard away.
      const transaction = request.transaction;
      if (transaction === null) {
        if (claim()) reject(new Error(`IndexedDB upgrade for "${name}" started without a version-change transaction.`));
        return;
      }

      try {
        upgrade(request.result, {
          oldVersion: event.oldVersion,
          newVersion: event.newVersion,
          transaction,
        });
      } catch (error: unknown) {
        // Roll the schema back before rejecting: a half-applied migration that commits is unrecoverable,
        // whereas an aborted one leaves the database at its old version and the next load can retry.
        try {
          transaction.abort();
        } catch {
          // Already aborting or finished — the reject below still reports the real cause.
        }
        if (claim()) reject(toError(error));
      }
    };

    request.onsuccess = () => {
      const database = request.result;

      // A `blocked` timeout may already have rejected while the other tab held the lock. If the open then
      // succeeds anyway, this connection would leak and — worse — go on blocking the next upgrade. Close it.
      if (!claim()) {
        try {
          database.close();
        } catch {
          // Nothing to recover: the promise is already settled either way.
        }
        return;
      }

      database.onversionchange = () => {
        try {
          onVersionChange?.(database);
        } finally {
          // Always close, even if the hook threw: holding on is what deadlocks the other tab.
          database.close();
        }
      };

      resolve(database);
    };

    request.onerror = () => {
      if (claim()) reject(request.error ?? new Error(`Failed to open IndexedDB database "${name}".`));
    };

    request.onblocked = () => {
      if (settled) return;
      try {
        onBlocked?.();
      } catch (error) {
        if (claim()) reject(toError(error));
        return;
      }
      if (blockedTimer !== undefined) return;

      // Do not reject immediately — the common case is another tab closing within a few hundred ms, after
      // which the open proceeds normally. Reject only if it stays stuck.
      blockedTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(
            new Error(
              `Opening IndexedDB database "${name}" is blocked: another connection (usually this app in ` +
                `another tab) still holds an older version open, and no upgrade can run until it closes. ` +
                `Waited ${String(blockedTimeoutMs)}ms.`,
            ),
          );
        }
      }, blockedTimeoutMs);
    };
  });
}

/**
 * Deletes `name` and everything in it, resolving once the database is gone. Deleting a database that does
 * not exist succeeds — the postcondition is "no such database", which already holds.
 *
 * Blocks on open connections exactly like an upgrade does, so it is time-boxed the same way and rejects with
 * a diagnostic error rather than hanging. Close your own connections first (`store.close()`, or
 * `database.close()`) — a connection this tab still holds will block the delete just as another tab's would.
 */
export function deleteDatabase(name: string, options: DeleteDatabaseOptions = {}): Promise<void> {
  const { blockedTimeoutMs = DefaultBlockedTimeoutMs, onBlocked } = options;

  return new Promise<void>((resolve, reject) => {
    const factory = requireIndexedDb();

    let settled = false;
    let blockedTimer: ReturnType<typeof setTimeout> | undefined;

    /** Marks the promise settled and stops the blocked timer; returns false when someone got there first. */
    const claim = (): boolean => {
      if (settled) return false;
      settled = true;
      if (blockedTimer !== undefined) clearTimeout(blockedTimer);
      return true;
    };

    const request = factory.deleteDatabase(name);

    request.onsuccess = () => {
      if (claim()) resolve();
    };

    request.onerror = () => {
      if (claim()) reject(request.error ?? new Error(`Failed to delete IndexedDB database "${name}".`));
    };

    request.onblocked = () => {
      if (settled) return;
      try {
        onBlocked?.();
      } catch (error) {
        if (claim()) reject(toError(error));
        return;
      }
      if (blockedTimer !== undefined) return;

      blockedTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(
            new Error(
              `Deleting IndexedDB database "${name}" is blocked: a connection is still open. Close every ` +
                `connection to it (this tab's included) before deleting. Waited ${String(blockedTimeoutMs)}ms.`,
            ),
          );
        }
      }, blockedTimeoutMs);
    };
  });
}
