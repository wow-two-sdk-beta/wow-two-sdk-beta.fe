import type { ScreenFailureCode } from '../enums/ScreenFailureCode';

/** Expected reasons the operation could not produce its requested value. */
export type ScreenFailure =
  | { readonly status: typeof ScreenFailureCode.Unsupported }
  | { readonly status: typeof ScreenFailureCode.Denied; readonly error: Error }
  | { readonly status: typeof ScreenFailureCode.RequiresGesture; readonly error: Error }
  | { readonly status: typeof ScreenFailureCode.Failed; readonly error: Error };
