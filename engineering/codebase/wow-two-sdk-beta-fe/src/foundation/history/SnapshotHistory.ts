// The snapshot-based flavor — a history of STATES rather than of work. Each entry keeps the value before a
// change and the value after it, so travelling is an assignment and there is no way for undo to disagree with do.
//
// Choose this flavor when the edited state is small and immutable — a form's values, a filter set, a colour
// picker, a small drawing model. It cannot desynchronise the way the command flavor can, and a caller writes no
// reversal logic at all. The price is memory and identity: every entry pins a whole state object, and undoing
// hands back the previous REFERENCE, so anything holding the old value keeps working while anything that mutated
// it in place has already corrupted both ends of the entry. Keep the state immutable and this flavor is the
// simpler one by a wide margin.
//
// Non-obvious decisions:
// - `record` publishes `present` immediately, then hands the before/after pair to the core. The caller has
//   already decided the new state is current; the history is a witness, not a gatekeeper.
// - Merging two adjacent snapshots keeps the OUTER pair (`previous.before` → `next.after`) and discards the
//   intermediate value. That is precisely what coalescing means for states: one undo jumps the whole run.
// - Recording the identical reference is a no-op. A setter that returns its own input is a common shape and must not
//   deposit an entry that undoes to the value it already holds.

import { createHistoryCore, type HistoryOptions, type HistoryStore } from './HistoryCore';

/** The state pair one entry carries — travelling is assigning one of these two ends to `present`. */
interface SnapshotPayload<TState> {
  readonly before: TState;
  readonly after: TState;
}

/** Per-call tuning for {@link SnapshotHistory.record}. */
export interface SnapshotRecordOptions {
  /** Human label for menus and history panels (`'Rename'`). Surfaces as `undoLabel` / `redoLabel`. */
  readonly label?: string;

  /**
   * Merges this state into the previous entry when they share the key and land inside the coalescing window —
   * so a slider drag or a typed word collapses to a single undo step.
   */
  readonly coalesceKey?: string;
}

/** A history of states — {@link createSnapshotHistory}'s product. */
export interface SnapshotHistory<TState> extends HistoryStore {
  /** The current state. A live getter: re-read it after every notification. */
  readonly present: TState;

  /**
   * Publishes `state` as the present and records the step from the previous one. Truncates the redo branch,
   * evicts past `limit`, and merges into the previous entry when `coalesceKey` matches inside the window.
   * Recording the state already held is a no-op.
   */
  readonly record: (state: TState, options?: SnapshotRecordOptions) => void;
}

/**
 * Creates a snapshot-based history seeded with `initial`.
 *
 * ```ts
 * const history = createSnapshotHistory({ title: '' }, { limit: 50 });
 * history.record({ title: 'Hel' }, { coalesceKey: 'title' });
 * history.record({ title: 'Hello' }, { coalesceKey: 'title' }); // same undo step
 * history.undo(); // present → { title: '' }
 * ```
 */
export function createSnapshotHistory<TState>(initial: TState, options?: HistoryOptions): SnapshotHistory<TState> {
  let present = initial;

  const core = createHistoryCore<SnapshotPayload<TState>>({
    applyForward: (payload) => {
      present = payload.after;
    },
    applyBackward: (payload) => {
      present = payload.before;
    },
    mergePayloads: (previous, next) => ({ before: previous.before, after: next.after }),
    options,
  });

  // Delegated member by member rather than spread — `present`, `canUndo` and friends are live getters, and a
  // spread would call each one once and freeze that answer into the facade.
  return {
    record(state: TState, recordOptions?: SnapshotRecordOptions): void {
      if (Object.is(state, present)) return;
      const before = present;
      present = state;
      core.push({
        label: recordOptions?.label,
        coalesceKey: recordOptions?.coalesceKey,
        payload: { before, after: state },
      });
    },

    transact: core.transact,
    undo: core.undo,
    redo: core.redo,
    clear: core.clear,
    subscribe: core.subscribe,
    version: core.version,

    get present(): TState {
      return present;
    },

    get canUndo(): boolean {
      return core.canUndo;
    },

    get canRedo(): boolean {
      return core.canRedo;
    },

    get size(): number {
      return core.size;
    },

    get undoLabel(): string | undefined {
      return core.undoLabel;
    },

    get redoLabel(): string | undefined {
      return core.redoLabel;
    },
  };
}
