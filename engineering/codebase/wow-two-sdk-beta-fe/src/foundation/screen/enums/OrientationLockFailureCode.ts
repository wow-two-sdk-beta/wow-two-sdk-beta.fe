import { ScreenFailureCode } from './ScreenFailureCode';

/** Closed failure vocabulary for OrientationLockFailure. */
export const OrientationLockFailureCode = {
  ...ScreenFailureCode,
  RequiresFullscreen: 'requires-fullscreen',
} as const;

export type OrientationLockFailureCode = (typeof OrientationLockFailureCode)[keyof typeof OrientationLockFailureCode];
