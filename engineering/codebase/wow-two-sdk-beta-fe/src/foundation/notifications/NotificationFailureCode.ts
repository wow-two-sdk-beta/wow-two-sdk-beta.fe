/** Closed failure vocabulary for NotificationFailure. */
export const NotificationFailureCode = {
  Denied: 'denied',
  Unsupported: 'unsupported',
  Failed: 'failed',
} as const;

export type NotificationFailureCode = (typeof NotificationFailureCode)[keyof typeof NotificationFailureCode];
