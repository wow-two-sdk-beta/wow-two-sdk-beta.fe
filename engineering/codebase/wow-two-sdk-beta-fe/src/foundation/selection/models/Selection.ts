// Selection — the canonical model behind every selectable surface (DataTable rows, Listbox options, tree
// nodes, transfer lists). Pure and immutable: every op takes a state and returns a state, never mutates,
// and returns the SAME reference when the op changed nothing — so a memoized consumer can skip work on an
// inert click without a deep compare.
//
// Why a `Set` plus a separate anchor rather than one array of keys: membership is the hot path (one test
// per rendered row), and the anchor is selection *history*, not selection *content* — a shift-click must
// know where the last plain click landed, and that has to survive ops that don't touch the key set.
//
// Why `mode` lives IN the state instead of being a per-call argument: the invariants then hold
// structurally. `none` makes every mutating op inert and `single` caps the set at one key no matter which
// op a caller reaches for, so a single-select list cannot accumulate keys by calling the wrong function.
//
// The set-shaped ops (`selectAll`, `invert`, `toggleAll`, `selectionStatus`) all take an explicit key list
// rather than reading some ambient "all rows". That list is the caller's CURRENT FILTERED PAGE, which is
// the whole point: a header checkbox on a filtered table must mean "all matching rows", and selections
// made outside the current filter must survive it.

/** Represents the identity of a selectable item — the value a surface keys its rows/options by. */
export type SelectionKey = string | number;

/** Defines how many items a surface allows to be selected at once. */
export const SelectionMode = {
  /** Refers to a non-selectable surface — every mutating op is inert. */
  None: 'none',
  /** Refers to at most one selected item — selecting replaces rather than accumulates. */
  Single: 'single',
  /** Refers to any number of selected items, including ranges. */
  Multiple: 'multiple',
} as const;

export type SelectionMode = (typeof SelectionMode)[keyof typeof SelectionMode];

/** Defines the tri-state a header checkbox renders for a key set. */
export const SelectionStatus = {
  /** Refers to none of the given keys being selected — an unchecked box. */
  None: 'none',
  /** Refers to a partial selection — an indeterminate box. */
  Some: 'some',
  /** Refers to every given key being selected — a checked box. */
  All: 'all',
} as const;

export type SelectionStatus = (typeof SelectionStatus)[keyof typeof SelectionStatus];

/** Represents an immutable selection snapshot. Build with {@link createSelection}; never construct by hand. */
export interface SelectionState<TKey extends SelectionKey> {
  /** The mode enforced by every op on this state. */
  readonly mode: SelectionMode;
  /** The selected keys, in the order they were added. */
  readonly keys: ReadonlySet<TKey>;
  /** The last plainly-interacted key — the fixed end of a subsequent range extension, or `null`. */
  readonly anchor: TKey | null;
}

/** Options accepted by the range ops. */
export interface SelectRangeOptions {
  /**
   * The union behaviour. `true` (default) merges the range into the existing selection — the checkbox-list
   * shift-click every data grid in this SDK wants. `false` replaces the selection with the range alone,
   * matching a file-manager style list.
   */
  isAdditive?: boolean;
}

/** Reports whether two key sets hold the same members — the identity check behind the no-op short circuit. */
function areKeySetsEqual<TKey extends SelectionKey>(a: ReadonlySet<TKey>, b: ReadonlySet<TKey>): boolean {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const key of a) if (!b.has(key)) return false;
  return true;
}

/** Builds the next state, collapsing to the previous reference when nothing actually changed. */
function withSelection<TKey extends SelectionKey>(
  state: SelectionState<TKey>,
  keys: ReadonlySet<TKey>,
  anchor: TKey | null,
): SelectionState<TKey> {
  if (anchor === state.anchor && areKeySetsEqual(state.keys, keys)) return state;
  return { mode: state.mode, keys, anchor };
}

