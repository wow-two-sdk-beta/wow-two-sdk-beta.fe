/**
 * Defines the density scale an app or a region renders at, set with `data-density` on any element.
 *
 * Every spacing utility — control heights, padding, gaps — derives from Tailwind's `--spacing`, so one attribute
 * rescales everything inside it; type sizes stay put. `comfortable` is the default scale.
 */
export const Density = {
  /** Refers to 87.5% spacing — dense tools and tables. The smallest controls can fall under a 24px target. */
  Compact: 'compact',
  /** Refers to the default spacing. */
  Comfortable: 'comfortable',
  /** Refers to 112.5% spacing — reading and touch-first surfaces. */
  Spacious: 'spacious',
} as const;

export type Density = (typeof Density)[keyof typeof Density];
