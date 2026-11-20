/**
 * FacetBar value-set enums.
 *
 * The bar composes appearance with `cn()` (no `tv()`), so these are plain prop-type vocabularies — no
 * `VariantProps` assert.
 */

/** Defines how a facet takes its value: one, several, or on-off. */
export const FacetKind = {
  /** Refers to at most one chosen value; choosing the chosen one again clears it. */
  Single: 'single',
  /** Refers to any number of chosen values. */
  Multi: 'multi',
  /** Refers to one on-or-off value, `true` when on and no key when off; it has no options. */
  Toggle: 'toggle',
} as const;

export type FacetKind = (typeof FacetKind)[keyof typeof FacetKind];

/** Defines where the bar offers a facet. */
export const FacetPlacement = {
  /** Refers to a row of chips beside the search, one click from every value. */
  Inline: 'inline',
  /** Refers to a picker or switch row inside the "Filters" popover, its chosen values shown as removable chips. */
  Popover: 'popover',
} as const;

export type FacetPlacement = (typeof FacetPlacement)[keyof typeof FacetPlacement];
