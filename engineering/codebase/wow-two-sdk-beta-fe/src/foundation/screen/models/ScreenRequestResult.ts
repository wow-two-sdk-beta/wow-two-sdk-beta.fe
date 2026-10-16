import type { Result } from '../../results';
import type { ScreenFailure } from './ScreenFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type ScreenRequestResult<TValue = void> = Result<TValue, ScreenFailure>;
