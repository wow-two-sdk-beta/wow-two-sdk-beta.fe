/* Provides the shared progress-indicator tone vocabulary (progressBar / progressCircle tone). */

/** Defines the tone of a progress indicator. */
export const ProgressTone = {
  /** Refers to the brand palette. */
  Brand: 'brand',
  /** Refers to the positive / success palette. */
  Success: 'success',
  /** Refers to the caution palette. */
  Warning: 'warning',
  /** Refers to the destructive / error palette. */
  Danger: 'danger',
  /** Refers to the neutral / default palette. */
  Neutral: 'neutral',
} as const;

export type ProgressTone = (typeof ProgressTone)[keyof typeof ProgressTone];
