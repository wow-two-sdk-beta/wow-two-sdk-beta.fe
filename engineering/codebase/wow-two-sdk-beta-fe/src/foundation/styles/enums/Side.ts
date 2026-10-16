/* Provides the shared box-side vocabulary (DrawerSide / chevronSide / switchField side / twoColumn asideSide). */

/** Defines a side of a box. */
export const Side = {
  /** Refers to the top side. */
  Top: 'top',
  /** Refers to the right side. */
  Right: 'right',
  /** Refers to the bottom side. */
  Bottom: 'bottom',
  /** Refers to the left side. */
  Left: 'left',
} as const;

export type Side = (typeof Side)[keyof typeof Side];
