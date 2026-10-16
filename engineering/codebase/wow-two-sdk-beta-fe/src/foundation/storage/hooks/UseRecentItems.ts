import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import { type StorageBroker } from '../StorageBroker';
import { usePersistentState } from './UsePersistentState';

/** The default cap on retained recents, applied when `max` is omitted. */
const DefaultMax = 24;

/** Defines the options that configure a recent-items list — identity, cap, and the persistence seam. */
export interface RecentItemsOptions<T> {
  /** Derives a stable de-duplication key for an item; re-pushing a matching item moves it to the front. */
  readonly identify: (item: T) => string;

  /** The maximum number of items retained, most-recent-first; defaults to 24. */
  readonly max?: MaybeRefOrGetter<number>;

  /** The persistence seam the list stores through. Defaults to `localStorageStorageBroker` via `usePersistentState`. */
  readonly broker?: StorageBroker;
}

/** Represents a most-recently-used list plus the operations that mutate it. */
export interface RecentItems<T> {
  /** The retained items, most-recent-first. */
  readonly recents: ComputedRef<ReadonlyArray<T>>;

  /** Records `item` as the most recent — de-duplicated by identity and capped at `max`. */
  readonly push: (item: T) => void;

  /** Empties the list. */
  readonly clear: () => void;
}

/**
 * Prepends `item` to `items` as the most recent, de-duplicating by `identify` (an existing match is removed so
 * the item resurfaces at the front) and capping the result to `max`. Pure — the reducer the composable writes
 * through its adapter.
 */
export function prependRecent<T>(
  items: ReadonlyArray<T>,
  item: T,
  identify: (item: T) => string,
  max: number,
): ReadonlyArray<T> {
  const id = identify(item);
  const withoutDuplicate = items.filter((existing) => identify(existing) !== id);
  return [item, ...withoutDuplicate].slice(0, Math.max(0, max));
}

/**
 * Manages a persisted most-recently-used list under `key`, layered on `usePersistentState`. `push` records an
 * item at the front, de-duplicated by `identify` and capped at `max` (default 24); `clear` empties it. The list
 * inherits the underlying composable's hydrate-on-mount, write-through, and cross-tab sync.
 *
 * `recents` is a read-only computed — mutate the list through `push` / `clear`, never in place.
 */
export function useRecentItems<T>(key: MaybeRefOrGetter<string>, options: RecentItemsOptions<T>): RecentItems<T> {
  const { identify, max = DefaultMax, broker } = options;

  const state = usePersistentState<ReadonlyArray<T>>(key, [], { broker });

  const recents = computed<ReadonlyArray<T>>(() => state.value.value);

  const push = (item: T): void => {
    state.setValue((previous) => prependRecent(previous, item, identify, toValue(max)));
  };

  const clear = (): void => state.setValue([]);

  return { recents, push, clear };
}
