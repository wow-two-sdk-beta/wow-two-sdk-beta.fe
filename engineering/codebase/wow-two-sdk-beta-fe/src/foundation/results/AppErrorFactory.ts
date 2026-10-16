import { AppErrorType } from './AppErrorType';
import type { AppError } from './models/AppError';

/** Creates display-safe failures from the shared catalog. */
export const AppErrorFactory = {
  /** Creates a validation failure. */
  validation(): AppError {
    return { type: AppErrorType.Validation, message: 'The value is invalid.' };
  },
  /** Creates an unavailable failure. */
  unavailable(): AppError {
    return { type: AppErrorType.Unavailable, message: 'The operation is unavailable.' };
  },
  /** Creates an authentication failure. */
  unauthorized(): AppError {
    return { type: AppErrorType.Unauthorized, message: 'Sign in to continue.' };
  },
  /** Creates a permission failure. */
  forbidden(): AppError {
    return { type: AppErrorType.Forbidden, message: 'The operation is not permitted.' };
  },
  /** Creates a missing-resource failure. */
  notFound(): AppError {
    return { type: AppErrorType.NotFound, message: 'The requested item was not found.' };
  },
  /** Creates a conflicting-update failure. */
  conflict(): AppError {
    return { type: AppErrorType.Conflict, message: 'The operation conflicts with the current state.' };
  },
  /** Creates a cancellation outcome; no user notice is required. */
  cancelled(): AppError {
    return { type: AppErrorType.Cancelled, message: 'The operation was cancelled.' };
  },
  /** Creates a deadline failure. */
  timeout(): AppError {
    return { type: AppErrorType.Timeout, message: 'The operation timed out.' };
  },
  /** Creates an unexpected failure without exposing an exception message. */
  unexpected(): AppError {
    return { type: AppErrorType.Unexpected, message: 'The operation could not be completed.' };
  },
} as const;
