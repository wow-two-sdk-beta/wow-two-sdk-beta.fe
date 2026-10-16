import type { Result } from '../../results';
import type { ValidationFailure } from './ValidationFailure';

export type ValidatorParseResult<T> = Result<T, ValidationFailure>;
