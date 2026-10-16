// A versioned wrapper over a `StorageBroker`. Persisted client state outlives the code that wrote it: a user
// carries last month's `localStorage` into today's deploy. A `VersionedStore` stamps each value with a schema
// `version` and, on read, walks a migration chain from the stored version up to the current one — so an old
// shape is upgraded in place instead of silently mis-parsed. It inherits the broker's failure-tolerance: any
// unrecoverable state (missing migration, a future version, a broken read) degrades to `initial`, never a throw.

import { localStorageStorageBroker, type StorageBroker } from './StorageBroker';

/** Upgrades a value from one schema version to the next. Receives the prior shape as `unknown`; returns the next. */
export type Migration = (previous: unknown) => unknown;

/** A map from *source* version to the migration that upgrades it to the following version (`n` upgrades `n`→`n+1`). */
export type MigrationMap = Readonly<Record<number, Migration>>;

/** Configures a versioned store. */
export interface VersionedStoreOptions<T> {
  /** The storage key the envelope is persisted under. */
  readonly key: string;

  /** The current schema version (a positive integer). A stored value below this is migrated up on read. */
  readonly version: number;

  /** The value returned when nothing is stored or the stored value cannot be recovered. */
  readonly initial: T;

  /** Migrations keyed by source version; `migrations[n]` upgrades a v`n` value to v`n+1`. */
  readonly migrations?: MigrationMap;

  /** The backing persistence seam; defaults to `localStorageStorageBroker`. */
  readonly broker?: StorageBroker;
}

/** A versioned view over a storage key — hydrate-with-migration on read, envelope-stamp on write. */
export interface VersionedStore<T> {
  /** The storage key this store owns. */
  readonly key: string;

  /** The current schema version. */
  readonly version: number;

  /** Reads and, if needed, migrates the stored value; returns `initial` on absence or any unrecoverable state. */
  read(): T;

  /** Writes `value` stamped with the current version. */
  write(value: T): void;

  /** Removes the stored value. */
  clear(): void;
}

/** The persisted shape: the schema version alongside the caller's data. */
interface Envelope {
  readonly v: number;
  readonly data: unknown;
}

/** Recognises a value as a version envelope (vs a legacy bare value written before versioning). */
function isEnvelope(value: unknown): value is Envelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'v' in value &&
    'data' in value &&
    typeof (value as Envelope).v === 'number'
  );
}

/**
 * Builds a {@link VersionedStore} over `key`. On `read`, a stored value is interpreted as:
 * - **current version** → returned as-is;
 * - **older version** → each `migrations[n]` is applied in turn from the stored version up to `version`, the
 *   upgraded value is written back, and returned. A gap in the chain (a missing `migrations[n]`) yields `initial`;
 * - **newer version** (a rollback to older code) → `initial`, leaving the forward-written value untouched;
 * - **legacy bare value** (no envelope) → treated as version `0` and migrated the same way.
 *
 * Any thrown error inside migration or the broker degrades to `initial`, mirroring the broker's never-throw contract.
 */
export function createVersionedStore<T>(options: VersionedStoreOptions<T>): VersionedStore<T> {
  const { key, version, initial, migrations = {} } = options;
  const broker = options.broker ?? localStorageStorageBroker;

  /** Runs the migration chain from `fromVersion` to the current `version`; null when a step is missing. */
  function migrate(fromVersion: number, data: unknown): { data: unknown } | null {
    let current = data;
    for (let from = fromVersion; from < version; from++) {
      const step = migrations[from];
      if (step === undefined) return null; // chain gap — cannot safely interpret the old shape
      current = step(current);
    }
    return { data: current };
  }

  return {
    key,
    version,

    read(): T {
      try {
        const stored = broker.read<unknown>(key);
        if (stored === null) return initial;

        const { v, data } = isEnvelope(stored) ? stored : { v: 0, data: stored };

        if (v === version) return data as T;
        if (v > version) return initial; // forward-written by newer code — don't guess

        const migrated = migrate(v, data);
        if (migrated === null) return initial;

        // Persist the upgrade so the next read is a fast, migration-free hit.
        broker.write<Envelope>(key, { v: version, data: migrated.data });
        return migrated.data as T;
      } catch {
        return initial;
      }
    },

    write(value: T): void {
      broker.write<Envelope>(key, { v: version, data: value });
    },

    clear(): void {
      broker.remove(key);
    },
  };
}
