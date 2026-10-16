/* Provides the shared status-tone vocabulary for status / monitoring surfaces. */

/** Defines a status / monitoring tone (Status dot, StatusIndicator). */
export const StatusTone = {
  /** Refers to the positive / healthy tone. */
  Success: 'success',
  /** Refers to the caution / degraded tone. */
  Warning: 'warning',
  /** Refers to the destructive / down / error tone. */
  Destructive: 'destructive',
  /** Refers to the informational tone. */
  Info: 'info',
  /** Refers to the neutral / idle tone. */
  Neutral: 'neutral',
} as const;

export type StatusTone = (typeof StatusTone)[keyof typeof StatusTone];
