import type { WorkerRunFailureCode } from '../WorkerRunFailureCode';

/** Expected reasons the operation could not produce its requested value. */
export type WorkerRunFailure =
  | { readonly status: typeof WorkerRunFailureCode.Unsupported }
  | { readonly status: typeof WorkerRunFailureCode.Failed; readonly error: Error };
