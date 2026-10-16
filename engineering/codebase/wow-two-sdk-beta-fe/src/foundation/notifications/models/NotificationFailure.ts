import type { NotificationFailureCode } from '../NotificationFailureCode';

/** Expected reasons the operation could not produce its requested value. */
export type NotificationFailure =
  | { readonly status: typeof NotificationFailureCode.Denied }
  | { readonly status: typeof NotificationFailureCode.Unsupported }
  | { readonly status: typeof NotificationFailureCode.Failed; readonly error: Error };