/**
 * Creates a selection state, normalising the seed to the mode: `none` drops every key, `single` keeps only
 * the first. Also the way to re-mode an existing state — `createSelection('single', state.keys)`.
 *
 * @param mode The selection mode to enforce. Defaults to `'multiple'`.
 * @param keys The initially selected keys, in priority order.
 * @param anchor The initial range anchor. Defaults to `null`.
 */
export function createSelection<TKey extends SelectionKey>(
  mode: SelectionMode = SelectionMode.Multiple,
  keys: Iterable<TKey> = [],
  anchor: TKey | null = null,
): SelectionState<TKey> {
  if (mode === SelectionMode.None) return { mode, keys: new Set<TKey>(), anchor: null };
  const seeded = new Set<TKey>(keys);
  if (mode === SelectionMode.Single && seeded.size > 1) {
    const first = [...seeded].at(0);
    return {
      mode,
      keys: first === undefined ? new Set<TKey>() : new Set<TKey>([first]),
      anchor,
    };
  }
  return { mode, keys: seeded, anchor };
}

/** Reports whether a key is currently selected. */
export function isSelected<TKey extends SelectionKey>(state: SelectionState<TKey>, key: TKey): boolean {
  return state.keys.has(key);
}

/** The number of selected keys. */
export function selectionCount<TKey extends SelectionKey>(state: SelectionState<TKey>): number {
  return state.keys.size;
}

/** The selected keys as an array, in insertion order — the shape a controlled `onSelectionChange` emits. */
export function selectedKeys<TKey extends SelectionKey>(state: SelectionState<TKey>): ReadonlyArray<TKey> {
  return [...state.keys];
}

/**
 * Selects a key and moves the anchor to it. In `single` mode this REPLACES the selection rather than
 * accumulating; in `none` mode it is inert.
 */
export function select<TKey extends SelectionKey>(state: SelectionState<TKey>, key: TKey): SelectionState<TKey> {
  if (state.mode === SelectionMode.None) return state;
  if (state.mode === SelectionMode.Single) return withSelection(state, new Set([key]), key);
  const next = new Set(state.keys);
  next.add(key);
  return withSelection(state, next, key);
}

/**
 * Deselects a key and moves the anchor to it. Inert in `none` mode, and inert when the key was not
 * selected — an unselected key carries no interaction to anchor on.
 */
export function deselect<TKey extends SelectionKey>(state: SelectionState<TKey>, key: TKey): SelectionState<TKey> {
  if (state.mode === SelectionMode.None || !state.keys.has(key)) return state;
  const next = new Set(state.keys);
  next.delete(key);
  return withSelection(state, next, key);
}

/**
 * Flips one key's membership and moves the anchor to it — the plain click. In `single` mode, toggling the
 * selected key clears the selection and toggling any other key replaces it.
 */
export function toggle<TKey extends SelectionKey>(state: SelectionState<TKey>, key: TKey): SelectionState<TKey> {
  if (state.mode === SelectionMode.None) return state;
  return state.keys.has(key) ? deselect(state, key) : select(state, key);
}

/**
 * Adds every given key to the selection, leaving the anchor and any selection OUTSIDE the given keys
 * untouched — so "select all" on a filtered table keeps rows selected under other filters.
 *
 * Inert in `none` and `single` modes: "all" has no meaning on a surface that holds at most one key.
 */
export function selectAll<TKey extends SelectionKey>(
  state: SelectionState<TKey>,
  keys: Iterable<TKey>,
): SelectionState<TKey> {
  if (state.mode !== SelectionMode.Multiple) return state;
  const next = new Set(state.keys);
  for (const key of keys) next.add(key);
  return withSelection(state, next, state.anchor);
}

/** Empties the selection and drops the anchor — with nothing selected there is no range to extend from. */
export function clear<TKey extends SelectionKey>(state: SelectionState<TKey>): SelectionState<TKey> {
  if (state.keys.size === 0 && state.anchor === null) return state;
  return { mode: state.mode, keys: new Set<TKey>(), anchor: null };
}

/**
 * Flips the membership of every given key. Keys selected OUTSIDE the given set are left alone, so
 * inverting a filtered page inverts exactly that page.
 *
 * Inert in `none` and `single` modes.
 */
