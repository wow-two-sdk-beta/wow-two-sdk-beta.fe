// The one place this slice throws — and it only does so because the caller asked.
//
// `assertValid` exists for the call sites where a failure is genuinely unrecoverable and there is no UI
// to show it in: parsing boot configuration, reading a build-time manifest, a test fixture. There, a
// result the caller must remember to check is worse than a throw — an unchecked `ValidatorParseResult` fails
// silently and the bad value flows on. Everywhere else (forms, API payloads, URL params) `validate()`
// stays total, because those failures are expected and belong on screen, not in a stack trace.
//
// The issues ride ON the error rather than only inside its message, so a boot-time failure can still be
// rendered field-by-field instead of forcing the reader to parse a formatted string.

import { formatIssuePath, type ValidationIssue } from './ValidationOutcome';
import type { Validator } from './Validator';

/** Builds the one-line summary an uncaught `ValidationError` shows in a console or crash log. */
function summarize(issues: ReadonlyArray<ValidationIssue>): string {
  const first = issues.at(0);
  if (!first) return 'Validation failed';

  const where = formatIssuePath(first.path);
  const head = where === '' ? first.message : `${where} — ${first.message}`;
  const rest = issues.length - 1;
  return rest > 0 ? `Validation failed: ${head} (+${rest} more)` : `Validation failed: ${head}`;
}

/** The error `assertValid` throws, carrying every issue found rather than only the summarized first. */
export class ValidationError extends Error {
  /** Every issue from the failed run, in traversal order, each with its own path. */
  readonly issues: ReadonlyArray<ValidationIssue>;

  /** Wraps the issues; `message` overrides the generated summary when a call site has better copy. */
  constructor(issues: ReadonlyArray<ValidationIssue>, message?: string) {
    super(message ?? summarize(issues));
    this.name = 'ValidationError';
    this.issues = issues;
    // Restores the prototype chain when this file is downleveled below ES2015, where extending a
    // built-in leaves `instanceof ValidationError` false. Harmless at the current ES2022 target.
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Validates `value` and returns the parsed output, throwing `ValidationError` if it fails. The typed
 * escape hatch for callers that want a throw — everything else in this slice stays total.
 */
export function assertValid<TOutput>(validator: Validator<TOutput>, value: unknown): TOutput {
  const result = validator.validate(value);
  if (result.ok) return result.value;
  throw new ValidationError(result.failure.issues);
}
