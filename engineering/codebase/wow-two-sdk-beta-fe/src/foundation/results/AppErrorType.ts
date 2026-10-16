/** Defines transport-independent failure categories. */
export const AppErrorType = {
  Validation: 'validation',
  Unavailable: 'unavailable',
  Unauthorized: 'unauthorized',
  Forbidden: 'forbidden',
  NotFound: 'notFound',
  Conflict: 'conflict',
  Cancelled: 'cancelled',
  Timeout: 'timeout',
  Unexpected: 'unexpected',
} as const;

export type AppErrorType = (typeof AppErrorType)[keyof typeof AppErrorType];
