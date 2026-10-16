import type { Result } from '../../results';
import type { OrientationLockFailure } from './OrientationLockFailure';

export type OrientationLockResult = Result<void, OrientationLockFailure>;
