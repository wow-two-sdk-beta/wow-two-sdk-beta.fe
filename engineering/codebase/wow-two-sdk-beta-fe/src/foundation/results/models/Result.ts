import type { AppError } from './AppError';

/** Represents a completed operation's success or expected failure. */
export type Result<TSuccess = void, TFailure = AppError> =
  { readonly ok: true; readonly value: TSuccess } | { readonly ok: false; readonly failure: TFailure };
