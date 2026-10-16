/* Provides the shared severity vocabulary for status-bearing feedback surfaces. */

/** Defines the severity of a feedback surface (alert / banner / toast / callout). */
export const Severity = {
  /** Refers to a neutral, non-semantic message. */
  Neutral: 'neutral',
  /** Refers to an informational message. */
  Info: 'info',
  /** Refers to a positive / success message. */
  Success: 'success',
  /** Refers to a caution / warning message. */
  Warning: 'warning',
  /** Refers to a destructive / error message. */
  Danger: 'danger',
} as const;

export type Severity = (typeof Severity)[keyof typeof Severity];
