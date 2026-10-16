import type { MediaStreamFailureCode } from '../MediaStreamFailureCode';

/** Expected reasons the operation could not produce its requested value. */
export type MediaStreamFailure =
  | { readonly status: typeof MediaStreamFailureCode.Cancelled }
  | { readonly status: typeof MediaStreamFailureCode.Denied }
  | { readonly status: typeof MediaStreamFailureCode.Unavailable }
  | { readonly status: typeof MediaStreamFailureCode.InUse }
  | { readonly status: typeof MediaStreamFailureCode.Unsupported }
  | { readonly status: typeof MediaStreamFailureCode.Failed; readonly error: Error };
