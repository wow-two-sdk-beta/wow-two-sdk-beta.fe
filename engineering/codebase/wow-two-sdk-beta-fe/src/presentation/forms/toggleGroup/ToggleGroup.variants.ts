/**
 * ToggleGroup value-set enums.
 *
 * The group composes appearance with `cn()` (no `tv()`), so these are plain
 * prop-type vocabularies — no `VariantProps` assert. `Orientation` is the
 * shared registry enum (imported at the prop site, not re-minted here).
 */

/** Defines the ToggleGroup visual style. */
export const ToggleGroupVariant = {
  /** Refers to a standard button row/column (borders + attached radii). */
  Default: 'default',
  /** Refers to an iOS-style connected pill row on a muted track (active segment lifts). */
  Segmented: 'segmented',
  /** Refers to individually-separated rounded pills (each item its own detached chip). */
  Pill: 'pill',
} as const;

export type ToggleGroupVariant = (typeof ToggleGroupVariant)[keyof typeof ToggleGroupVariant];

/** Defines the ToggleGroup selection cardinality (the `type` discriminant). */
export const ToggleMode = {
  /** Refers to at-most-one active item; toggling the active one clears it. */
  Single: 'single',
  /** Refers to any number of independently-active items. */
  Multi: 'multi',
} as const;

export type ToggleMode = (typeof ToggleMode)[keyof typeof ToggleMode];

/** Defines the ARIA role wiring for the group and its items. */
export const ToggleItemRole = {
  /** Refers to the default `role="group"` of independent toggle buttons. */
  Group: 'group',
  /** Refers to `role="tablist"` on the root + `role="tab"` (+ `aria-selected`) on items. */
  Tab: 'tab',
} as const;

export type ToggleItemRole = (typeof ToggleItemRole)[keyof typeof ToggleItemRole];
