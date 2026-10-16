// The command-based flavor — a history of REVERSIBLE ACTIONS. Each entry pairs the work that applies a change
// with the work that reverses it, so the stack stores intent (`do` / `undo`) rather than data.
//
// Choose this flavor when the state being edited is large, shared, or lives outside Vue — a canvas document,
// a graph, a server-backed list. Reversing a cell edit costs one closure regardless of how big the document is,
// and the change can reach anywhere (a ref, a DOM node, a store) because nothing here inspects state at all.
// The price is that correctness is the caller's: an `undo` that does not exactly reverse its `do` silently
// desynchronises the app from its history, and nothing in this file can detect that. `SnapshotHistory` makes
// the opposite trade — see the barrel header for the side-by-side.
//
// Non-obvious decisions:
// - `push` does NOT run `do`. The overwhelmingly common shape is "the change already happened, record how to
//   take it back", so `do` exists purely to replay on redo. `execute` is the other half for callers that want
//   the history to drive the change instead.
// - Merged actions replay forward in push order and unwind in REVERSE order. Any other pairing fails as soon as
//   two coalesced edits touch the same field: undoing the first before the second restores a stale value.

import { createHistoryCore, type HistoryOptions, type HistoryStore } from './HistoryCore';

/** One reversible unit of work — what a command-based history stores and travels over. */
export interface UndoableAction {
  /** Human label for menus and history panels (`'Delete row'`). Surfaces as `undoLabel` / `redoLabel`. */
  readonly label?: string;

  /**
   * Applies the change. Called by `redo()` and by `execute()` — never by `push()`, which assumes the change
   * has already been made.
   */
  readonly do: () => void;

  /** Reverses the change. Must undo exactly what `do` applies, or the app and its history drift apart. */
  readonly undo: () => void;

  /**
   * Merges this action into the previous one when they share the key and land inside the coalescing window —
   * the mechanism that makes a typed word one undo step instead of eight.
   */
  readonly coalesceKey?: string;
}

/** The travel work one entry carries, once the core has taken ownership of the label and coalescing key. */
interface SingleAction {
  readonly do: () => void;
  readonly undo: () => void;
}

type ActionPayload = SingleAction | { readonly previous: ActionPayload; readonly next: ActionPayload };

/** Replays grouped actions iteratively without consuming the JavaScript call stack. */
function applyActions(payload: ActionPayload, forward: boolean): void {
  const pending = [payload];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if ('previous' in current) {
      if (forward) pending.push(current.next, current.previous);
      else pending.push(current.previous, current.next);
    } else if (forward) current.do();
    else current.undo();
  }
}

/** A history of reversible actions — {@link createUndoHistory}'s product. */
export interface UndoHistory extends HistoryStore {
  /**
   * Records an already-applied action. Truncates the redo branch, evicts past `limit`, and merges into the
   * previous entry when `coalesceKey` matches inside the window.
   */
  readonly push: (action: UndoableAction) => void;

  /**
   * Runs the action's `do`, then records it — for callers that route every mutation through the history.
   * A throwing `do` propagates and records nothing, so a failed action never enters the stack.
   */
  readonly execute: (action: UndoableAction) => void;
}

/**
 * Creates a command-based history.
 *
 * ```ts
 * const history = createUndoHistory({ limit: 100 });
 * rows.splice(index, 1);
 * history.push({ label: 'Delete row', do: () => rows.splice(index, 1), undo: () => rows.splice(index, 0, row) });
 * ```
 */
export function createUndoHistory(options?: HistoryOptions): UndoHistory {
  const core = createHistoryCore<ActionPayload>({
    applyForward: (payload) => applyActions(payload, true),
    applyBackward: (payload) => applyActions(payload, false),
    mergePayloads: (previous, next) => ({ previous, next }),
    options,
  });

  /** Records an action without running it. */
  function push(action: UndoableAction): void {
    core.push({
      label: action.label,
      coalesceKey: action.coalesceKey,
      payload: { do: action.do, undo: action.undo },
    });
  }

  // Delegated member by member rather than spread: `canUndo` and friends are live getters on the core, and a
  // spread would call each one once and freeze that answer into the facade.
  return {
    push,

    execute(action: UndoableAction): void {
      action.do();
      push(action);
    },

    transact: core.transact,
    undo: core.undo,
    redo: core.redo,
    clear: core.clear,
    subscribe: core.subscribe,
    version: core.version,

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
