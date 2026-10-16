// selection — foundation seam. The canonical selection / sort / filter model for every list-shaped surface:
// pure immutable state machines plus thin Vue wrappers, with nothing rendered and nothing fetched.
//
// The vector exists because these three were being re-derived per component — a table grew a sort cycle, a
// listbox grew a selection set, a filter bar grew a comparator — and each copy quietly answered the hard
// questions differently: where nullish values land, whether shift-click replaces or unions, whether a third
// header click clears. Those answers are user-visible behaviour, so they belong in one tested model rather
// than in whichever component was written last.
//
// Layering: this slice is pure state + comparison. It knows nothing about rows, keyboards, or the DOM, so a
// virtualised grid, a server-driven table, and a headless test all drive the same model. Components are the
// CONSUMERS — the model never reaches back into `presentation`.
//
// Vocabulary is aligned with `foundation/http`'s `Page` / `TokenPage`: `SortDescriptor` and
// `FilterDescriptor` are the client-side shapes a product's `{Noun}QueryDto` echoes back through
// `IHasAppliedQuery`, so client-sorted and server-sorted surfaces speak one language.
//
// String ordering goes through `foundation/i18n`' `compareStrings` (one cached `Intl.Collator`, numeric-
// aware). This slice adds no collator of its own — text must not order differently here than in a component.

// Field access — the accessor vocabulary shared by sort and filter
export {
  isNullish,
  readField,
  toText,
  type FieldAccessor,
  type FieldAccessors,
  type LocaleOptions,
} from './models/Field';

// Selection — immutable key-set model with modes, anchor tracking, and the header tri-state
export {
  clear,
  createSelection,
  deselect,
  extendSelection,
  invert,
  isSelected,
  select,
  selectAll,
  selectRange,
  selectedKeys,
  selectionCount,
  selectionStatus,
  toggle,
  toggleAll,
  SelectionMode,
  SelectionStatus,
  type SelectionKey,
  type SelectionState,
  type SelectRangeOptions,
} from './models/Selection';

// Sort — descriptor list, the `asc → desc → none` cycle, and the nullish-last comparator
export {
  applySort,
  compareValues,
  sortComparator,
  sortDirectionFor,
  sortIndexFor,
  toggleSort,
  SortDirection,
  type SortDescriptor,
  type ToggleSortOptions,
} from './models/Sort';

// Filter — the closed operator set and its AND-ed predicate
export {
  applyFilters,
  filterPredicate,
  matchesFilter,
  FilterOperator,
  type BetweenFilter,
  type FilterDescriptor,
  type InFilter,
  type ValueFilter,
} from './models/Filter';

// Vue — thin controlled/uncontrolled wrappers over the pure models
export { useSelection, type SelectionControls, type UseSelectionOptions } from './hooks/UseSelection';
export { useSort, type SortControls, type UseSortOptions } from './hooks/UseSort';
export { useFilters, type FilterControls, type UseFiltersOptions } from './hooks/UseFilters';

export * from './hooks/UseTypeahead';
