import type { AppError } from '../../results';
import { CommandRunFailureCode } from '../CommandRunFailureCode';

/** Distinguishes registry availability failures from an explicitly reported handler failure. */
export type CommandRunFailure =
  | { readonly code: typeof CommandRunFailureCode.NotFound }
  | { readonly code: typeof CommandRunFailureCode.Unavailable }
  | { readonly code: typeof CommandRunFailureCode.Failed; readonly error: AppError };
