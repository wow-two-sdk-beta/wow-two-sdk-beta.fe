import type { SpeechFailureCode } from '../enums/SpeechFailureCode';

/** Expected reasons the operation could not produce its requested value. */
export type SpeechFailure =
  | { readonly status: typeof SpeechFailureCode.Cancelled }
  | { readonly status: typeof SpeechFailureCode.Unsupported }
  | { readonly status: typeof SpeechFailureCode.Failed; readonly error: Error };
