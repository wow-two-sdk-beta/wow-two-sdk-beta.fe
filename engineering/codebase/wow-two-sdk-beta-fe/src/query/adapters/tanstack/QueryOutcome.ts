import { CancelledError } from '@tanstack/vue-query';
import { ApiError, ApiFailureFactory, type ApiFailure } from '../../../foundation/http';
import { isAbortError, isTimeoutError } from '../../../foundation/errors';
import { ResultExtensions, type Result } from '../../../foundation/results';

/** Unwraps only at the vendor boundary, where query failure requires rejection. */
export async function resolveQueryResult<T>(pending: Promise<Result<T, ApiFailure>>): Promise<T> {
  const outcome = await pending;
  if (!outcome.ok) throw new ApiError(outcome.failure);
  return outcome.value;
}

/** Returns safe display state; programmer exceptions are never mislabeled as network failures. */
export function toApiFailure(error: unknown): ApiFailure {
  if (error instanceof ApiError) return error.failure;
  if (isTimeoutError(error)) return ApiFailureFactory.create('timeout');
  if (error instanceof CancelledError || isAbortError(error)) return ApiFailureFactory.create('cancelled');
  return ApiFailureFactory.create('protocol');
}

/** Restores expected outcomes after a vendor command, preserving programmer-error rejection. */
export async function queryOutcome<T>(run: () => Promise<T>): Promise<Result<T, ApiFailure>> {
  try {
    return ResultExtensions.ok(await run());
  } catch (error) {
    if (error instanceof ApiError || error instanceof CancelledError || isAbortError(error) || isTimeoutError(error)) {
      return ResultExtensions.fail(toApiFailure(error));
    }
    throw error;
  }
}
