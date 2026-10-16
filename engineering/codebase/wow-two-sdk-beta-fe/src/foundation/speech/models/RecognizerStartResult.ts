import type { Result } from '../../results';
import type { RecognizerStartFailure } from './RecognizerStartFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type RecognizerStartResult = Result<void, RecognizerStartFailure>;
