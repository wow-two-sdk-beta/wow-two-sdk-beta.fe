/** Closed failure vocabulary for ShareFailure. */
export const ShareFailureCode = {
  Dismissed: 'dismissed',
  Unsupported: 'unsupported',
  Failed: 'failed',
} as const;

export type ShareFailureCode = (typeof ShareFailureCode)[keyof typeof ShareFailureCode];
