import type { AppError } from '../../results';
import type { ValidationIssue } from '../ValidationOutcome';

/** Expected reasons the operation could not produce its requested value. */
export interface ValidationFailure extends AppError {
  readonly issues: ReadonlyArray<ValidationIssue>;
}
