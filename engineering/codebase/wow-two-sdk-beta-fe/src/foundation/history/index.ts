// undo — foundation seam. Undo/redo history, headless: the branch rules (truncate · limit · coalesce · group)
// in one engine, exposed through two flavors that suit different applications, plus the Vue and keyboard seams.
//
// TWO FLAVORS, ONE CORE. The choice is about what an entry costs and who guarantees correctness:
//
// - `createUndoHistory` — COMMAND based. An entry is a `do` / `undo` pair, so reversing a change costs one
//   closure no matter how large the document is, and the change may live anywhere: a ref, a canvas, a DOM node,
//   a server. The caller guarantees `undo` exactly reverses `do`; nothing here can check that. Reach for it on
//   big or externally-owned state.
// - `createSnapshotHistory` — SNAPSHOT based. An entry is the state before and after, so travelling is an
//   assignment and undo cannot disagree with do. It pins a whole state object per entry and hands back the old
//   REFERENCE, which is correct for immutable state and corrupting for state mutated in place. Reach for it on
//   small, immutable state — a form, a filter set, a colour picker.
//
// Both run on `HistoryCore`, so the rule that actually decides whether an undo stack feels right — a new entry
// after an undo TRUNCATES the redo branch — is written once and cannot drift between them. Same for `limit`
// (evicting the oldest entry), coalescing (a same-keyed push inside `coalesceMs` merges into the previous entry,
// which is what makes a typed word one undo step instead of eight), `transact` (every push inside the body
// becomes one reversible entry, nested calls flattening into the outermost), and the failure rule: an `undo` or
// `redo` that throws leaves the cursor exactly where it was and reports to `onError`, never half-travelled.
//
// COMPOSES WITH `foundation/commands`. A `Command` is an invocable action with an id and a title; an entry here
// is a reversible one. The pairing is a command whose `run` applies a change and then pushes its inverse —
// `registry.register({ id: 'row.delete', title: 'Delete row', run: () => history.execute(deleteRow(id)) })` —
// which gives one action a palette row, a chord, a menu item, AND a place in the undo stack. The two slices stay
// independent: a history needs no registry, and most commands (navigate, open settings) are not reversible at all.
//
// KEYBOARD IS OPT-IN. `useUndoShortcuts` binds ⌘Z / ⌘⇧Z / ⌘Y through `foundation/shortcuts`, and only when a
// surface asks. A history driving a wizard's steps or a nested editor must not silently claim the window's undo
// key, so no factory here binds anything on its own.

// Shared vocabulary — options, the change/failure contracts, and the two structural surfaces both flavors satisfy
export {
  DefaultCoalesceMs,
  HistoryPhase,
  type HistoryErrorHandler,
  type HistoryListener,
  type HistoryOptions,
  type HistoryStore,
  type UndoRedoTarget,
} from './HistoryCore';

// Command flavor — a history of reversible work
export { createUndoHistory, type UndoableAction, type UndoHistory } from './UndoHistory';

// Snapshot flavor — a history of states
export { createSnapshotHistory, type SnapshotHistory, type SnapshotRecordOptions } from './SnapshotHistory';

// Vue — ownership and reactivity
export {
  useHistoryVersion,
  useUndoableState,
  useUndoHistory,
  type UndoHistoryControls,
  type UndoableState,
  type UndoableStateSetter,
} from './hooks/UseUndoHistory';

// Vue — the opt-in ⌘Z / ⌘⇧Z / ⌘Y binding
export { useUndoShortcuts, type UndoShortcutOptions } from './hooks/UseUndoShortcuts';
