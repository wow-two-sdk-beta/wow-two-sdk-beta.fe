/* Provides what a `FilterSummary` hands the filters button inside it — the button may sit in an app's trigger. */
import type { InjectionKey } from 'vue';

/** Contains the filters button's live inputs, read through getters so the button follows its summary. */
export interface FilterSummaryContext {
  /** Reads the number of advanced filters in effect; the button shows a badge above 0. */
  readonly activeFilterCount: () => number;
  /** Reads the button's accessible name and tooltip text. */
  readonly filtersLabel: () => string;
}

/** Keys the context a `FilterSummary` provides to its filters button. */
export const FilterSummaryContextKey: InjectionKey<FilterSummaryContext> = Symbol('FilterSummary');
