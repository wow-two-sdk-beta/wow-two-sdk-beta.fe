import type { AppError } from '../results';
import type { ApiError } from './ApiError';
import { ProblemDetailsExtensions, type ProblemTextOptions } from './ProblemDetailsExtensions';

/** Defines how a failure's reason is read. */
export interface FailureReasonOptions extends ProblemTextOptions {
  /** The text used when the API sent no readable problem text. Default the failure's own display-safe message. */
  readonly fallback?: string;
}

/** Extends `ApiFailure` with the sentence a person reads. */
export const ApiFailureExtensions = {
  /**
   * Describes why a request failed: the API's own problem text ({@link ProblemDetailsExtensions.text}), else
   * `fallback`, else the failure's display-safe message. Takes an `ApiFailure`, an `ApiError` or any `AppError`;
   * nothing yields `fallback`, or `''`. Use it where the API authors its problem text for people, as the be sdk's
   * `AppError` messages are.
   * ```ts
   * const result = await reconcile(target);
   * if (!result.ok) toast.danger(ApiFailureExtensions.reason(result.failure, { fallback: 'Reconcile failed.' }));
   * ```
   */
  reason(failure: AppError | ApiError | null | undefined, options: FailureReasonOptions = {}): string {
    if (!failure) return options.fallback ?? '';
    return (
      ProblemDetailsExtensions.text(ProblemDetailsExtensions.of(failure), options) ??
      options.fallback ??
      failure.message
    );
  },
} as const;
