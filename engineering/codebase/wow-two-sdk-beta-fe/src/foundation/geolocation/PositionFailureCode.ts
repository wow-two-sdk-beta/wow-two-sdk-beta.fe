/** Closed failure vocabulary for PositionFailure. */
export const PositionFailureCode = {
  Denied: 'denied',
  Unavailable: 'unavailable',
  Timeout: 'timeout',
  Unsupported: 'unsupported',
  Failed: 'failed',
} as const;

export type PositionFailureCode = (typeof PositionFailureCode)[keyof typeof PositionFailureCode];
