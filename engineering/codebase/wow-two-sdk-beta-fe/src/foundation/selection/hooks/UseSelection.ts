// The Vue seam over the pure selection model — state ownership only. Every op here is `commit(pureOp(...))`;
// no selection logic lives in this file, so a headless caller and a component behave identically.
//
// Controlled value = the KEY ARRAY, not the whole `SelectionState`. A consumer that controls selection wants
// to own "what is selected" (it round-trips to a URL, a form, a server); it does not want to own the anchor,
// which is interaction history with no meaning outside this composable. So the keys flow through
// `useControlled` while the anchor stays internal — which is what makes shift-click keep working on a fully
// controlled list, where a naive implementation loses the anchor whenever the parent republishes its keys.
//
// The mode is applied by re-deriving the state through `createSelection` in a `computed`, so a controlled
// parent that hands `['a','b']` to a `single`-mode list gets the model's normalisation rather than an invalid
// state.
//
// `commit` short-circuits on reference equality: the pure ops return the same state for a no-op, so an inert
// click (a `none`-mode row, deselecting an unselected key) fires no `onSelectionChange` at all.

import { computed, shallowRef, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import { useControlled } from '../../state/hooks/UseControlled';

import {
  clear,
  createSelection,
  deselect,
  extendSelection,
  invert,
  select,
  selectAll,
  selectRange,
  selectedKeys,
  selectionStatus,
  toggle,
  toggleAll,
  SelectionMode,
  type SelectionKey,
  type SelectionState,
  type SelectionStatus,
  type SelectRangeOptions,
} from '../models/Selection';

/** The stable empty seed — a module constant so an uncontrolled composable never re-seeds from a fresh literal. */
const NoKeys: ReadonlyArray<never> = Object.freeze([]);

/** Options accepted by {@link useSelection}. All are optional; the default is an uncontrolled multi-select. */
export interface UseSelectionOptions<TKey extends SelectionKey> {
  /** The selection mode. Defaults to `'multiple'`. */
  mode?: MaybeRefOrGetter<SelectionMode | undefined>;
  /** The controlled selected keys. Pass to own the selection; omit for uncontrolled. */
  selectedKeys?: MaybeRefOrGetter<ReadonlyArray<TKey> | undefined>;
  /** The initial selected keys when uncontrolled. Read once; ignored while `selectedKeys` is passed. */
  defaultSelectedKeys?: MaybeRefOrGetter<ReadonlyArray<TKey> | undefined>;
  /** Fires with the next key list whenever the selection actually changes. */
  onSelectionChange?: (keys: ReadonlyArray<TKey>) => void;
}

/** The selection state and bound operations returned by {@link useSelection}. */
export interface SelectionControls<TKey extends SelectionKey> {
  /** The current immutable snapshot — pass to the pure model for anything not covered here. */
  readonly state: ComputedRef<SelectionState<TKey>>;
  /** The selected keys in insertion order. */
  readonly keys: ComputedRef<ReadonlyArray<TKey>>;
  /** The mode in force. */
  readonly mode: ComputedRef<SelectionMode>;
  /** The number of selected keys. */
  readonly count: ComputedRef<number>;
  /** Reports whether a key is selected. */
  readonly isSelected: (key: TKey) => boolean;
  /** The tri-state for a header checkbox over the given (usually filtered) keys. */
  readonly status: (keys: Iterable<TKey>) => SelectionStatus;
  /** Selects a key and anchors on it. */
  readonly select: (key: TKey) => void;
  /** Deselects a key and anchors on it. */
  readonly deselect: (key: TKey) => void;
  /** Flips a key and anchors on it — the plain click. */
  readonly toggle: (key: TKey) => void;
  /** Adds every given key to the selection. */
  readonly selectAll: (keys: Iterable<TKey>) => void;
  /** Empties the selection and drops the anchor. */
  readonly clear: () => void;
  /** Flips every given key, leaving keys outside the set alone. */
  readonly invert: (keys: Iterable<TKey>) => void;
  /** The header-checkbox click over the given keys. */
  readonly toggleAll: (keys: Iterable<TKey>) => void;
  /** Selects the run between an explicit anchor and a target, in the surface's visual order. */
  readonly selectRange: (
    anchor: TKey,
    target: TKey,
    orderedKeys: ReadonlyArray<TKey>,
    options?: SelectRangeOptions,
  ) => void;
  /** The shift-click — extends from the tracked anchor to the target. */
  readonly extend: (target: TKey, orderedKeys: ReadonlyArray<TKey>, options?: SelectRangeOptions) => void;
}

/**
 * Binds the selection model to reactive state, controlled or uncontrolled.
 *
 * Controlled when `selectedKeys` resolves to a defined value: the composable never stores keys, it only calls
 * `onSelectionChange` with the next list. Uncontrolled otherwise, seeded from `defaultSelectedKeys`, with
 * `onSelectionChange` still firing so a consumer can observe without owning.
 */
export function useSelection<TKey extends SelectionKey>(
  options: UseSelectionOptions<TKey> = {},
): SelectionControls<TKey> {
  const { mode, selectedKeys: controlledKeys, defaultSelectedKeys, onSelectionChange } = options;

  const { value: keys, setValue: setKeys } = useControlled<readonly TKey[]>({
    controlled: () => toValue(controlledKeys),
    default: () => toValue(defaultSelectedKeys) ?? NoKeys,
    onChange: onSelectionChange,
  });
  const anchor = shallowRef<TKey | null>(null);

  const state = computed(() => createSelection(toValue(mode) ?? SelectionMode.Multiple, keys.value, anchor.value));

  const commit = (next: SelectionState<TKey>): void => {
    // Pure ops return the same reference for a no-op — nothing to publish, no listener to wake.
    if (next === state.value) return;
    anchor.value = next.anchor;
    setKeys(selectedKeys(next));
  };

  return {
    state,
    keys: computed(() => selectedKeys(state.value)),
    mode: computed(() => state.value.mode),
    count: computed(() => state.value.keys.size),
    isSelected: (key) => state.value.keys.has(key),
    status: (scope) => selectionStatus(state.value, scope),
    select: (key) => commit(select(state.value, key)),
    deselect: (key) => commit(deselect(state.value, key)),
    toggle: (key) => commit(toggle(state.value, key)),
    selectAll: (scope) => commit(selectAll(state.value, scope)),
    clear: () => commit(clear(state.value)),
    invert: (scope) => commit(invert(state.value, scope)),
    toggleAll: (scope) => commit(toggleAll(state.value, scope)),
    selectRange: (rangeAnchor, target, orderedKeys, rangeOptions) =>
      commit(selectRange(state.value, rangeAnchor, target, orderedKeys, rangeOptions)),
    extend: (target, orderedKeys, rangeOptions) =>
      commit(extendSelection(state.value, target, orderedKeys, rangeOptions)),
  };
}
