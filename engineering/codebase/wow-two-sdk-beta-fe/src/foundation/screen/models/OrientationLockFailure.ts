import type { OrientationLockFailureCode } from '../enums/OrientationLockFailureCode';
import type { ScreenFailure } from '../ScreenOutcome';

/** Expected reasons the operation could not produce its requested value. */
export type OrientationLockFailure =
  ScreenFailure | { readonly status: typeof OrientationLockFailureCode.RequiresFullscreen; readonly error: Error };
