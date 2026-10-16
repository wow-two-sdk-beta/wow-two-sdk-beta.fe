/* Provides the shared simple alignment vocabulary (cluster / inline / dataGrid / timeline / descriptionList). */

/** Defines the alignment of items along an axis. */
export const Align = {
  /** Refers to alignment at the logical start. */
  Start: 'start',
  /** Refers to centered alignment. */
  Center: 'center',
  /** Refers to alignment at the logical end. */
  End: 'end',
} as const;

export type Align = (typeof Align)[keyof typeof Align];
