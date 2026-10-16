/** Expected reasons a command did not complete. */
export const CommandRunFailureCode = {
  NotFound: 'notFound',
  Unavailable: 'unavailable',
  Failed: 'failed',
} as const;

export type CommandRunFailureCode = (typeof CommandRunFailureCode)[keyof typeof CommandRunFailureCode];
