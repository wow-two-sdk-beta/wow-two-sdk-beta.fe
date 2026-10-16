// The Vue seam over the pure sort model — descriptor-list state, controlled or uncontrolled.
//
// Deliberately NOT exposed here: a `sortItems(items)` convenience. The honest seam is: the composable owns the
// descriptors, the consumer calls the pure `applySort(items, controls.descriptors.value, accessors)` inside its
// own `computed`. A sorting function handed back from here would close over items it does not own, and would
// invite exactly the re-sort-on-every-read bug this model exists to avoid. Same for `useFilters`.
//
// The controlled value is the descriptor ARRAY even for single-field sort, so switching a surface from
// single to multi is a flag (`isMulti`) rather than a state-shape migration.

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import { useControlled } from '../../state/hooks/UseControlled';

import { sortDirectionFor, sortIndexFor, toggleSort, type SortDescriptor, type SortDirection } from '../models/Sort';

/** The stable empty seed — a module constant so an uncontrolled composable never re-seeds from a fresh literal. */
const NoSort: ReadonlyArray<never> = Object.freeze([]);

/** Options accepted by {@link useSort}. All are optional; the default is an uncontrolled single-field sort. */
export interface UseSortOptions<TField extends string = string> {
  /** The controlled ordering. Pass to own the sort state; omit for uncontrolled. */
  sort?: MaybeRefOrGetter<ReadonlyArray<SortDescriptor<TField>> | undefined>;
  /** The initial ordering when uncontrolled. Read once; ignored while `sort` is passed. */
  defaultSort?: MaybeRefOrGetter<ReadonlyArray<SortDescriptor<TField>> | undefined>;
  /** Fires with the next ordering whenever it changes. */
  onSortChange?: (sort: ReadonlyArray<SortDescriptor<TField>>) => void;
  /** The multi-field behaviour of {@link SortControls.toggle}. Defaults to `false` (one sorted field). */
  isMulti?: MaybeRefOrGetter<boolean | undefined>;
}

/** The sort state and bound operations returned by {@link useSort}. */
export interface SortControls<TField extends string = string> {
  /** The current ordering — array order is precedence. Feed to `applySort` / `sortComparator`. */
  readonly descriptors: ComputedRef<ReadonlyArray<SortDescriptor<TField>>>;
  /** Advances a field through `asc → desc → none` — the header click. */
  readonly toggle: (field: TField) => void;
  /** Replaces the whole ordering — for a "sort by" menu that sets state outright. */
  readonly setSort: (descriptors: ReadonlyArray<SortDescriptor<TField>>) => void;
  /** Drops all ordering. */
  readonly clear: () => void;
  /** The direction applied to a field, or `null` when unsorted — drives the header's arrow and `aria-sort`. */
  readonly directionFor: (field: TField) => SortDirection | null;
  /** The 0-based precedence of a field, or `-1` — the multi-sort header's order badge. */
  readonly indexFor: (field: TField) => number;
}

/**
 * Binds the sort model to reactive state, controlled or uncontrolled.
 *
 * Controlled when `sort` resolves to a defined value: the composable stores nothing and only calls
 * `onSortChange` — the shape a server-side sorted table wants, where the ordering round-trips through a query
 * rather than local state.
 */
export function useSort<TField extends string = string>(options: UseSortOptions<TField> = {}): SortControls<TField> {
  const { sort, defaultSort, onSortChange, isMulti } = options;

  const { value: descriptors, setValue: setDescriptors } = useControlled<readonly SortDescriptor<TField>[]>({
    controlled: () => toValue(sort),
    default: () => toValue(defaultSort) ?? NoSort,
    onChange: onSortChange,
  });

  return {
    descriptors: computed(() => descriptors.value),
    toggle: (field) => setDescriptors(toggleSort(descriptors.value, field, { isMulti: toValue(isMulti) ?? false })),
    setSort: setDescriptors,
    clear: () => setDescriptors(NoSort),
    directionFor: (field) => sortDirectionFor(descriptors.value, field),
    indexFor: (field) => sortIndexFor(descriptors.value, field),
  };
}
