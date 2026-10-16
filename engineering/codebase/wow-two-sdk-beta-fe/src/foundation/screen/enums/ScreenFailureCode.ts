/** Closed failure vocabulary for ScreenFailure. */
export const ScreenFailureCode = {
  Unsupported: 'unsupported',
  Denied: 'denied',
  RequiresGesture: 'requires-gesture',
  Failed: 'failed',
} as const;

export type ScreenFailureCode = (typeof ScreenFailureCode)[keyof typeof ScreenFailureCode];
