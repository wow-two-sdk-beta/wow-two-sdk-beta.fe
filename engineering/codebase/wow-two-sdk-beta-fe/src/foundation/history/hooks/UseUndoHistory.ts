// The Vue seam over the two history flavors — ownership and reactivity, no history logic.
//
// A history is a long-lived mutable object whose interesting members are getters, so a component cannot simply
// hold it and expect its template to update: nothing about `canUndo` flipping is visible to Vue.
// `useHistoryVersion` closes that gap by subscribing to the store and mirroring its monotonic revision into a
// `shallowRef` — identity-stable between changes, which a derived value like `size` or a fresh array would not
// be. Every composable here calls it, so the returned history object is the same object throughout while the
// values read off it stay fresh: read them inside a `computed` that touches the version.
//
// Non-obvious decisions:
// - Options are captured at SETUP, because the history is created once. `limit` and `coalesceMs` are
//   configuration and effectively constant; `onError` and `now` are routed through `toValue` instead, since
//   those two are routinely fresh closures and a stale one would swallow real errors.
// - `useUndoableState` is deliberately uncontrolled-only. A controlled seam (`value` / `onChange`) would let a
//   parent change the value out of band, and the history's `present` — the anchor every entry's `before` was
//   captured against — would silently stop matching the rendered state. Travel would then restore states the
//   parent never agreed to. A caller who must own the value should own a `createSnapshotHistory` too and drive
//   `record` from its own reducer.
// - The setter takes per-call record options, because `coalesceKey` is a property of the interaction (a drag, a
//   typing burst), not of the composable. A component types with one key and drags a slider with another.
// - Nothing here touches a platform global, so the subscription could run at setup — it is still attached in
//   `onMounted` and dropped in `onScopeDispose`, matching every other subscription in the port.

import {
  computed,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  type MaybeRefOrGetter,
  type ShallowRef,
  type WritableComputedRef,
} from 'vue';

import type { HistoryOptions, HistoryStore } from '../HistoryCore';
import { createSnapshotHistory, type SnapshotHistory, type SnapshotRecordOptions } from '../SnapshotHistory';
import { createUndoHistory, type UndoHistory } from '../UndoHistory';

/**
 * Subscribes to a history's changes and returns its version counter, updating on every push, undo, redo, and
 * clear. Use it directly when the history is owned outside a component (a module-scope editor store) and read
 * it inside a `computed` to make that computed track the history.
 */
export function useHistoryVersion(store: HistoryStore): Readonly<ShallowRef<number>> {
  const version = shallowRef(store.version());

  let unsubscribe: (() => void) | undefined;

  onMounted(() => {
    // Re-read first: a change between setup and mount would otherwise be missed entirely.
    version.value = store.version();
    unsubscribe = store.subscribe(() => {
      version.value = store.version();
    });
  });

  onScopeDispose(() => {
    unsubscribe?.();
    unsubscribe = undefined;
  });

  return version;
}

/** Builds the options a scope-owned history is created with, routing the two closure-shaped fields live. */
function scopeOptions(options: MaybeRefOrGetter<HistoryOptions | undefined>): HistoryOptions {
  const initial = toValue(options);
  return {
    limit: initial?.limit,
    coalesceMs: initial?.coalesceMs,
    onError: (error, phase) => toValue(options)?.onError?.(error, phase),
    now: () => (toValue(options)?.now ?? Date.now)(),
  };
}

/** What {@link useUndoHistory} returns — the history plus the cursor that makes it reactive. */
export interface UndoHistoryControls {
  /** The history itself. Stable — pass it down, or to {@link useUndoShortcuts}, unchanged. */
  readonly history: UndoHistory;

  /**
   * The mutation cursor. Its members are getters, so read them inside a `computed` that also touches this —
   * `computed(() => (version.value, history.canUndo))` — and the computed re-evaluates on every change.
   */
  readonly version: Readonly<ShallowRef<number>>;

  /** Whether an undo is available. The pre-derived form of the `version` idiom above. */
  readonly canUndo: Readonly<ShallowRef<boolean>>;

  /** Whether a redo is available. */
  readonly canRedo: Readonly<ShallowRef<boolean>>;
}

/**
 * Owns a command-based {@link UndoHistory} for the scope's lifetime and exposes its reactivity.
 *
 * Returns the history alongside the version cursor and the two flags a toolbar actually renders. The history
 * object never changes identity — pass it down, or to {@link useUndoShortcuts}, without wrapping.
 *
 * @param options History configuration. `limit` / `coalesceMs` are read once; `onError` / `now` stay live.
 */
export function useUndoHistory(options?: MaybeRefOrGetter<HistoryOptions | undefined>): UndoHistoryControls {
  const history = createUndoHistory(scopeOptions(options));
  const version = useHistoryVersion(history);

  return {
    history,
    version,
    canUndo: computed(() => {
      void version.value;
      return history.canUndo;
    }),
    canRedo: computed(() => {
      void version.value;
      return history.canRedo;
    }),
  };
}

/** Publishes the next state — a value or an updater, plus how this particular change should be recorded. */
export type UndoableStateSetter<TState> = (
  next: TState | ((previous: TState) => TState),
  options?: SnapshotRecordOptions,
) => void;

/** What {@link useUndoableState} returns — the value, its setter, and the history behind them. */
export interface UndoableState<TState> {
  /**
   * The current state. Writable, so it drops straight into `v-model`; a `v-model` write records with no options,
   * and `setState` is the way to pass `{ label, coalesceKey }`.
   */
  readonly state: WritableComputedRef<TState>;

  /** Records the next state — a value or an updater — with optional per-call record options. */
  readonly setState: UndoableStateSetter<TState>;

  /** The full {@link SnapshotHistory}: `undo` / `redo` / `canUndo` / `transact`, and the target for shortcuts. */
  readonly history: SnapshotHistory<TState>;

  /** The mutation cursor, for deriving anything the two flags below do not cover. */
  readonly version: Readonly<ShallowRef<number>>;

  /** Whether an undo is available. */
  readonly canUndo: Readonly<ShallowRef<boolean>>;

  /** Whether a redo is available. */
  readonly canRedo: Readonly<ShallowRef<boolean>>;
}

/**
 * A `ref` with a history behind it — the snapshot flavor as a drop-in for small, immutable state.
 *
 * ```ts
 * const { state, setState, history } = useUndoableState('');
 * setState((prev) => prev + 'a', { label: 'Typing', coalesceKey: 'text' });
 * useUndoShortcuts(history);
 * ```
 *
 * `state` is a writable computed over the history's `present`, so travel is visible immediately and a `v-model`
 * write records an entry. An updater is the only way to store a function-typed state.
 */
export function useUndoableState<TState>(
  initial: TState,
  options?: MaybeRefOrGetter<HistoryOptions | undefined>,
): UndoableState<TState> {
  const history = createSnapshotHistory(initial, scopeOptions(options));
  const version = useHistoryVersion(history);

  const setState: UndoableStateSetter<TState> = (next, recordOptions) => {
    // Resolved against the history's live `present`, not a captured value, so two setters in one tick compose.
    const value = typeof next === 'function' ? (next as (previous: TState) => TState)(history.present) : next;
    history.record(value, recordOptions);
  };

  const state = computed<TState>({
    get: () => {
      void version.value;
      return history.present;
    },
    set: (next) => setState(next),
  });

  return {
    state,
    setState,
    history,
    version,
    canUndo: computed(() => {
      void version.value;
      return history.canUndo;
    }),
    canRedo: computed(() => {
      void version.value;
      return history.canRedo;
    }),
  };
}
