/** Closed failure vocabulary for MediaStreamFailure. */
export const MediaStreamFailureCode = {
  Cancelled: 'cancelled',
  Denied: 'denied',
  Unavailable: 'unavailable',
  InUse: 'in-use',
  Unsupported: 'unsupported',
  Failed: 'failed',
} as const;

export type MediaStreamFailureCode = (typeof MediaStreamFailureCode)[keyof typeof MediaStreamFailureCode];
