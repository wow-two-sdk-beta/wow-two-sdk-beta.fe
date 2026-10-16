/* Contains the lib-wide style-token enums shared across every variants config. */

/** Defines the semantic colour palette shared by surfaces, buttons, badges, alerts. */
export const Tone = {
  /** Refers to the neutral / default grey palette. */
  Neutral: 'neutral',
  /** Refers to the primary brand palette. */
  Primary: 'primary',
  /** Refers to the destructive / error palette. */
  Danger: 'danger',
  /** Refers to the positive / confirmation palette. */
  Success: 'success',
  /** Refers to the caution palette. */
  Warning: 'warning',
  /** Refers to the informational palette. */
  Info: 'info',
} as const;

export type Tone = (typeof Tone)[keyof typeof Tone];

/** Defines the size scale shared by inputs, buttons, surfaces. */
export const Size = {
  /** Refers to the extra-small step. */
  Xs: 'xs',
  /** Refers to the small step. */
  Sm: 'sm',
  /** Refers to the medium (default) step. */
  Md: 'md',
  /** Refers to the large step. */
  Lg: 'lg',
  /** Refers to the extra-large step. */
  Xl: 'xl',
} as const;

export type Size = (typeof Size)[keyof typeof Size];

/** Defines the corner-radius scale. */
export const Radius = {
  /** Refers to no rounding (square corners). */
  None: 'none',
  /** Refers to a small radius. */
  Sm: 'sm',
  /** Refers to a medium radius. */
  Md: 'md',
  /** Refers to a large radius. */
  Lg: 'lg',
  /** Refers to an extra-large radius. */
  Xl: 'xl',
  /** Refers to a 2x extra-large radius. */
  Xxl: '2xl',
  /** Refers to a fully-rounded (pill) radius. */
  Full: 'full',
} as const;

export type Radius = (typeof Radius)[keyof typeof Radius];

/** Defines the interior-padding scale. */
export const Padding = {
  /** Refers to no interior padding. */
  None: 'none',
  /** Refers to extra-small padding. */
  Xs: 'xs',
  /** Refers to small padding. */
  Sm: 'sm',
  /** Refers to medium padding. */
  Md: 'md',
  /** Refers to large padding. */
  Lg: 'lg',
  /** Refers to extra-large padding. */
  Xl: 'xl',
  /** Refers to 2x extra-large padding. */
  Xxl: '2xl',
} as const;

export type Padding = (typeof Padding)[keyof typeof Padding];

/** Represents shadow depth — 0 (none) through 5 (max). */
export type Elevation = 0 | 1 | 2 | 3 | 4 | 5;
