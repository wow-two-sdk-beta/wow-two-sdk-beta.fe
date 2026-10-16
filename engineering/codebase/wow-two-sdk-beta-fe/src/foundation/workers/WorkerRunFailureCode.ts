/** Closed failure vocabulary for WorkerRunFailure. */
export const WorkerRunFailureCode = {
  Unsupported: 'unsupported',
  Failed: 'failed',
} as const;

export type WorkerRunFailureCode = (typeof WorkerRunFailureCode)[keyof typeof WorkerRunFailureCode];
