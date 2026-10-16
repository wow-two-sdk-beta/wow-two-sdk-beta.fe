/** Closed failure vocabulary for SpeechFailure. */
export const SpeechFailureCode = {
  Cancelled: 'cancelled',
  Unsupported: 'unsupported',
  Failed: 'failed',
} as const;

export type SpeechFailureCode = (typeof SpeechFailureCode)[keyof typeof SpeechFailureCode];
