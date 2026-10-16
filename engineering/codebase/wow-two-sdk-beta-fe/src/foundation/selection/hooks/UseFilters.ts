// The Vue seam over the pure filter model — clause-list state, controlled or uncontrolled.
//
// `setFilter` upserts BY FIELD, which is the filter-bar shape: one control per column, changing it replaces
// that column's clause in place rather than stacking a second one. The model itself allows several clauses on
// one field (a `gt` and an `lt` AND-ed into a range), and that stays reachable through `setFilters` — the
// upsert is a convenience over the common case, not a restriction of the model.
//
// As with `useSort`, no `filterItems(items)` convenience: the pure `applyFilters(items, controls.filters.value)`
// belongs in the consumer's own `computed`. A function handed back from here would close over items it does not
// own.

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';

import { useControlled } from '../../state/hooks/UseControlled';

import type { FilterDescriptor } from '../models/Filter';

/** The stable empty seed — a module constant so an uncontrolled composable never re-seeds from a fresh literal. */
const NoFilters: ReadonlyArray<never> = Object.freeze([]);

/** Options accepted by {@link useFilters}. All are optional; the default is an uncontrolled empty filter set. */
export interface UseFiltersOptions<TField extends string = string> {
  /** The controlled clause list. Pass to own the filter state; omit for uncontrolled. */
  filters?: MaybeRefOrGetter<ReadonlyArray<FilterDescriptor<TField>> | undefined>;
  /** The initial clause list when uncontrolled. Read once; ignored while `filters` is passed. */
  defaultFilters?: MaybeRefOrGetter<ReadonlyArray<FilterDescriptor<TField>> | undefined>;
  /** Fires with the next clause list whenever it changes. */
  onFiltersChange?: (filters: ReadonlyArray<FilterDescriptor<TField>>) => void;
}

/** The filter state and bound operations returned by {@link useFilters}. */
export interface FilterControls<TField extends string = string> {
  /** The current clauses, AND-ed. Feed to `applyFilters` / `filterPredicate`. */
  readonly filters: ComputedRef<ReadonlyArray<FilterDescriptor<TField>>>;
  /** Replaces the whole clause list — the escape hatch for several clauses on one field. */
  readonly setFilters: (filters: ReadonlyArray<FilterDescriptor<TField>>) => void;
  /** Upserts a clause by field, keeping its position when it already exists. */
  readonly setFilter: (filter: FilterDescriptor<TField>) => void;
  /** Drops every clause on a field. */
  readonly removeFilter: (field: TField) => void;
  /** Drops every clause. */
  readonly clear: () => void;
  /** The first clause on a field, or `undefined` — what a filter-bar control reads to render its value. */
  readonly filterFor: (field: TField) => FilterDescriptor<TField> | undefined;
}

/**
 * Binds the filter model to reactive state, controlled or uncontrolled.
 *
 * Controlled when `filters` resolves to a defined value: the composable stores nothing and only calls
 * `onFiltersChange` — the shape a server-side filtered list wants, where the clauses round-trip through a
 * query.
 */
export function useFilters<TField extends string = string>(
  options: UseFiltersOptions<TField> = {},
): FilterControls<TField> {
  const { filters: controlledFilters, defaultFilters, onFiltersChange } = options;

  const { value: filters, setValue: setFilters } = useControlled<readonly FilterDescriptor<TField>[]>({
    controlled: () => toValue(controlledFilters),
    default: () => toValue(defaultFilters) ?? NoFilters,
    onChange: onFiltersChange,
  });

  const setFilter = (filter: FilterDescriptor<TField>): void => {
    const current = filters.value;
    const index = current.findIndex((candidate) => candidate.field === filter.field);
    if (index === -1) {
      setFilters([...current, filter]);
      return;
    }
    setFilters(current.map((candidate, at) => (at === index ? filter : candidate)));
  };

  const removeFilter = (field: TField): void =>
    setFilters(filters.value.filter((candidate) => candidate.field !== field));

  return {
    filters: computed(() => filters.value),
    setFilters,
    setFilter,
    removeFilter,
    clear: () => setFilters(NoFilters),
    filterFor: (field) => filters.value.find((candidate) => candidate.field === field),
  };
}
