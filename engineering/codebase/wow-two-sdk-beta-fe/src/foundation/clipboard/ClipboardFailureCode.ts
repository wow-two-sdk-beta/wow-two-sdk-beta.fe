/** Closed failure vocabulary for ClipboardFailure. */
export const ClipboardFailureCode = {
  Denied: 'denied',
  Unsupported: 'unsupported',
  Failed: 'failed',
} as const;

export type ClipboardFailureCode = (typeof ClipboardFailureCode)[keyof typeof ClipboardFailureCode];
