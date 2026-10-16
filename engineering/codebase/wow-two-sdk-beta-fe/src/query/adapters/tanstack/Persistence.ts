import { queryScope } from './QueryLifetime';
import { dehydrate, hydrate, type DehydratedState, type QueryClient, type QueryKey } from '@tanstack/vue-query';

const DefaultStorageKey = 'app:query-cache';
const DefaultMaxAgeMs = 24 * 60 * 60_000; // 24h
const WriteThrottleMs = 1_000;
const owners = new WeakMap<Window, Map<string, symbol>>();

/** The envelope written to storage — the dehydrated cache plus what restore has to validate before trusting it. */
interface PersistedSnapshot {
  readonly buster: string;
  readonly timestamp: number;
  readonly state: DehydratedState;
}

/** Defines options for `setupQueryPersistence`. */
export interface SetupQueryPersistenceOptions {
  /** Explicit allowlist predicate, used on both write and restore. Scope keys to this identity/tenant. */
  readonly includes: (key: QueryKey) => boolean;
  /** The `localStorage` key the dehydrated cache is written under. */
  readonly storageKey?: string;
  /** The max age of a restored cache in ms; an older cache is discarded on restore. */
  readonly maxAgeMs?: number;
  /** A cache-busting string; a mismatch discards the persisted cache. */
  readonly buster?: string;
}

/** Represents the handles returned by `setupQueryPersistence`. */
export interface QueryPersistenceHandle {
  /** Stops persisting further cache changes. */
  readonly unsubscribe: () => void;
  /** Resolves once the persisted cache has been restored into the client. */
  readonly restored: Promise<void>;
  /** Stops writes and removes this owner's persisted private snapshot. */
  readonly clear: () => void;
}

/**
 * Wires `localStorage` persistence for the query cache (opt-in — call from `main.ts`); returns null
 * when there is no `window` (SSR-safe).
 *
 * Built on `dehydrate` / `hydrate` straight out of `@tanstack/vue-query` rather than on the
 * `persist-client` + `sync-storage-persister` package pair: those two are separate installs, and the
 * whole of what they add over this is an async persister interface this synchronous store does not
 * need. The restore is therefore SYNCHRONOUS — the cache is already hydrated when the call returns,
 * and `restored` is an already-settled promise kept for API parity.
 *
 * Caveats to weigh before opting in:
 * - **Sensitive data** — every allowlisted successful query dehydrates into `localStorage` in plain text,
 *   including authenticated user data; any script on the origin can read it. Do not enable on apps
 *   whose cache holds secrets/PII, or scope what queries cache to begin with.
 * - **Version busting** — pass `buster` (e.g. the app version) whenever a release changes cached
 *   shapes; a restored stale shape otherwise flows into typed hooks unchecked.
 * - **Quota** — a full `localStorage` makes the write silently fail (no retry strategy is wired);
 *   the app keeps working, persistence just lags.
 * - **Rich values** — this JSON persistence does not preserve Temporal objects or class instances.
 *   Allowlist only JSON payload caches; keep decoded rich values in computed presentation mappings.
 */
export function setupQueryPersistence(
  client: QueryClient,
  options: SetupQueryPersistenceOptions,
): QueryPersistenceHandle | null {
  if (typeof window === 'undefined') return null;

  const { storageKey = DefaultStorageKey, maxAgeMs = DefaultMaxAgeMs, buster = '', includes } = options;

  const registry = owners.get(window) ?? new Map<string, symbol>();
  owners.set(window, registry);
  const owner = Symbol(storageKey);
  registry.set(storageKey, owner);
  const owns = (): boolean => registry.get(storageKey) === owner;
  const scope = queryScope(client);
  const origin = scope.capture();
  if (origin.isCurrent()) restore(client, storageKey, maxAgeMs, buster, includes);

  // Throttled: a burst of cache events (one query settling touches the cache several times) must not
  // serialize the whole cache once per event.
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  const schedule = (): void => {
    if (!origin.isCurrent() || !owns() || stopped || timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      if (origin.isCurrent() && owns() && !stopped) write(client, storageKey, buster, includes);
    }, WriteThrottleMs);
  };

  const unsubscribeQueries = client.getQueryCache().subscribe(schedule);
  const unsubscribeMutations = client.getMutationCache().subscribe(schedule);

  // A disposed scope invokes subscribers immediately, before assignment completes.
  let unsubscribeScope: () => void = () => {};
  const unsubscribe = (): void => {
    stopped = true;
    if (owns()) registry.delete(storageKey);
    unsubscribeQueries();
    unsubscribeMutations();
    unsubscribeScope();
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const clear = (): void => {
    const currentOwner = owns();
    unsubscribe();
    try {
      if (currentOwner) window.localStorage.removeItem(storageKey);
    } catch {
      /* Storage is best-effort. */
    }
  };
  unsubscribeScope = scope.subscribe(clear);
  return { unsubscribe, clear, restored: Promise.resolve() };
}

/** Hydrates the client from storage when the snapshot is present, current, and matches the buster. */
function restore(
  client: QueryClient,
  storageKey: string,
  maxAgeMs: number,
  buster: string,
  includes: (key: QueryKey) => boolean,
): void {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return;

    const snapshot = JSON.parse(raw) as PersistedSnapshot;
    const isStale =
      !Number.isFinite(snapshot.timestamp) ||
      snapshot.timestamp > Date.now() ||
      Date.now() - snapshot.timestamp > maxAgeMs;
    if (snapshot.buster !== buster || isStale) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    if (!snapshot.state || !Array.isArray(snapshot.state.queries)) return;
    // Mutations are never persisted. Recheck the allowlist before hydration touches the client.
    const queries = snapshot.state.queries.filter((query) => Array.isArray(query.queryKey) && includes(query.queryKey));
    hydrate(client, { queries, mutations: [] });
  } catch {
    // Unreadable / unparseable / storage unavailable — a missing cache is always a valid state.
  }
}

/** Serializes the dehydrated cache into storage, tolerating storage being unavailable (private mode / quota). */
function write(client: QueryClient, storageKey: string, buster: string, includes: (key: QueryKey) => boolean): void {
  try {
    const snapshot: PersistedSnapshot = {
      buster,
      timestamp: Date.now(),
      state: dehydrate(client, {
        shouldDehydrateQuery: (query) => query.state.status === 'success' && includes(query.queryKey),
        shouldDehydrateMutation: () => false,
      }),
    };
    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
  } catch {
    // Persistence is best-effort — swallow.
  }
}
