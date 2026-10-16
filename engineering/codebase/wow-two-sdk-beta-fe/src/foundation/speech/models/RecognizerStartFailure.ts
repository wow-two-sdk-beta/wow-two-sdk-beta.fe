import type { RecognizerStartFailureCode } from '../enums/RecognizerStartFailureCode';

/** Expected reasons the operation could not produce its requested value. */
export type RecognizerStartFailure =
  | { readonly status: typeof RecognizerStartFailureCode.Unsupported }
  | { readonly status: typeof RecognizerStartFailureCode.Failed; readonly error: Error };
