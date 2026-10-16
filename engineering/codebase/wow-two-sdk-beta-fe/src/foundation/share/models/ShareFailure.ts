import type { ShareFailureCode } from '../ShareFailureCode';

/** Expected reasons the operation could not produce its requested value. */
export type ShareFailure =
  | { readonly status: typeof ShareFailureCode.Dismissed }
  | { readonly status: typeof ShareFailureCode.Unsupported }
  | { readonly status: typeof ShareFailureCode.Failed; readonly error: Error };
