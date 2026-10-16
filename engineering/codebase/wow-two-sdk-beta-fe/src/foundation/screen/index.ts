export { type ScreenRequestResult, type ScreenFailure, type ScreenStatus } from './ScreenOutcome';

export {
  enterFullscreen,
  exitFullscreen,
  toggleFullscreen,
  isFullscreen,
  isFullscreenSupported,
  getFullscreenElement,
  onFullscreenChange,
} from './Fullscreen';
export { useFullscreen, type FullscreenControls } from './hooks/UseFullscreen';

export {
  requestWakeLock,
  holdWakeLock,
  WakeLockKind,
  IdleWakeLockState,
  type WakeLockHandle,
  type WakeLockHold,
  type WakeLockHoldOptions,
  type WakeLockState,
  type WakeLockStatus,
} from './WakeLock';
export { useWakeLock } from './hooks/UseWakeLock';

export {
  lockOrientation,
  unlockOrientation,
  getOrientation,
  getOrientationAngle,
  isOrientationLockSupported,
  onOrientationChange,
  ScreenOrientationType,
  ScreenOrientationLock,
  type OrientationLockFailure,
  type OrientationLockResult,
  type OrientationLockStatus,
} from './ScreenOrientation';
export { useOrientation, type OrientationControls } from './hooks/UseOrientation';

export { OrientationLockFailureCode } from './enums/OrientationLockFailureCode';

export { ScreenFailureCode } from './enums/ScreenFailureCode';
