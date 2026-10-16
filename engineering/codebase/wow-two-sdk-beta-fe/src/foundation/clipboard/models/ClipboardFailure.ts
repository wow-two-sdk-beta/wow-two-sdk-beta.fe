import type { ClipboardFailureCode } from '../ClipboardFailureCode';

/** Expected reasons the operation could not produce its requested value. */
export type ClipboardFailure =
  | { readonly status: typeof ClipboardFailureCode.Denied; readonly error: Error }
  | { readonly status: typeof ClipboardFailureCode.Unsupported }
  | { readonly status: typeof ClipboardFailureCode.Failed; readonly error: Error };
