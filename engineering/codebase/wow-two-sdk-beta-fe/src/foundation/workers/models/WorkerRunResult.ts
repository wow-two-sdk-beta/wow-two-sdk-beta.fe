import type { Result } from '../../results';
import type { WorkerRunFailure } from './WorkerRunFailure';

export type WorkerRunResult<TValue> = Result<TValue, WorkerRunFailure>;