export function invert<TKey extends SelectionKey>(
  state: SelectionState<TKey>,
  keys: Iterable<TKey>,
): SelectionState<TKey> {
  if (state.mode !== SelectionMode.Multiple) return state;
  const next = new Set(state.keys);
  for (const key of keys) {
    if (next.has(key)) next.delete(key);
    else next.add(key);
  }
  return withSelection(state, next, state.anchor);
}

/**
 * The header-checkbox click: selects every given key unless all of them are already selected, in which
 * case it deselects them. Selections outside the given keys survive either way.
 *
 * Inert in `none` and `single` modes, and on an empty key list.
 */
export function toggleAll<TKey extends SelectionKey>(
  state: SelectionState<TKey>,
  keys: Iterable<TKey>,
): SelectionState<TKey> {
  if (state.mode !== SelectionMode.Multiple) return state;
  const scope = [...keys];
  if (scope.length === 0) return state;
  if (selectionStatus(state, scope) === SelectionStatus.All) {
    const next = new Set(state.keys);
    for (const key of scope) next.delete(key);
    return withSelection(state, next, state.anchor);
  }
  return selectAll(state, scope);
}

/**
 * The tri-state a header checkbox renders for the given keys: `'all'` when every one is selected,
 * `'none'` when none is, `'some'` otherwise. An empty key list is `'none'` — there is nothing to check.
 */
export function selectionStatus<TKey extends SelectionKey>(
  state: SelectionState<TKey>,
  keys: Iterable<TKey>,
): SelectionStatus {
  let total = 0;
  let hit = 0;
  for (const key of keys) {
    total += 1;
    if (state.keys.has(key)) hit += 1;
  }
  if (total === 0 || hit === 0) return SelectionStatus.None;
  return hit === total ? SelectionStatus.All : SelectionStatus.Some;
}

/**
 * Selects the contiguous run between two keys — the shift-click. `orderedKeys` is the surface's CURRENT
 * visual order (already sorted and filtered), which is what makes the range mean what the user sees.
 *
 * The anchor is left AT `anchor`, not moved to `target`: successive shift-clicks must all measure from the
 * same fixed end, so dragging a range back and forth grows and shrinks it instead of walking it away.
 *
 * Degenerate cases, all documented rather than thrown: `none` mode is inert; `single` mode collapses to
 * {@link select} on `target`; a `target` missing from `orderedKeys` is inert; an `anchor` missing from
 * `orderedKeys` falls back to selecting `target` alone.
 */
export function selectRange<TKey extends SelectionKey>(
  state: SelectionState<TKey>,
  anchor: TKey,
  target: TKey,
  orderedKeys: ReadonlyArray<TKey>,
  options: SelectRangeOptions = {},
): SelectionState<TKey> {
  if (state.mode === SelectionMode.None) return state;
  if (state.mode === SelectionMode.Single) return select(state, target);

  const targetIndex = orderedKeys.indexOf(target);
  if (targetIndex === -1) return state;

  const anchorIndex = orderedKeys.indexOf(anchor);
  if (anchorIndex === -1) return withSelection(state, new Set([target]), target);

  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  const run = orderedKeys.slice(start, end + 1);

  const isAdditive = options.isAdditive ?? true;
  const next = isAdditive ? new Set(state.keys) : new Set<TKey>();
  for (const key of run) next.add(key);
  return withSelection(state, next, anchor);
}

/**
 * The shift-click as a surface actually calls it: extends from the state's own anchor to `target`. With no
 * anchor yet (nothing has been plainly clicked), the target itself becomes the anchor and the range is the
 * single row — which is exactly what a shift-click on a fresh list should do.
 */
export function extendSelection<TKey extends SelectionKey>(
  state: SelectionState<TKey>,
  target: TKey,
  orderedKeys: ReadonlyArray<TKey>,
  options: SelectRangeOptions = {},
): SelectionState<TKey> {
  return selectRange(state, state.anchor ?? target, target, orderedKeys, options);
}
