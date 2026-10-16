import type { Result } from '../../results';
import type { CommandRunFailure } from './CommandRunFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type CommandRunResult = Result<void, CommandRunFailure>;
