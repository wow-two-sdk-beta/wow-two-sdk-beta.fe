/** Closed failure vocabulary for RecognizerStartFailure. */
export const RecognizerStartFailureCode = {
  Unsupported: 'unsupported',
  Failed: 'failed',
} as const;

export type RecognizerStartFailureCode = (typeof RecognizerStartFailureCode)[keyof typeof RecognizerStartFailureCode];
