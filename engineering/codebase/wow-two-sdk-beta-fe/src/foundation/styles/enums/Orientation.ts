/* Provides the shared two-axis orientation vocabulary for layout / nav / actions / display. */

/** Defines the layout axis of a component (forms / layout / nav / actions / display / feedback). */
export const Orientation = {
  /** Refers to a horizontal (left-to-right) axis. */
  Horizontal: 'horizontal',
  /** Refers to a vertical (top-to-bottom) axis. */
  Vertical: 'vertical',
} as const;

export type Orientation = (typeof Orientation)[keyof typeof Orientation];
