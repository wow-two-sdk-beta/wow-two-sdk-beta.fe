import type { PositionFailureCode } from '../PositionFailureCode';

/** Expected reasons the operation could not produce its requested value. */
export type PositionFailure =
  | { readonly status: typeof PositionFailureCode.Denied }
  | { readonly status: typeof PositionFailureCode.Unavailable }
  | { readonly status: typeof PositionFailureCode.Timeout }
  | { readonly status: typeof PositionFailureCode.Unsupported }
  | { readonly status: typeof PositionFailureCode.Failed; readonly error: Error };
